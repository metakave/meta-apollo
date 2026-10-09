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
const WHATSAPP_TEXT_REGEX = /(?:whatsapp|wa\.me|wa|chat on whatsapp)[\s:–—]*(\+?[0-9][0-9\s().-]{7,18}[0-9])/gi;

function extractWhatsAppFromLink(link) {
  if (!link) return null;
  // wa.me/1234567890 or wa.me/+1234567890
  const waMeMatch = link.match(/wa\.me\/(?:\+?)([0-9]{7,16})/i);
  if (waMeMatch) return '+' + waMeMatch[1].replace(/\D/g, '');

  // api.whatsapp.com/send?phone=... or web.whatsapp.com
  const waApiMatch = link.match(/whatsapp\.com\/send\?(?:[^&]*&)*phone=(?:\+?)([0-9]{7,16})/i);
  if (waApiMatch) return '+' + waApiMatch[1].replace(/\D/g, '');

  const waSchemeMatch = link.match(/whatsapp:\/\/send\?(?:[^&]*&)*phone=(?:\+?)([0-9]{7,16})/i);
  if (waSchemeMatch) return '+' + waSchemeMatch[1].replace(/\D/g, '');

  return null;
}

function normalizePhoneDigits(phoneStr) {
  if (!phoneStr) return '';
  const digits = phoneStr.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 16) return '';
  return phoneStr.startsWith('+') ? '+' + digits : (digits.length >= 10 ? '+' + digits : digits);
}

