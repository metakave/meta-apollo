import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'apollo.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for high performance concurrency
db.exec(`PRAGMA journal_mode = WAL;`);
db.exec(`PRAGMA synchronous = NORMAL;`);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    target_industry TEXT NOT NULL,
    location TEXT,
    job_titles TEXT,
    keywords TEXT,
    company_size TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    max_leads INTEGER DEFAULT 20,
    leads_count INTEGER DEFAULT 0,
    logs TEXT DEFAULT '[]',
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    job_id TEXT,
    full_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    job_title TEXT,
    company_name TEXT NOT NULL,
    company_domain TEXT,
    company_website TEXT,
    company_size TEXT,
    industry TEXT,
    location TEXT,
    email TEXT,
    email_status TEXT DEFAULT 'unverified',
    email_mx_record TEXT,
    phone TEXT,
    whatsapp TEXT,
    linkedin_url TEXT,
    company_linkedin TEXT,
    twitter_url TEXT,
    source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE SET NULL,
    UNIQUE(email, company_name)
  );

  CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads(industry);
  CREATE INDEX IF NOT EXISTS idx_leads_location ON leads(location);
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(email_status);
  CREATE INDEX IF NOT EXISTS idx_leads_job_id ON leads(job_id);
`);

// Safe column migrations for existing databases
try {
  db.exec(`ALTER TABLE leads ADD COLUMN whatsapp TEXT;`);
} catch (e) {
  // column already exists
}
try {
  db.exec(`ALTER TABLE leads ADD COLUMN company_linkedin TEXT;`);
} catch (e) {
  // column already exists
}

export const database = {
  // Jobs methods
  createJob(job) {
    const stmt = db.prepare(`
      INSERT INTO jobs (id, target_industry, location, job_titles, keywords, company_size, status, progress, max_leads, leads_count, logs, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    stmt.run(
      job.id,
      job.target_industry,
      job.location || '',
      job.job_titles || '',
      job.keywords || '',
      job.company_size || '',
      job.status || 'pending',
      job.progress || 0,
      job.max_leads || 20,
      0,
      JSON.stringify(job.logs || [])
    );
    return this.getJob(job.id);
  },

  getJob(id) {
    const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
    const job = stmt.get(id);
    if (job && typeof job.logs === 'string') {
      try {
        job.logs = JSON.parse(job.logs);
      } catch {
        job.logs = [];
      }
    }
    return job;
  },

  getAllJobs() {
    const stmt = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC');
    const jobs = stmt.all();
    return jobs.map(j => {
      try {
        j.logs = JSON.parse(j.logs);
      } catch {
        j.logs = [];
      }
      return j;
    });
  },

  updateJob(id, updates) {
    const current = this.getJob(id);
    if (!current) return null;

    const merged = { ...current, ...updates };
    const logsStr = Array.isArray(merged.logs) ? JSON.stringify(merged.logs) : merged.logs;

    const stmt = db.prepare(`
      UPDATE jobs 
      SET status = ?, progress = ?, leads_count = ?, logs = ?, error_message = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(
      merged.status,
      merged.progress || 0,
      merged.leads_count || 0,
      logsStr,
      merged.error_message || null,
      id
    );
    return this.getJob(id);
  },

  appendJobLog(id, message, level = 'info') {
    const job = this.getJob(id);
    if (!job) return;
    const logs = Array.isArray(job.logs) ? job.logs : [];
    logs.push({
      timestamp: new Date().toISOString(),
      message,
      level
    });
    // Keep last 150 logs
    const trimmed = logs.slice(-150);
    const stmt = db.prepare(`UPDATE jobs SET logs = ?, updated_at = datetime('now') WHERE id = ?`);
    stmt.run(JSON.stringify(trimmed), id);
  },

  // Leads methods
  insertLead(lead) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO leads (
        id, job_id, full_name, first_name, last_name, job_title, 
        company_name, company_domain, company_website, company_size, 
        industry, location, email, email_status, email_mx_record, 
        phone, whatsapp, linkedin_url, company_linkedin, twitter_url, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      lead.id,
      lead.job_id || null,
      lead.full_name,
      lead.first_name || '',
      lead.last_name || '',
      lead.job_title || 'Decision Maker',
      lead.company_name,
      lead.company_domain || '',
      lead.company_website || '',
      lead.company_size || '',
      lead.industry || '',
      lead.location || '',
      lead.email || '',
      lead.email_status || 'unverified',
      lead.email_mx_record || '',
      lead.phone || '',
      lead.whatsapp || '',
      lead.linkedin_url || '',
      lead.company_linkedin || '',
      lead.twitter_url || '',
      lead.source || 'Scraped'
    );

    return this.getLead(lead.id);
  },

  getLead(id) {
    const stmt = db.prepare('SELECT * FROM leads WHERE id = ?');
    return stmt.get(id);
  },

  deleteLead(id) {
    const stmt = db.prepare('DELETE FROM leads WHERE id = ?');
    stmt.run(id);
  },

  getLeads({ search = '', industry = '', location = '', email_status = '', has_whatsapp = '', has_linkedin = '', job_id = '', page = 1, limit = 50 } = {}) {
    let whereClauses = [];
    let params = [];

    if (search) {
      whereClauses.push('(full_name LIKE ? OR company_name LIKE ? OR email LIKE ? OR job_title LIKE ? OR phone LIKE ? OR whatsapp LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern, pattern);
    }
    if (industry) {
      whereClauses.push('industry LIKE ?');
      params.push(`%${industry}%`);
    }
    if (location) {
      whereClauses.push('location LIKE ?');
      params.push(`%${location}%`);
    }
    if (email_status) {
      whereClauses.push('email_status = ?');
      params.push(email_status);
    }
    if (has_whatsapp === 'true' || has_whatsapp === true) {
      whereClauses.push("(whatsapp IS NOT NULL AND whatsapp != '')");
    }
    if (has_linkedin === 'true' || has_linkedin === true) {
      whereClauses.push("(linkedin_url IS NOT NULL AND linkedin_url != '')");
    }
    if (job_id) {
      whereClauses.push('job_id = ?');
      params.push(job_id);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    // Count total
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM leads ${whereSql}`);
    const { total } = countStmt.get(...params);

    // Get paginated leads
    const offset = (Math.max(1, page) - 1) * limit;
    const leadsStmt = db.prepare(`SELECT * FROM leads ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`);
    const leads = leadsStmt.all(...params, limit, offset);

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
      leads
    };
  },

  getAllLeadsForExport({ search = '', industry = '', location = '', email_status = '', job_id = '' } = {}) {
    let whereClauses = [];
    let params = [];

    if (search) {
      whereClauses.push('(full_name LIKE ? OR company_name LIKE ? OR email LIKE ? OR job_title LIKE ? OR phone LIKE ? OR whatsapp LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern, pattern);
    }
    if (industry) {
      whereClauses.push('industry LIKE ?');
      params.push(`%${industry}%`);
    }
    if (location) {
      whereClauses.push('location LIKE ?');
      params.push(`%${location}%`);
    }
    if (email_status) {
      whereClauses.push('email_status = ?');
      params.push(email_status);
    }
    if (job_id) {
      whereClauses.push('job_id = ?');
      params.push(job_id);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const stmt = db.prepare(`SELECT * FROM leads ${whereSql} ORDER BY created_at DESC`);
    return stmt.all(...params);
  },

  getStats() {
    const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
    const verifiedEmails = db.prepare("SELECT COUNT(*) as count FROM leads WHERE email_status = 'verified'").get().count;
    const totalCompanies = db.prepare('SELECT COUNT(DISTINCT company_name) as count FROM leads').get().count;
    const whatsappCount = db.prepare("SELECT COUNT(*) as count FROM leads WHERE whatsapp IS NOT NULL AND whatsapp != ''").get().count;
    const linkedinCount = db.prepare("SELECT COUNT(*) as count FROM leads WHERE linkedin_url IS NOT NULL AND linkedin_url != ''").get().count;
    const totalJobs = db.prepare('SELECT COUNT(*) as count FROM jobs').get().count;
    const runningJobs = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'running'").get().count;

    return {
      totalLeads,
      verifiedEmails,
      totalCompanies,
      whatsappCount,
      linkedinCount,
      totalJobs,
      runningJobs
    };
  }
};

export default database;
