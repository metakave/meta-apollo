import axios from 'axios';
import * as cheerio from 'cheerio';

const COMMON_USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
  return COMMON_USER_AGENTS[Math.floor(Math.random() * COMMON_USER_AGENTS.length)];
}

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

export const companyScraper = {
  /**
   * Scrapes a company domain for company information, contacts, socials, and team subpages
   */
  async scrapeCompany(domainOrUrl) {
    let url = domainOrUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    let domain = '';
    try {
      const parsed = new URL(url);
      domain = parsed.hostname.replace(/^www\./, '');
    } catch {
      domain = domainOrUrl.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    }

    const companyData = {
      domain,
      website: url,
      name: '',
      description: '',
      location: '',
      size: '',
      emails: new Set(),
      phones: new Set(),
      socials: {
        linkedin: '',
        twitter: '',
        github: '',
        facebook: ''
      },
      teamPages: [],
      techStack: []
    };

    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 10000,
        maxRedirects: 5
      });

      const $ = cheerio.load(res.data);
      const rawHtml = res.data;

      // Detect Tech Stack
      if (rawHtml.includes('wp-content')) companyData.techStack.push('WordPress');
      if (rawHtml.includes('Shopify') || rawHtml.includes('cdn.shopify.com')) companyData.techStack.push('Shopify');
      if (rawHtml.includes('__NEXT_DATA__') || rawHtml.includes('_next/static')) companyData.techStack.push('Next.js');
      if (rawHtml.includes('react') || rawHtml.includes('React')) companyData.techStack.push('React');
      if (rawHtml.includes('stripe.com')) companyData.techStack.push('Stripe');
      if (rawHtml.includes('hubspot') || rawHtml.includes('hs-scripts')) companyData.techStack.push('HubSpot');
      if (rawHtml.includes('intercom') || rawHtml.includes('Intercom')) companyData.techStack.push('Intercom');

      // Title and Name
      const ogSiteName = $('meta[property="og:site_name"]').attr('content');
      const pageTitle = $('title').text().trim();
      const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
      
      companyData.description = metaDesc.trim();

      if (ogSiteName) {
        companyData.name = ogSiteName.trim();
      } else if (pageTitle) {
        // Clean title: e.g. "Acme Corp | Modern Cloud Storage" -> "Acme Corp"
        const cleanName = pageTitle.split(/[|\-–—:]/)[0].trim();
        companyData.name = cleanName || domain;
      } else {
        companyData.name = domain.split('.')[0].toUpperCase();
      }

      // Emails from mailto
      $('a[href^="mailto:"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const mail = href.replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase();
        if (mail && !mail.includes('example.com') && !mail.includes('domain.com')) {
          companyData.emails.add(mail);
        }
      });

      // Phones from tel
      $('a[href^="tel:"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const phone = href.replace(/^tel:/i, '').trim();
        if (phone && phone.length >= 7) {
          companyData.phones.add(phone);
        }
      });

      // Search body for emails & phones
      const bodyText = $('body').text();
      const regexEmails = bodyText.match(EMAIL_REGEX) || [];
      const IGNORED_EMAIL_DOMAINS = ['sentry.io', 'ingest.sentry.io', 'segment.com', 'intercom.io', 'w3.org', 'example.com', 'schema.org', 'cloudflare.com'];
      regexEmails.forEach(e => {
        const clean = e.toLowerCase().trim();
        const dom = clean.split('@')[1] || '';
        const isIgnored = IGNORED_EMAIL_DOMAINS.some(d => dom.includes(d));
        if (!isIgnored && !clean.endsWith('.png') && !clean.endsWith('.jpg') && !clean.endsWith('.jpeg')) {
          companyData.emails.add(clean);
        }
      });

      const regexPhones = bodyText.match(PHONE_REGEX) || [];
      regexPhones.slice(0, 3).forEach(p => {
        if (p.trim().length >= 8) companyData.phones.add(p.trim());
      });

      // Social links & Team subpage links
      $('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const hrefLower = href.toLowerCase();

        if (href.includes('linkedin.com/company/') && !companyData.socials.linkedin) {
          companyData.socials.linkedin = href;
        } else if ((href.includes('twitter.com/') || href.includes('x.com/')) && !companyData.socials.twitter && !href.includes('/intent/')) {
          companyData.socials.twitter = href;
        } else if (href.includes('github.com/') && !companyData.socials.github && !href.includes('/pricing')) {
          companyData.socials.github = href;
        }

        // Subpages like /about, /team, /our-team, /leadership, /contact
        if (
          hrefLower.includes('/team') || 
          hrefLower.includes('/our-team') || 
          hrefLower.includes('/leadership') || 
          hrefLower.includes('/about') || 
          hrefLower.includes('/people') ||
          hrefLower.includes('/management')
        ) {
          try {
            const absoluteUrl = new URL(href, url).href;
            if (absoluteUrl.startsWith(url) && !companyData.teamPages.includes(absoluteUrl)) {
              companyData.teamPages.push(absoluteUrl);
            }
          } catch {}
        }
      });

      return {
        ...companyData,
        emails: Array.from(companyData.emails),
        phones: Array.from(companyData.phones)
      };
    } catch (err) {
      return {
        ...companyData,
        name: companyData.name || domain.split('.')[0].toUpperCase(),
        emails: Array.from(companyData.emails),
        phones: Array.from(companyData.phones),
        error: err.message
      };
    }
  }
};

export default companyScraper;
