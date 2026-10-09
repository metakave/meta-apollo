import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import database from './db/database.js';
import pipeline, { jobEvents } from './scraper/pipeline.js';
import verifier from './scraper/verifier.js';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Apollo Light Engine', timestamp: new Date().toISOString() });
});

// Stats
app.get('/api/stats', (req, res) => {
  try {
    const stats = database.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leads list with filters
app.get('/api/leads', (req, res) => {
  try {
    const { search, industry, location, email_status, has_whatsapp, has_linkedin, job_id, page, limit } = req.query;
    const result = database.getLeads({
      search,
      industry,
      location,
      email_status,
      has_whatsapp,
      has_linkedin,
      job_id,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add manual lead
app.post('/api/leads', async (req, res) => {
  try {
    const { full_name, job_title, company_name, company_domain, email, phone, whatsapp, linkedin_url, location, industry } = req.body;
    if (!full_name || !company_name) {
      return res.status(400).json({ error: 'Full name and company name are required' });
    }

    const domain = company_domain || (email ? email.split('@')[1] : '');
    let emailStatus = 'unverified';
    let mxRecord = '';

    if (email) {
      const v = await verifier.verifyEmail(email, domain);
      emailStatus = v.status;
      mxRecord = v.mxRecord || '';
    }

    const parts = full_name.trim().split(/\s+/);
    const lead = database.insertLead({
      id: crypto.randomUUID(),
      full_name,
      first_name: parts[0] || '',
      last_name: parts.slice(1).join(' ') || '',
      job_title: job_title || 'Executive',
      company_name,
      company_domain: domain,
      company_website: domain ? `https://${domain}` : '',
      location: location || '',
      industry: industry || '',
      email: email || '',
      email_status: emailStatus,
      email_mx_record: mxRecord,
      phone: phone || '',
      whatsapp: whatsapp || '',
      linkedin_url: linkedin_url || '',
      company_linkedin: '',
      source: 'Manual Entry'
    });

    res.status(201).json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete lead
app.delete('/api/leads/:id', (req, res) => {
  try {
    database.deleteLead(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Re-verify lead
app.post('/api/leads/verify/:id', async (req, res) => {
  try {
    const lead = database.getLead(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    if (!lead.email) {
      return res.status(400).json({ error: 'Lead has no email to verify' });
    }

    const vResult = await verifier.verifyEmail(lead.email, lead.company_domain);
    const updated = database.insertLead({
      ...lead,
      email_status: vResult.status,
      email_mx_record: vResult.mxRecord || lead.email_mx_record
    });

    res.json({ lead: updated, verification: vResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Jobs list
app.get('/api/jobs', (req, res) => {
  try {
    const jobs = database.getAllJobs();
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single job details
app.get('/api/jobs/:id', (req, res) => {
  try {
    const job = database.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Scraping Job
app.post('/api/scrape', (req, res) => {
  try {
    const { target_industry, location, job_titles, keywords, company_size, max_leads } = req.body;

    if (!target_industry && !keywords) {
      return res.status(400).json({ error: 'Target industry or keywords/domains must be provided.' });
    }

    const jobId = crypto.randomUUID();
    const job = database.createJob({
      id: jobId,
      target_industry: target_industry || 'Technology',
      location: location || '',
      job_titles: job_titles || 'CEO, Founder, Director',
      keywords: keywords || '',
      company_size: company_size || '11-50',
      max_leads: max_leads ? parseInt(max_leads) : 15,
      status: 'pending',
      progress: 0,
      logs: []
    });

    // Start background asynchronous job execution
    setTimeout(() => {
      pipeline.runJob(jobId);
    }, 50);

    res.status(202).json({
      message: 'Scraping job queued successfully',
      job
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Server-Sent Events (SSE) for live job logs & progress
app.get('/api/jobs/:id/events', (req, res) => {
  const jobId = req.params.id;
  const job = database.getJob(jobId);

  if (!job) {
    return res.status(404).send('Job not found');
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send current state
  res.write(`data: ${JSON.stringify({ type: 'init', job })}\n\n`);

  const eventHandler = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (data.type === 'complete' || data.type === 'error') {
      res.end();
    }
  };

  jobEvents.on(`job:${jobId}`, eventHandler);

  req.on('close', () => {
    jobEvents.off(`job:${jobId}`, eventHandler);
  });
});

// Export Leads to CSV or JSON
app.get('/api/export', (req, res) => {
  try {
    const { search, industry, location, email_status, job_id, format = 'csv' } = req.query;
    const leads = database.getAllLeadsForExport({ search, industry, location, email_status, job_id });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="apollo_leads_${Date.now()}.json"`);
      return res.send(JSON.stringify(leads, null, 2));
    }

    // CSV format compatible with Instantly, Lemlist, Smartlead, HubSpot
    const headers = [
      'First Name', 'Last Name', 'Full Name', 'Job Title', 'Company Name', 
      'Company Domain', 'Website', 'Email', 'Email Status', 'MX Provider', 
      'Phone', 'WhatsApp Number', 'WhatsApp Chat Link', 'Location', 'Industry', 
      'LinkedIn Profile', 'Company LinkedIn', 'Source'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = leads.map(l => {
      const waNumber = l.whatsapp || (l.phone && l.phone.startsWith('+') ? l.phone : '');
      const waDigits = waNumber ? waNumber.replace(/\D/g, '') : '';
      const waLink = waDigits ? `https://wa.me/${waDigits}` : '';

      return [
        escapeCsv(l.first_name),
        escapeCsv(l.last_name),
        escapeCsv(l.full_name),
        escapeCsv(l.job_title),
        escapeCsv(l.company_name),
        escapeCsv(l.company_domain),
        escapeCsv(l.company_website),
        escapeCsv(l.email),
        escapeCsv(l.email_status),
        escapeCsv(l.email_mx_record),
        escapeCsv(l.phone),
        escapeCsv(waNumber),
        escapeCsv(waLink),
        escapeCsv(l.location),
        escapeCsv(l.industry),
        escapeCsv(l.linkedin_url),
        escapeCsv(l.company_linkedin),
        escapeCsv(l.source)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="apollo_leads_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend build if present
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../client/dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Apollo Light API Server running at http://localhost:${PORT}`);
});

