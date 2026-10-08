import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Sparkles,
  Download,
  Building2,
  Users,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Trash2,
  Globe,
  Mail,
  Phone,
  Filter,
  X,
  Play,
  Terminal,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Cpu
} from 'lucide-react';

const LinkedinIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
  </svg>
);

const TwitterIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);


export default function App() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ totalLeads: 0, verifiedEmails: 0, totalCompanies: 0, activeJobs: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState('');

  // Scraping Modal & Active Job
  const [isScrapeModalOpen, setIsScrapeModalOpen] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobLogs, setJobLogs] = useState([]);
  const [isJobRunning, setIsJobRunning] = useState(false);

  // Scraper Form State
  const [scrapeForm, setScrapeForm] = useState({
    target_industry: 'Fintech',
    location: 'London',
    job_titles: 'CEO, Founder, Head of Growth',
    keywords: '',
    company_size: '11-50',
    max_leads: 10
  });

  const terminalEndRef = useRef(null);

  // Fetch initial leads and stats
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedIndustry) params.append('industry', selectedIndustry);
      if (selectedLocation) params.append('location', selectedLocation);
      if (selectedStatus) params.append('email_status', selectedStatus);

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, [selectedIndustry, selectedLocation, selectedStatus]);

  // Handle Search on Enter or debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Auto-scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [jobLogs]);

  // Launch Scraping Job
  const handleStartScrape = async (e) => {
    e.preventDefault();
    try {
      setIsJobRunning(true);
      setJobProgress(5);
      setJobLogs([{ message: 'Initializing scraper parameters...', level: 'info', timestamp: new Date().toISOString() }]);

      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scrapeForm)
      });
      const data = await res.json();

      if (data.job) {
        setActiveJob(data.job);
        // Connect to Server-Sent Events (SSE)
        connectToJobEvents(data.job.id);
      }
    } catch (err) {
      setJobLogs(prev => [...prev, { message: `Launch error: ${err.message}`, level: 'error' }]);
      setIsJobRunning(false);
    }
  };

  const connectToJobEvents = (jobId) => {
    const eventSource = new EventSource(`/api/jobs/${jobId}/events`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'init' && data.job?.logs) {
        setJobLogs(data.job.logs);
      } else if (data.type === 'log') {
        setJobLogs(prev => [...prev, data]);
      } else if (data.type === 'progress') {
        setJobProgress(data.progress);
      } else if (data.type === 'complete') {
        setJobProgress(100);
        setIsJobRunning(false);
        fetchLeads();
        fetchStats();
        eventSource.close();
      } else if (data.type === 'error') {
        setIsJobRunning(false);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setIsJobRunning(false);
      eventSource.close();
    };
  };

  // Re-verify lead
  const handleVerifyLead = async (leadId) => {
    try {
      const res = await fetch(`/api/leads/verify/${leadId}`, { method: 'POST' });
      const data = await res.json();
      if (data.lead) {
        setLeads(prev => prev.map(l => l.id === leadId ? data.lead : l));
        fetchStats();
      }
    } catch (err) {
      console.error('Verify error:', err);
    }
  };

  // Delete lead
  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
      setLeads(prev => prev.filter(l => l.id !== leadId));
      if (selectedLead?.id === leadId) setSelectedLead(null);
      fetchStats();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Copy Email Helper
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(text);
    setTimeout(() => setCopyFeedback(''), 2000);
  };

  // Preset Chips
  const handleSelectPreset = (ind, loc, titles, keywords = '') => {
    setScrapeForm({
      target_industry: ind,
      location: loc,
      job_titles: titles,
      keywords,
      company_size: '11-50',
      max_leads: 12
    });
    setIsScrapeModalOpen(true);
  };

  // Export CSV
  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (selectedIndustry) params.append('industry', selectedIndustry);
    if (selectedLocation) params.append('location', selectedLocation);
    if (selectedStatus) params.append('email_status', selectedStatus);
    window.location.href = `/api/export?${params.toString()}`;
  };

  return (
    <div className="app-container">
      <div className="ambient-glow" />
      <div className="ambient-glow-2" />

      {/* Top Navbar */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon-badge">
            <Sparkles size={22} color="#ffffff" />
          </div>
          <div className="logo-title">
            Apollo<span style={{ color: '#818cf8' }}>Light</span>
            <span className="logo-tag">B2B Intel</span>
          </div>
        </div>

        {/* Global Overview Metrics */}
        <div className="header-stats">
          <div className="header-stat-item">
            <span className="header-stat-val">{stats.totalLeads}</span>
            <span className="header-stat-lbl">Total Leads</span>
          </div>
          <div className="header-stat-item">
            <span className="header-stat-val" style={{ color: '#34d399' }}>{stats.verifiedEmails}</span>
            <span className="header-stat-lbl">Verified Emails</span>
          </div>
          <div className="header-stat-item">
            <span className="header-stat-val">{stats.totalCompanies}</span>
            <span className="header-stat-lbl">Companies</span>
          </div>
          <div className="header-stat-item" style={{ alignItems: 'center', flexDirection: 'row', gap: '8px' }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: isJobRunning ? '#f59e0b' : '#10b981',
              boxShadow: isJobRunning ? '0 0 10px #f59e0b' : '0 0 10px #10b981'
            }} />
            <span className="header-stat-lbl" style={{ color: isJobRunning ? '#f59e0b' : '#10b981' }}>
              {isJobRunning ? 'Scraping Live' : 'Engine Ready'}
            </span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleExport} title="Download CSV for Outreach">
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <button className="btn btn-primary" onClick={() => setIsScrapeModalOpen(true)}>
            <Sparkles size={16} />
            <span>New Scrape Run</span>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="main-layout">
        {/* Filter Card */}
        <div className="filter-card">
          <div className="filter-grid">
            {/* Quick Search */}
            <div className="input-group">
              <Search className="input-icon" size={18} />
              <input
                type="text"
                className="form-input"
                placeholder="Search leads, companies, decision-makers, or emails..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Industry Filter */}
            <div className="input-group">
              <Building2 className="input-icon" size={16} />
              <select
                className="form-select"
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
              >
                <option value="">All Industries</option>
                <option value="Fintech">FinTech</option>
                <option value="SaaS">B2B SaaS</option>
                <option value="AI">AI & Machine Learning</option>
                <option value="Healthcare">HealthTech</option>
                <option value="E-commerce">E-Commerce</option>
                <option value="Marketing">Marketing / AdTech</option>
                <option value="Security">Cybersecurity</option>
              </select>
            </div>

            {/* Location Filter */}
            <div className="input-group">
              <Globe className="input-icon" size={16} />
              <input
                type="text"
                className="form-input"
                placeholder="Filter Location..."
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              />
            </div>

            {/* Email Status Filter */}
            <div className="input-group">
              <ShieldCheck className="input-icon" size={16} />
              <select
                className="form-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">All Email Statuses</option>
                <option value="verified">Verified Deliverable</option>
                <option value="probable">Probable</option>
                <option value="risky">Risky</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>

            <button
              className="btn btn-outline"
              onClick={() => { setSearch(''); setSelectedIndustry(''); setSelectedLocation(''); setSelectedStatus(''); }}
            >
              Reset
            </button>
          </div>

          {/* Preset Shortcuts */}
          <div className="quick-tags-row">
            <span className="quick-label">Target Shortcuts:</span>
            <button className="quick-chip" onClick={() => handleSelectPreset('Fintech', 'London', 'CEO, Founder, Head of Growth')}>
              ⚡ Fintech London
            </button>
            <button className="quick-chip" onClick={() => handleSelectPreset('AI', 'San Francisco', 'Founder, CTO, VP Engineering')}>
              🚀 AI Founders SF
            </button>
            <button className="quick-chip" onClick={() => handleSelectPreset('SaaS', 'New York', 'CEO, Head of Sales, CRO')}>
              💼 B2B SaaS NYC
            </button>
            <button className="quick-chip" onClick={() => handleSelectPreset('Healthcare', 'Boston', 'CEO, Managing Director')}>
              🏥 HealthTech Boston
            </button>
            <button className="quick-chip" onClick={() => handleSelectPreset('E-commerce', 'Remote', 'Founder, Head of Marketing')}>
              🛍️ E-Commerce Global
            </button>
          </div>
        </div>

        {/* View Header */}
        <div className="view-tabs">
          <div className="tabs-list">
            <div className="tab-btn active">
              <Users size={16} />
              <span>Discovered Decision Makers</span>
              <span className="tab-badge">{leads.length}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-outline btn-icon" onClick={() => { fetchLeads(); fetchStats(); }} title="Refresh leads">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Leads Table Container */}
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <RefreshCw size={32} className="spin-animation" color="#818cf8" />
              <p style={{ marginTop: '16px', color: '#94a3b8' }}>Loading intelligence data...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <Sparkles size={28} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px' }}>No Leads Scraped Yet</h3>
              <p style={{ color: '#94a3b8', maxWidth: '420px', marginBottom: '20px', fontSize: '0.88rem' }}>
                Launch a targeted scraping run to discover companies in your target industry, extract key decision-makers, and verify emails.
              </p>
              <button className="btn btn-primary" onClick={() => setIsScrapeModalOpen(true)}>
                <Sparkles size={16} />
                <span>Launch First Scrape</span>
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Decision Maker</th>
                  <th>Company & Domain</th>
                  <th>Verified Email</th>
                  <th>Location</th>
                  <th>Industry</th>
                  <th>Source</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const initials = lead.full_name
                    ? lead.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                    : 'LD';

                  return (
                    <tr key={lead.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLead(lead)}>
                      {/* Name & Title */}
                      <td>
                        <div className="lead-avatar-col">
                          <div className="avatar-badge">{initials}</div>
                          <div>
                            <div className="lead-name-text">
                              {lead.full_name}
                              {lead.linkedin_url && (
                                <a
                                  href={lead.linkedin_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ color: '#0077b5' }}
                                >
                                  <LinkedinIcon size={13} />
                                </a>
                              )}
                            </div>
                            <div className="lead-role-text">{lead.job_title}</div>
                          </div>
                        </div>
                      </td>

                      {/* Company & Domain */}
                      <td>
                        <div>
                          <div style={{ fontWeight: '600', color: '#f8fafc' }}>{lead.company_name}</div>
                          {lead.company_domain && (
                            <a
                              href={lead.company_website || `https://${lead.company_domain}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{ fontSize: '0.78rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
                            >
                              <span>{lead.company_domain}</span>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Email & Status */}
                      <td>
                        {lead.email ? (
                          <div>
                            <div className="email-container">
                              <span>{lead.email}</span>
                              <button
                                className="email-copy-btn"
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(lead.email); }}
                                title="Copy email"
                              >
                                <Copy size={13} />
                              </button>
                              {copyFeedback === lead.email && (
                                <span style={{ fontSize: '0.7rem', color: '#34d399' }}>Copied!</span>
                              )}
                            </div>
                            <div style={{ marginTop: '4px' }}>
                              <span className={`status-pill status-${lead.email_status || 'unverified'}`}>
                                {lead.email_status === 'verified' && <CheckCircle2 size={11} />}
                                {lead.email_status === 'risky' && <AlertCircle size={11} />}
                                <span>{lead.email_status || 'unverified'}</span>
                                {lead.email_mx_record && (
                                  <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>({lead.email_mx_record.split('.')[0]})</span>
                                )}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>No Email</span>
                        )}
                      </td>

                      {/* Location */}
                      <td>
                        <span style={{ color: '#cbd5e1', fontSize: '0.84rem' }}>
                          {lead.location || 'Global / Remote'}
                        </span>
                      </td>

                      {/* Industry */}
                      <td>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#cbd5e1'
                        }}>
                          {lead.industry || 'Tech'}
                        </span>
                      </td>

                      {/* Source */}
                      <td>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {lead.source}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-outline btn-icon"
                            onClick={() => handleVerifyLead(lead.id)}
                            title="Re-verify MX"
                          >
                            <ShieldCheck size={14} color="#34d399" />
                          </button>
                          <button
                            className="btn btn-outline btn-icon"
                            onClick={() => handleDeleteLead(lead.id)}
                            title="Delete Lead"
                          >
                            <Trash2 size={14} color="#f87171" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Scraping Setup & Live Runner Modal */}
      {isScrapeModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-title">
                <Sparkles size={20} color="#818cf8" />
                <span>Autonomous Lead Scraper Engine</span>
              </div>
              <button
                className="btn btn-outline btn-icon"
                onClick={() => { setIsScrapeModalOpen(false); }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleStartScrape}>
              <div className="modal-body">
                {isJobRunning ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.92rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Cpu size={16} color="#818cf8" />
                        Scraping in progress...
                      </span>
                      <span style={{ fontWeight: '700', color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
                        {jobProgress}%
                      </span>
                    </div>

                    <div className="progress-bar-wrap">
                      <div className="progress-bar-fill" style={{ width: `${jobProgress}%` }} />
                    </div>

                    {/* Live streaming terminal */}
                    <div className="live-terminal">
                      {jobLogs.map((l, idx) => (
                        <div key={idx} className="terminal-line">
                          <span className="terminal-time">[{new Date(l.timestamp || Date.now()).toLocaleTimeString()}]</span>
                          <span className={`terminal-msg-${l.level || 'info'}`}>{l.message}</span>
                        </div>
                      ))}
                      <div ref={terminalEndRef} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group">
                        <label className="form-label">Target Industry *</label>
                        <input
                          type="text"
                          className="form-input"
                          style={{ paddingLeft: '14px' }}
                          placeholder="e.g. Fintech, SaaS, Healthcare, Solar"
                          value={scrapeForm.target_industry}
                          onChange={(e) => setScrapeForm({ ...scrapeForm, target_industry: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Target Location *</label>
                        <input
                          type="text"
                          className="form-input"
                          style={{ paddingLeft: '14px' }}
                          placeholder="e.g. London, San Francisco, Austin, Remote"
                          value={scrapeForm.location}
                          onChange={(e) => setScrapeForm({ ...scrapeForm, location: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Decision Maker Job Titles</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '14px' }}
                        placeholder="CEO, Founder, CTO, VP Sales, Head of Marketing"
                        value={scrapeForm.job_titles}
                        onChange={(e) => setScrapeForm({ ...scrapeForm, job_titles: e.target.value })}
                      />
                      <div className="form-help">Comma-separated list of target roles to extract</div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Specific Target Domains or Keywords (Optional)</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '14px' }}
                        placeholder="e.g. stripe.com, vercel.com OR keywords: B2B, Payments, AI"
                        value={scrapeForm.keywords}
                        onChange={(e) => setScrapeForm({ ...scrapeForm, keywords: e.target.value })}
                      />
                      <div className="form-help">Enter target domains directly to crawl leadership, or leave empty for automatic ecosystem discovery</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group">
                        <label className="form-label">Company Headcount</label>
                        <select
                          className="form-select"
                          style={{ paddingLeft: '14px' }}
                          value={scrapeForm.company_size}
                          onChange={(e) => setScrapeForm({ ...scrapeForm, company_size: e.target.value })}
                        >
                          <option value="1-10">1 - 10 employees (Seed)</option>
                          <option value="11-50">11 - 50 employees (Growth)</option>
                          <option value="51-200">51 - 200 employees (Scale-up)</option>
                          <option value="201-500">201 - 500 employees (Mid-market)</option>
                          <option value="500+">500+ employees (Enterprise)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Leads To Scrape: {scrapeForm.max_leads}</label>
                        <input
                          type="range"
                          min="5"
                          max="30"
                          step="5"
                          value={scrapeForm.max_leads}
                          onChange={(e) => setScrapeForm({ ...scrapeForm, max_leads: parseInt(e.target.value) })}
                          style={{ width: '100%', marginTop: '10px' }}
                        />
                      </div>
                    </div>

                    {/* Pre-run Summary */}
                    <div style={{
                      background: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      fontSize: '0.8rem',
                      color: '#c7d2fe',
                      marginTop: '8px'
                    }}>
                      ⚡ The scraper will find matching companies in <strong>{scrapeForm.target_industry}</strong>, crawl their websites and leadership pages, generate corporate email permutations, and perform live DNS MX validation.
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                {!isJobRunning ? (
                  <>
                    <button type="button" className="btn btn-outline" onClick={() => setIsScrapeModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <Play size={16} fill="#ffffff" />
                      <span>Start Scraping Run</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setIsScrapeModalOpen(false); }}
                  >
                    Run in Background
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Detail Drawer / Modal */}
      {selectedLead && (
        <div className="modal-backdrop" onClick={() => setSelectedLead(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <div className="modal-title">
                <Users size={20} color="#818cf8" />
                <span>Lead Intelligence Profile</span>
              </div>
              <button className="btn btn-outline btn-icon" onClick={() => setSelectedLead(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {/* Header Profile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div className="avatar-badge" style={{ width: '56px', height: '56px', fontSize: '1.2rem' }}>
                  {selectedLead.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f8fafc' }}>
                    {selectedLead.full_name}
                  </h3>
                  <div style={{ color: '#818cf8', fontWeight: '600', fontSize: '0.92rem' }}>
                    {selectedLead.job_title} at {selectedLead.company_name}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '2px' }}>
                    {selectedLead.location || 'Global'} • {selectedLead.industry || 'Technology'}
                  </div>
                </div>
              </div>

              {/* Verified Contact Card */}
              <div style={{
                background: 'rgba(15, 20, 34, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '700', marginBottom: '10px' }}>
                  Contact Information
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Mail size={16} color="#818cf8" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>{selectedLead.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`status-pill status-${selectedLead.email_status || 'unverified'}`}>
                      {selectedLead.email_status}
                    </span>
                    <button className="email-copy-btn" onClick={() => copyToClipboard(selectedLead.email)}>
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                {selectedLead.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                    <Phone size={16} color="#34d399" />
                    <span style={{ fontSize: '0.85rem' }}>{selectedLead.phone}</span>
                  </div>
                )}
              </div>

              {/* Intelligence & Technical Audit */}
              <div style={{
                background: 'rgba(15, 20, 34, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px'
              }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '700', marginBottom: '10px' }}>
                  Company & Mail Server Audit
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.84rem' }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Domain: </span>
                    <span style={{ fontWeight: '600' }}>{selectedLead.company_domain}</span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Company Size: </span>
                    <span style={{ fontWeight: '600' }}>{selectedLead.company_size || '11-50'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>MX Server: </span>
                    <span style={{ fontWeight: '600', color: '#34d399' }}>{selectedLead.email_mx_record || 'Resolved'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Discovery Source: </span>
                    <span style={{ fontWeight: '600' }}>{selectedLead.source}</span>
                  </div>
                </div>

                {/* Social Links */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  {selectedLead.company_website && (
                    <a
                      href={selectedLead.company_website}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline"
                      style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                    >
                      <Globe size={13} />
                      <span>Website</span>
                    </a>
                  )}
                  {selectedLead.linkedin_url && (
                    <a
                      href={selectedLead.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline"
                      style={{ fontSize: '0.75rem', padding: '6px 12px', color: '#0077b5' }}
                    >
                      <LinkedinIcon size={13} />
                      <span>LinkedIn Profile</span>
                    </a>
                  )}
                  {selectedLead.twitter_url && (
                    <a
                      href={selectedLead.twitter_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline"
                      style={{ fontSize: '0.75rem', padding: '6px 12px', color: '#1da1f2' }}
                    >
                      <TwitterIcon size={13} />
                      <span>Twitter / X</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelectedLead(null)}>
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  copyToClipboard(selectedLead.email);
                }}
              >
                <Copy size={14} />
                <span>Copy Email</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
