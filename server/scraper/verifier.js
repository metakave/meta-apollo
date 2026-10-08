import dns from 'node:dns/promises';

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
  'sharklasers.com', 'dispostable.com', 'getairmail.com', 'throwawaymail.com',
  'yopmail.com', 'trashmail.com'
]);

export const verifier = {
  /**
   * Check if email has valid RFC syntax
   */
  isValidSyntax(email) {
    if (!email || typeof email !== 'string') return false;
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email.trim().toLowerCase());
  },

  /**
   * Check domain MX records
   */
  async checkMX(domain) {
    if (!domain) return { valid: false, provider: 'Unknown', mxRecord: null };
    
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase().trim();

    if (DISPOSABLE_DOMAINS.has(cleanDomain)) {
      return { valid: false, provider: 'Disposable', mxRecord: 'blocked-disposable' };
    }

    try {
      const records = await dns.resolveMx(cleanDomain);
      if (!records || records.length === 0) {
        return { valid: false, provider: 'No MX', mxRecord: null };
      }

      // Sort by priority
      records.sort((a, b) => a.priority - b.priority);
      const topMx = records[0].exchange.toLowerCase();

      let provider = 'Custom Server';
      if (topMx.includes('google') || topMx.includes('l.google.com')) {
        provider = 'Google Workspace';
      } else if (topMx.includes('outlook') || topMx.includes('microsoft')) {
        provider = 'Microsoft 365';
      } else if (topMx.includes('zoho')) {
        provider = 'Zoho Mail';
      } else if (topMx.includes('proton')) {
        provider = 'ProtonMail';
      } else if (topMx.includes('mimecast')) {
        provider = 'Mimecast Protected';
      } else if (topMx.includes('barracuda')) {
        provider = 'Barracuda';
      }

      return {
        valid: true,
        provider,
        mxRecord: topMx
      };
    } catch (err) {
      // Code ENODATA or ENOTFOUND
      return {
        valid: false,
        provider: 'Unresolvable',
        mxRecord: null,
        error: err.code
      };
    }
  },

  /**
   * Generate corporate email candidates from name and domain
   */
  generateEmailCandidates(firstName, lastName, domain) {
    if (!domain) return [];
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase().trim();
    const f = (firstName || '').toLowerCase().replace(/[^a-z]/g, '');
    const l = (lastName || '').toLowerCase().replace(/[^a-z]/g, '');

    if (!f && !l) return [];

    const candidates = [];

    if (f && l) {
      candidates.push({ email: `${f}.${l}@${cleanDomain}`, pattern: 'first.last' });
      candidates.push({ email: `${f}@${cleanDomain}`, pattern: 'first' });
      candidates.push({ email: `${f[0]}${l}@${cleanDomain}`, pattern: 'flast' });
      candidates.push({ email: `${f}_${l}@${cleanDomain}`, pattern: 'first_last' });
      candidates.push({ email: `${f}${l[0]}@${cleanDomain}`, pattern: 'firstl' });
    } else if (f) {
      candidates.push({ email: `${f}@${cleanDomain}`, pattern: 'first' });
    } else if (l) {
      candidates.push({ email: `${l}@${cleanDomain}`, pattern: 'last' });
    }

    return candidates;
  },

  /**
   * Validate and score an email address
   */
  async verifyEmail(email, domain) {
    if (!this.isValidSyntax(email)) {
      return { status: 'invalid', confidence: 0, reason: 'Invalid syntax' };
    }

    const emailDomain = email.split('@')[1];
    const mxResult = await this.checkMX(emailDomain || domain);

    if (!mxResult.valid) {
      return {
        status: 'risky',
        confidence: 20,
        provider: mxResult.provider,
        mxRecord: null,
        reason: 'Domain has no active mail exchange (MX) records'
      };
    }

    return {
      status: 'verified',
      confidence: 95,
      provider: mxResult.provider,
      mxRecord: mxResult.mxRecord,
      reason: `Active mail exchange resolved on ${mxResult.provider}`
    };
  }
};

export default verifier;
