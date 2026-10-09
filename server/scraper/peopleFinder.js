import axios from 'axios';
import * as cheerio from 'cheerio';

const TITLE_KEYWORDS = [
  'ceo', 'founder', 'co-founder', 'cto', 'coo', 'cmo', 'cpo', 'cro',
  'president', 'partner', 'director', 'vp', 'vice president',
  'head of sales', 'head of marketing', 'head of product', 'head of engineering', 'head of growth',
  'managing director', 'general manager'
];

function extractWhatsAppFromCard($, el) {
  let wa = '';
  // Check links inside card
  $(el).find('a[href*="wa.me"], a[href*="whatsapp.com"], a[href^="whatsapp:"]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const match = href.match(/(?:wa\.me\/(?:\+?)|phone=(?:\+?))([0-9]{7,16})/i);
    if (match && !wa) {
      wa = '+' + match[1].replace(/\D/g, '');
    }
  });

  if (!wa) {
    // Check tel link
    $(el).find('a[href^="tel:"]').each((_, a) => {
      const href = $(a).attr('href') || '';
      const text = $(a).text() + ' ' + $(el).text();
      if (text.toLowerCase().includes('whatsapp') || text.toLowerCase().includes('wa')) {
        const raw = href.replace(/^tel:/i, '').replace(/\D/g, '');
        if (raw.length >= 8 && !wa) wa = '+' + raw;
      }
    });
  }

  return wa;
}

function findMatchingLinkedIn(firstName, lastName, knownPersonalLinkedIns = []) {
  if (!firstName || !lastName || !knownPersonalLinkedIns.length) return '';
  const fn = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const ln = lastName.toLowerCase().replace(/[^a-z]/g, '');

  for (const url of knownPersonalLinkedIns) {
    const slug = url.toLowerCase().split('/in/')[1] || '';
    const cleanSlug = slug.replace(/[^a-z0-9]/g, '');
    if ((cleanSlug.includes(fn) && cleanSlug.includes(ln)) || cleanSlug.includes(`${fn}${ln}`) || cleanSlug.includes(`${ln}${fn}`)) {
      return url;
    }
  }
  return '';
}

export const peopleFinder = {
  /**
   * Scrapes team and about pages of a company to discover leadership decision makers,
   * personal LinkedIn profiles, and personal WhatsApp/phone contacts.
   */
  async findPeopleFromTeamPages(teamUrls, companyDomain, companyName = '', targetTitles = [], knownPersonalLinkedIns = []) {
    const people = [];
    const seenNames = new Set();

    // Check at most 4 team pages
    const urlsToScan = teamUrls.slice(0, 4);

    for (const pageUrl of urlsToScan) {
      try {
        const res = await axios.get(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
          },
          timeout: 8000
        });

        const $ = cheerio.load(res.data);

        // Search common team card containers
        const containers = $('.team-member, .member, .card, [class*="team"], [class*="leadership"], [class*="member"], [class*="bio"], article, .person');
        
        containers.each((_, el) => {
          const cardText = $(el).text().replace(/\s+/g, ' ').trim();

          // Find role / title
          let matchedTitle = '';
          const lowerText = cardText.toLowerCase();

          for (const titleKw of TITLE_KEYWORDS) {
            const regex = new RegExp(`\\b${titleKw}\\b`, 'i');
            if (regex.test(lowerText)) {
              matchedTitle = titleKw.toUpperCase();
              break;
            }
          }

          if (matchedTitle) {
            // Find person name (usually in h2, h3, h4, h5, strong inside card)
            let name = $(el).find('h2, h3, h4, h5, strong, .name, [class*="name"]').first().text().trim();
            
            // Clean name
            if (name && name.length > 2 && name.length < 50 && !name.toLowerCase().includes('team') && !name.toLowerCase().includes('about')) {
              const cleanName = name.replace(/[^a-zA-Z\s.-]/g, '').trim();
              const parts = cleanName.split(/\s+/);

              if (parts.length >= 2 && !seenNames.has(cleanName.toLowerCase())) {
                seenNames.add(cleanName.toLowerCase());

                // 1. Direct personal LinkedIn inside card
                let linkedin = '';
                $(el).find('a[href*="linkedin.com"]').each((_, a) => {
                  const href = $(a).attr('href') || '';
                  if (href.includes('/in/')) linkedin = href.split('?')[0].trim();
                });

                // 2. If not inside card, match against website's discovered personal LinkedIn profiles
                if (!linkedin && knownPersonalLinkedIns.length > 0) {
                  linkedin = findMatchingLinkedIn(parts[0], parts.slice(1).join(' '), knownPersonalLinkedIns);
                }

                // 3. If still no direct LinkedIn profile found, generate 1-click LinkedIn Search link
                if (!linkedin) {
                  const searchTerms = encodeURIComponent(`${cleanName} ${companyName || companyDomain}`);
                  linkedin = `https://www.linkedin.com/search/results/people/?keywords=${searchTerms}`;
                }

                // 4. Personal WhatsApp inside card
                const whatsapp = extractWhatsAppFromCard($, el);

                // 5. Personal Phone inside card
                let phone = '';
                $(el).find('a[href^="tel:"]').each((_, a) => {
                  const href = $(a).attr('href') || '';
                  const p = href.replace(/^tel:/i, '').trim();
                  if (p.length >= 7 && !phone) phone = p;
                });

                people.push({
                  fullName: cleanName,
                  firstName: parts[0],
                  lastName: parts.slice(1).join(' '),
                  jobTitle: matchedTitle,
                  linkedinUrl: linkedin,
                  whatsapp,
                  phone,
                  source: 'Company Team Page'
                });
              }
            }
          }
        });

        if (people.length >= 8) break;
      } catch (err) {
        // Silently continue to next subpage
      }
    }

    return people;
  },

  /**
   * Parse person details from LinkedIn public title strings
   * Example: "Jane Doe - Chief Executive Officer - Acme | LinkedIn"
   */
  parseLinkedInTitle(titleStr, companyName = '') {
    if (!titleStr) return null;

    let clean = titleStr.replace(/\s*\|\s*LinkedIn$/i, '').replace(/\s*-\s*LinkedIn$/i, '').trim();
    const parts = clean.split(/\s*[-–—|]\s*/);

    if (parts.length >= 2) {
      const rawName = parts[0].trim();
      const rawTitle = parts[1].trim();

      const nameWords = rawName.split(/\s+/);
      if (nameWords.length >= 2 && nameWords.length <= 4) {
        const cleanName = rawName;
        const searchTerms = encodeURIComponent(`${cleanName} ${companyName}`);
        return {
          fullName: cleanName,
          firstName: nameWords[0],
          lastName: nameWords.slice(1).join(' '),
          jobTitle: rawTitle || 'Decision Maker',
          linkedinUrl: `https://www.linkedin.com/search/results/people/?keywords=${searchTerms}`,
          source: 'Public Web Search'
        };
      }
    }

    return null;
  }
};

export default peopleFinder;
