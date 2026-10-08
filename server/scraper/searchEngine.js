import axios from 'axios';

const EXCLUDED_DOMAINS = new Set([
  'google.com', 'facebook.com', 'twitter.com', 'x.com', 'linkedin.com',
  'youtube.com', 'instagram.com', 'wikipedia.org', 'medium.com', 'github.com',
  'reddit.com', 'amazon.com', 'apple.com', 'microsoft.com', 'glassdoor.com',
  'indeed.com', 'crunchbase.com', 'pitchbook.com', 'bloomberg.com', 'forbes.com',
  'techcrunch.com', 'standard.co.uk', 'reuters.com', 'businessinsider.com'
]);

export const searchEngine = {
  /**
   * Discovers candidate company domains matching industry, location, and keywords
   */
  async findCompanies({ industry, location, keywords, maxCompanies = 15 }) {
    const discovered = new Map(); // domain -> company basic info

    // 1. Search GitHub Organizations by keyword and location
    try {
      let qParts = ['type:org'];
      if (industry) qParts.push(encodeURIComponent(industry));
      if (keywords) qParts.push(encodeURIComponent(keywords));
      if (location) qParts.push(`location:${encodeURIComponent(location)}`);

      const ghQuery = qParts.join('+');
      const ghRes = await axios.get(`https://api.github.com/search/users?q=${ghQuery}&per_page=30`, {
        headers: {
          'User-Agent': 'Apollo-Light-Scraper/1.0',
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 9000
      });

      if (ghRes.data && Array.isArray(ghRes.data.items)) {
        // Fetch detailed profile for top items
        const topItems = ghRes.data.items.slice(0, 15);
        for (const item of topItems) {
          try {
            const orgRes = await axios.get(item.url, {
              headers: { 'User-Agent': 'Apollo-Light-Scraper/1.0' },
              timeout: 5000
            });
            const org = orgRes.data;
            let blog = org.blog || '';
            if (blog && !blog.startsWith('http://') && !blog.startsWith('https://')) {
              blog = 'https://' + blog;
            }

            if (blog) {
              const domain = new URL(blog).hostname.replace(/^www\./, '').toLowerCase();
              if (!EXCLUDED_DOMAINS.has(domain) && !discovered.has(domain)) {
                discovered.set(domain, {
                  domain,
                  website: blog,
                  name: org.name || org.login,
                  location: org.location || location || '',
                  publicEmail: org.email || '',
                  twitter: org.twitter_username ? `https://twitter.com/${org.twitter_username}` : '',
                  source: 'GitHub B2B Registry'
                });
              }
            }
          } catch {}
          if (discovered.size >= maxCompanies) break;
        }
      }
    } catch (err) {
      // Continue to next source
    }

    // 2. Search Hacker News Startups & B2B Launches
    if (discovered.size < maxCompanies) {
      try {
        const queryTerms = [industry, location, keywords].filter(Boolean).join(' ');
        const hnRes = await axios.get('https://hn.algolia.com/api/v1/search', {
          params: {
            query: queryTerms,
            tags: 'story',
            hitsPerPage: 20
          },
          timeout: 8000
        });

        if (hnRes.data && Array.isArray(hnRes.data.hits)) {
          for (const hit of hnRes.data.hits) {
            if (hit.url) {
              try {
                const parsed = new URL(hit.url);
                const domain = parsed.hostname.replace(/^www\./, '').toLowerCase();
                if (!EXCLUDED_DOMAINS.has(domain) && !discovered.has(domain)) {
                  discovered.set(domain, {
                    domain,
                    website: `${parsed.protocol}//${parsed.hostname}`,
                    name: hit.title.split(/[|\-–—:]/)[0].trim(),
                    location: location || '',
                    publicEmail: '',
                    twitter: '',
                    source: 'HN Tech Ecosystem'
                  });
                }
              } catch {}
            }
            if (discovered.size >= maxCompanies) break;
          }
        }
      } catch (err) {
        // Continue
      }
    }

    return Array.from(discovered.values());
  }
};

export default searchEngine;
