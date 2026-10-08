import axios from 'axios';
import * as cheerio from 'cheerio';

const TITLE_KEYWORDS = [
  'ceo', 'founder', 'co-founder', 'cto', 'coo', 'cmo', 'cpo', 'cro',
  'president', 'partner', 'director', 'vp', 'vice president',
  'head of sales', 'head of marketing', 'head of product', 'head of engineering',
  'managing director', 'general manager'
];

export const peopleFinder = {
  /**
   * Scrapes team and about pages of a company to discover leadership decision makers
   */
  async findPeopleFromTeamPages(teamUrls, companyDomain, targetTitles = []) {
    const people = [];
    const seenNames = new Set();

    // Check at most 3 team pages to stay fast
    const urlsToScan = teamUrls.slice(0, 3);

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
          const cardHtml = $(el).html() || '';

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
            // Find person name (usually in h2, h3, h4, or strong inside the card)
            let name = $(el).find('h2, h3, h4, h5, strong, .name, [class*="name"]').first().text().trim();
            
            // Clean name
            if (name && name.length > 2 && name.length < 50 && !name.toLowerCase().includes('team') && !name.toLowerCase().includes('about')) {
              // Normalize name
              const cleanName = name.replace(/[^a-zA-Z\s.-]/g, '').trim();
              const parts = cleanName.split(/\s+/);

              if (parts.length >= 2 && !seenNames.has(cleanName.toLowerCase())) {
                seenNames.add(cleanName.toLowerCase());

                // Find LinkedIn if present in this card
                let linkedin = '';
                $(el).find('a[href*="linkedin.com"]').each((_, a) => {
                  const href = $(a).attr('href');
                  if (href && href.includes('/in/')) linkedin = href;
                });

                people.push({
                  fullName: cleanName,
                  firstName: parts[0],
                  lastName: parts.slice(1).join(' '),
                  jobTitle: matchedTitle,
                  linkedinUrl: linkedin,
                  source: 'Company Team Page'
                });
              }
            }
          }
        });

        if (people.length >= 5) break;
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
        return {
          fullName: rawName,
          firstName: nameWords[0],
          lastName: nameWords.slice(1).join(' '),
          jobTitle: rawTitle || 'Decision Maker',
          source: 'Public Web Search'
        };
      }
    }

    return null;
  }
};

export default peopleFinder;
