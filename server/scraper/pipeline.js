import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';
import database from '../db/database.js';
import searchEngine from './searchEngine.js';
import companyScraper from './companyScraper.js';
import peopleFinder from './peopleFinder.js';
import verifier from './verifier.js';

export const jobEvents = new EventEmitter();

export const pipeline = {
  async runJob(jobId) {
    const job = database.getJob(jobId);
    if (!job) return;

    const log = (msg, level = 'info') => {
      database.appendJobLog(jobId, msg, level);
      jobEvents.emit(`job:${jobId}`, {
        type: 'log',
        jobId,
        message: msg,
        level,
        timestamp: new Date().toISOString()
      });
    };

    const updateProgress = (progress, leadsCount) => {
      database.updateJob(jobId, { progress, leads_count: leadsCount });
      jobEvents.emit(`job:${jobId}`, {
        type: 'progress',
        jobId,
        progress,
        leadsCount
      });
    };

    try {
      database.updateJob(jobId, { status: 'running', progress: 5 });
      log(`Starting scraping job for industry: "${job.target_industry}" in "${job.location || 'Global'}"`);

      // Parse target job titles
      const targetTitlesList = (job.job_titles || 'CEO, Founder, Director')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      // 1. Company Discovery
      log(`Searching for matching companies...`);
      let candidateCompanies = [];

      // Check if keywords contain specific domains (e.g. domain:stripe.com or user typed domains)
      if (job.keywords && (job.keywords.includes('.com') || job.keywords.includes('.io') || job.keywords.includes('.org') || job.keywords.includes('.co'))) {
        const domainMatches = job.keywords.match(/[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/g) || [];
        for (const dom of domainMatches) {
          candidateCompanies.push({
            domain: dom,
            website: `https://${dom}`,
            name: dom.split('.')[0].toUpperCase(),
            location: job.location || '',
            source: 'Direct Target Domain'
          });
        }
      }

      // If no direct domains, use discovery engine
      if (candidateCompanies.length === 0) {
        candidateCompanies = await searchEngine.findCompanies({
          industry: job.target_industry,
          location: job.location,
          keywords: job.keywords,
          maxCompanies: Math.min(25, Math.ceil(job.max_leads / 1.5) + 5)
        });
      }

      log(`Discovered ${candidateCompanies.length} candidate companies for intelligence enrichment.`);
      updateProgress(20, 0);

      if (candidateCompanies.length === 0) {
        log(`No matching company domains found with current filters. Try broader keywords or locations.`, 'warning');
        database.updateJob(jobId, { status: 'completed', progress: 100 });
        jobEvents.emit(`job:${jobId}`, { type: 'complete', jobId, leadsCount: 0 });
        return;
      }

      let totalLeadsCreated = 0;
      const totalSteps = candidateCompanies.length;

      for (let i = 0; i < candidateCompanies.length; i++) {
        const comp = candidateCompanies[i];
        const stepProgress = Math.min(95, Math.round(20 + ((i + 1) / totalSteps) * 75));
        
        log(`[${i + 1}/${totalSteps}] Crawling and analyzing ${comp.domain || comp.website}...`);

        // Scrape company website
        const companyDetails = await companyScraper.scrapeCompany(comp.website || comp.domain);
        const companyName = companyDetails.name || comp.name || comp.domain;
        const domain = companyDetails.domain || comp.domain;

        log(`Identified company: ${companyName} (${domain}) | Tech Stack: [${companyDetails.techStack.join(', ') || 'Standard'}]`);

        // Check Domain MX record once per company
        const mxCheck = await verifier.checkMX(domain);
        const mailProvider = mxCheck.valid ? mxCheck.provider : 'No MX';
        if (mxCheck.valid) {
          log(`Mail Server: ${mailProvider} (${mxCheck.mxRecord})`);
        }

        // Try extracting decision-makers from team pages
        let teamPeople = [];
        if (companyDetails.teamPages.length > 0) {
          log(`Scanning ${companyDetails.teamPages.length} team & leadership pages...`);
          teamPeople = await peopleFinder.findPeopleFromTeamPages(companyDetails.teamPages, domain, targetTitlesList);
          if (teamPeople.length > 0) {
            log(`Found ${teamPeople.length} key leaders on website: ${teamPeople.map(p => `${p.fullName} (${p.jobTitle})`).join(', ')}`);
          }
        }

        // If team members found, create verified leads for each
        if (teamPeople.length > 0) {
          for (const person of teamPeople) {
            if (totalLeadsCreated >= job.max_leads) break;

            const candidates = verifier.generateEmailCandidates(person.firstName, person.lastName, domain);
            const primaryEmail = candidates.length > 0 ? candidates[0].email : (companyDetails.emails[0] || `contact@${domain}`);
            
            const verifyResult = await verifier.verifyEmail(primaryEmail, domain);

            const leadId = crypto.randomUUID();
            database.insertLead({
              id: leadId,
              job_id: jobId,
              full_name: person.fullName,
              first_name: person.firstName,
              last_name: person.lastName,
              job_title: person.jobTitle || targetTitlesList[0] || 'Executive',
              company_name: companyName,
              company_domain: domain,
              company_website: companyDetails.website,
              company_size: job.company_size || '11-50',
              industry: job.target_industry,
              location: companyDetails.location || comp.location || job.location,
              email: primaryEmail,
              email_status: verifyResult.status,
              email_mx_record: verifyResult.mxRecord || mxCheck.mxRecord || '',
              phone: companyDetails.phones[0] || '',
              linkedin_url: person.linkedinUrl || companyDetails.socials.linkedin || '',
              twitter_url: companyDetails.socials.twitter || comp.twitter || '',
              source: person.source || 'Apollo Light Crawler'
            });

            totalLeadsCreated++;
            log(`+ Lead Created: ${person.fullName} - ${person.jobTitle} at ${companyName} (${primaryEmail} - ${verifyResult.status})`, 'success');
          }
        } else {
          // If no individual person named on team page, synthesize executive contact with verified company email / direct email
          if (totalLeadsCreated < job.max_leads) {
            const preferredTitle = targetTitlesList[0] || 'Managing Director';
            const companyEmail = companyDetails.emails[0] || comp.publicEmail || `contact@${domain}`;
            const verifyResult = await verifier.verifyEmail(companyEmail, domain);

            const leadId = crypto.randomUUID();
            database.insertLead({
              id: leadId,
              job_id: jobId,
              full_name: `${companyName} Leadership`,
              first_name: companyName,
              last_name: 'Team',
              job_title: preferredTitle,
              company_name: companyName,
              company_domain: domain,
              company_website: companyDetails.website,
              company_size: job.company_size || '1-10',
              industry: job.target_industry,
              location: companyDetails.location || comp.location || job.location,
              email: companyEmail,
              email_status: verifyResult.status,
              email_mx_record: verifyResult.mxRecord || mxCheck.mxRecord || '',
              phone: companyDetails.phones[0] || '',
              linkedin_url: companyDetails.socials.linkedin || '',
              twitter_url: companyDetails.socials.twitter || comp.twitter || '',
              source: comp.source || 'Apollo Web Discovery'
            });

            totalLeadsCreated++;
            log(`+ Lead Created: ${companyName} Leadership (${companyEmail} - ${verifyResult.status})`, 'success');
          }
        }

        updateProgress(stepProgress, totalLeadsCreated);

        if (totalLeadsCreated >= job.max_leads) {
          log(`Target lead limit (${job.max_leads}) reached!`);
          break;
        }

        // Brief delay between company crawls
        await new Promise(r => setTimeout(r, 400));
      }

      database.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        leads_count: totalLeadsCreated
      });

      log(`Scraping job completed successfully! Total leads generated: ${totalLeadsCreated}`, 'success');
      jobEvents.emit(`job:${jobId}`, {
        type: 'complete',
        jobId,
        leadsCount: totalLeadsCreated
      });

    } catch (err) {
      database.updateJob(jobId, {
        status: 'failed',
        error_message: err.message
      });
      log(`Job failed with error: ${err.message}`, 'error');
      jobEvents.emit(`job:${jobId}`, {
        type: 'error',
        jobId,
        error: err.message
      });
    }
  }
};

export default pipeline;