export const companyScraper = {
  /**
   * Scrapes a company domain for company information, contacts, WhatsApp, LinkedIn, socials, and team subpages
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
      whatsapps: new Set(),
      personalLinkedIns: new Set(),
      socials: {
        linkedin: '',
        twitter: '',
        github: '',
        facebook: ''
      },
      teamPages: [],
      contactPages: [],
      techStack: []
    };

    const processHtml = (html, pageUrl) => {
      const $ = cheerio.load(html);

      // Detect Tech Stack
      if (html.includes('wp-content')) companyData.techStack.push('WordPress');
      if (html.includes('Shopify') || html.includes('cdn.shopify.com')) companyData.techStack.push('Shopify');
      if (html.includes('__NEXT_DATA__') || html.includes('_next/static')) companyData.techStack.push('Next.js');
      if (html.includes('react') || html.includes('React')) companyData.techStack.push('React');
      if (html.includes('stripe.com')) companyData.techStack.push('Stripe');
      if (html.includes('hubspot') || html.includes('hs-scripts')) companyData.techStack.push('HubSpot');
      if (html.includes('intercom') || html.includes('Intercom')) companyData.techStack.push('Intercom');

      // Title and Name
      const ogSiteName = $('meta[property="og:site_name"]').attr('content');
      const pageTitle = $('title').text().trim();
      const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
      
      if (!companyData.description && metaDesc) {
        companyData.description = metaDesc.trim();
      }

      if (!companyData.name) {
        if (ogSiteName) {
          companyData.name = ogSiteName.trim();
        } else if (pageTitle) {
          const cleanName = pageTitle.split(/[|\-–—:]/)[0].trim();
          companyData.name = cleanName || domain;
        } else {
          companyData.name = domain.split('.')[0].toUpperCase();
        }
      }

      // 1. Direct WhatsApp links (wa.me, api.whatsapp.com, etc.)
      $('a[href*="wa.me"], a[href*="whatsapp.com"], a[href^="whatsapp:"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const waNum = extractWhatsAppFromLink(href);
        if (waNum) {
          companyData.whatsapps.add(waNum);
          companyData.phones.add(waNum);
        }
      });

      // WhatsApp floating widgets or data attributes
      $('[data-phone], [data-whatsapp], [data-wa]').each((_, el) => {
        const val = $(el).attr('data-phone') || $(el).attr('data-whatsapp') || $(el).attr('data-wa');
        if (val) {
          const norm = normalizePhoneDigits(val);
          if (norm) {
            companyData.whatsapps.add(norm);
            companyData.phones.add(norm);
          }
        }
      });

      // 2. Emails from mailto
      $('a[href^="mailto:"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const mail = href.replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase();
        if (mail && !mail.includes('example.com') && !mail.includes('domain.com')) {
          companyData.emails.add(mail);
        }
      });

      // 3. Phones from tel:
      $('a[href^="tel:"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const phone = href.replace(/^tel:/i, '').trim();
        if (phone && phone.length >= 7) {
          companyData.phones.add(phone);
          // If the element also mentions WhatsApp
          const linkText = $(el).text().toLowerCase();
          if (linkText.includes('whatsapp') || linkText.includes('wa')) {
            const norm = normalizePhoneDigits(phone);
            if (norm) companyData.whatsapps.add(norm);
          }
        }
      });

      // 4. Search body for emails, phones & WhatsApp text
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
      regexPhones.slice(0, 4).forEach(p => {
        if (p.trim().length >= 8) companyData.phones.add(p.trim());
      });

      // Scan text for WhatsApp specifically
      let waMatch;
      while ((waMatch = WHATSAPP_TEXT_REGEX.exec(bodyText)) !== null) {
        if (waMatch[1]) {
          const norm = normalizePhoneDigits(waMatch[1]);
          if (norm) {
            companyData.whatsapps.add(norm);
            companyData.phones.add(norm);
          }
        }
      }

      // 5. Social links & personal LinkedIn profile links
      $('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const hrefLower = href.toLowerCase();

        // Company LinkedIn
        if (href.includes('linkedin.com/company/') && !companyData.socials.linkedin) {
          companyData.socials.linkedin = href.split('?')[0];
        }
        // Personal LinkedIn profile (/in/)
        if (href.includes('linkedin.com/in/')) {
          const cleanLi = href.split('?')[0].trim();
          if (cleanLi.length > 22) {
            companyData.personalLinkedIns.add(cleanLi);
          }
        }

        if ((href.includes('twitter.com/') || href.includes('x.com/')) && !companyData.socials.twitter && !href.includes('/intent/')) {
          companyData.socials.twitter = href.split('?')[0];
        } else if (href.includes('github.com/') && !companyData.socials.github && !href.includes('/pricing')) {
          companyData.socials.github = href.split('?')[0];
        }

        // Subpages: /team, /about, /contact
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

        if (
          hrefLower.includes('/contact') || 
          hrefLower.includes('/contact-us') || 
          hrefLower.includes('/get-in-touch') || 
          hrefLower.includes('/support')
        ) {
          try {
            const absoluteUrl = new URL(href, url).href;
            if (absoluteUrl.startsWith(url) && !companyData.contactPages.includes(absoluteUrl)) {
              companyData.contactPages.push(absoluteUrl);
            }
          } catch {}
        }
      });
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

      processHtml(res.data, url);

      // Also crawl the primary Contact page if found (to extract WhatsApp & direct phone numbers)
      if (companyData.contactPages.length > 0) {
        const contactUrl = companyData.contactPages[0];
        try {
          const contactRes = await axios.get(contactUrl, {
            headers: { 'User-Agent': getRandomUserAgent() },
            timeout: 6000
          });
          processHtml(contactRes.data, contactUrl);
        } catch {
          // silently continue
        }
      }

      const whatsappsArr = Array.from(companyData.whatsapps);
      const phonesArr = Array.from(companyData.phones);

      // If no explicit WhatsApp link was found but a phone number was detected,
      // create a ready WhatsApp candidate if it looks like a mobile/direct line
      let primaryWhatsapp = whatsappsArr[0] || '';
      if (!primaryWhatsapp && phonesArr.length > 0) {
        const cleanNorm = normalizePhoneDigits(phonesArr[0]);
        if (cleanNorm && cleanNorm.length >= 10) {
          primaryWhatsapp = cleanNorm;
        }
      }

      return {
        ...companyData,
        techStack: [...new Set(companyData.techStack)],
        emails: Array.from(companyData.emails),
        phones: phonesArr,
        whatsapps: whatsappsArr,
        primaryWhatsapp,
        personalLinkedIns: Array.from(companyData.personalLinkedIns)
      };
    } catch (err) {
      const phonesArr = Array.from(companyData.phones);
      return {
        ...companyData,
        name: companyData.name || domain.split('.')[0].toUpperCase(),
        techStack: [...new Set(companyData.techStack)],
        emails: Array.from(companyData.emails),
        phones: phonesArr,
        whatsapps: Array.from(companyData.whatsapps),
        primaryWhatsapp: companyData.whatsapps.values().next().value || '',
        personalLinkedIns: Array.from(companyData.personalLinkedIns),
        error: err.message
      };
    }
  }
};

export default companyScraper;
