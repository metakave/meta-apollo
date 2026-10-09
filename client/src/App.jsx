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

const WhatsappIcon = ({ size = 14, color = '#25D366' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color, flexShrink: 0 }}>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.02L7.55 18.84L4.44 19.65L5.27 16.62L5.07 16.31C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.32C9.36 7.32 9.09 7.38 8.87 7.62C8.64 7.87 8.02 8.45 8.02 9.63C8.02 10.81 8.88 11.95 9 12.11C9.12 12.27 10.69 14.69 13.1 15.73C13.67 15.98 14.12 16.13 14.47 16.24C15.04 16.42 15.56 16.4 15.97 16.34C16.43 16.27 17.39 15.76 17.59 15.2C17.79 14.64 17.79 14.16 17.73 14.06C17.67 13.96 17.51 13.9 17.26 13.78C17 13.66 15.73 13.03 15.5 12.94C15.26 12.86 15.09 12.82 14.93 13.07C14.76 13.31 14.28 13.88 14.14 14.04C14 14.21 13.86 14.23 13.61 14.11C13.36 13.98 12.56 13.72 11.61 12.88C10.87 12.22 10.37 11.41 10.23 11.16C10.09 10.92 10.21 10.79 10.34 10.66C10.45 10.55 10.59 10.37 10.72 10.22C10.84 10.08 10.88 9.97 10.97 9.81C11.05 9.64 11.01 9.5 10.95 9.38C10.89 9.25 10.41 8.09 10.22 7.61C10.02 7.15 9.82 7.21 9.67 7.21L9.53 7.32Z"/>
  </svg>
);

const TwitterIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

export default function App() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ totalLeads: 0, verifiedEmails: 0, totalCompanies: 0, whatsappCount: 0, linkedinCount: 0, activeJobs: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [filterWhatsapp, setFilterWhatsapp] = useState(false);
  const [filterLinkedin, setFilterLinkedin] = useState(false);
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
      if (filterWhatsapp) params.append('has_whatsapp', 'true');
      if (filterLinkedin) params.append('has_linkedin', 'true');

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
  }, [selectedIndustry, selectedLocation, selectedStatus, filterWhatsapp, filterLinkedin]);

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
    if (filterWhatsapp) params.append('has_whatsapp', 'true');
    if (filterLinkedin) params.append('has_linkedin', 'true');
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
            <span className="header-stat-val" style={{ color: '#25D366' }}>{stats.whatsappCount || 0}</span>
            <span className="header-stat-lbl">WhatsApp Ready</span>
          </div>
          <div className="header-stat-item">
            <span className="header-stat-val" style={{ color: '#38bdf8' }}>{stats.linkedinCount || 0}</span>
            <span className="header-stat-lbl">LinkedIn Profiles</span>
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
                placeholder="Search leads, companies, WhatsApp numbers, or emails..."
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
              onClick={() => { setSearch(''); setSelectedIndustry(''); setSelectedLocation(''); setSelectedStatus(''); setFilterWhatsapp(false); setFilterLinkedin(false); }}
            >
              Reset
            </button>
          </div>

          {/* Preset Shortcuts & Quick Channels */}
          <div className="quick-tags-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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

            {/* Direct Channel Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className={`quick-chip ${filterWhatsapp ? 'active' : ''}`}
                style={{
                  background: filterWhatsapp ? 'rgba(37, 211, 102, 0.25)' : 'rgba(37, 211, 102, 0.08)',
                  borderColor: filterWhatsapp ? '#25D366' : 'rgba(37, 211, 102, 0.25)',
                  color: '#25D366',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                onClick={() => setFilterWhatsapp(!filterWhatsapp)}
              >
                <WhatsappIcon size={13} />
                <span>With WhatsApp Only</span>
              </button>

              <button
                className={`quick-chip ${filterLinkedin ? 'active' : ''}`}
                style={{
                  background: filterLinkedin ? 'rgba(10, 102, 194, 0.3)' : 'rgba(10, 102, 194, 0.1)',
                  borderColor: filterLinkedin ? '#0077b5' : 'rgba(10, 102, 194, 0.3)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                onClick={() => setFilterLinkedin(!filterLinkedin)}
              >
                <LinkedinIcon size={13} />
                <span>With LinkedIn Only</span>
              </button>
            </div>
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
                  <th>WhatsApp & Phone</th>
                  <th>Location</th>
                  <th>Industry</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const initials = lead.full_name
                    ? lead.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                    : 'LD';

                  const isPersonalLinkedin = lead.linkedin_url && lead.linkedin_url.includes('/in/');
                  const waNumber = lead.whatsapp || (lead.phone && lead.phone.startsWith('+') ? lead.phone : '');
                  const waDigits = waNumber ? waNumber.replace(/\D/g, '') : '';

                  return (
                    <tr key={lead.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLead(lead)}>
                      {/* Name, LinkedIn & Title */}
                      <td>
                        <div className="lead-avatar-col">
                          <div className="avatar-badge">{initials}</div>
                          <div>
                            <div className="lead-name-text">
                              <span>{lead.full_name}</span>
                              {lead.linkedin_url && (
                                <a
                                  href={lead.linkedin_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className={isPersonalLinkedin ? 'linkedin-badge' : 'linkedin-search-link'}
                                  title={isPersonalLinkedin ? 'Open verified personal LinkedIn profile' : '1-click Search decision-maker on LinkedIn'}
                                >
                                  <LinkedinIcon size={12} />
                                  <span>{isPersonalLinkedin ? 'Profile' : 'Find Profile'}</span>
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

                      {/* WhatsApp & Phone */}
                      <td>
                        {waNumber ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <a
                                href={`https://wa.me/${waDigits}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="whatsapp-pill"
                                title="Chat with this lead directly on WhatsApp"
                              >
                                <WhatsappIcon size={13} />
                                <span>{waNumber}</span>
                              </a>
                              <button
                                className="email-copy-btn"
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(waNumber); }}
                                title="Copy WhatsApp Number"
                              >
                                <Copy size={12} />
                              </button>
                              {copyFeedback === waNumber && (
                                <span style={{ fontSize: '0.68rem', color: '#25D366' }}>Copied!</span>
                              )}
                            </div>
                            {lead.phone && lead.phone !== waNumber && (
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                                Tel: {lead.phone}
                              </div>
                            )}
                          </div>
                        ) : lead.phone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>{lead.phone}</span>
                            {lead.phone.replace(/\D/g, '').length >= 10 && (
                              <a
                                href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="whatsapp-pill"
                                style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                                title="Try WhatsApp Chat"
                              >
                                <WhatsappIcon size={11} />
                                <span>Chat</span>
                              </a>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.78rem' }}>No WhatsApp/Phone</span>
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

              {/* Verified WhatsApp Card if available */}
              {(selectedLead.whatsapp || (selectedLead.phone && selectedLead.phone.replace(/\D/g, '').length >= 10)) && (
                <div style={{
                  background: 'rgba(37, 211, 102, 0.08)',
                  border: '1px solid rgba(37, 211, 102, 0.28)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    fontSize: '0.74rem',
                    textTransform: 'uppercase',
                    color: '#25D366',
                    fontWeight: '800',
                    letterSpacing: '0.6px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <WhatsappIcon size={16} />
                    <span>WhatsApp Direct Contact</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: '700', color: '#f8fafc' }}>
                      {selectedLead.whatsapp || selectedLead.phone}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="btn btn-outline"
                        style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                        onClick={() => copyToClipboard(selectedLead.whatsapp || selectedLead.phone)}
                      >
                        <Copy size={13} />
                        <span>Copy Number</span>
                      </button>

                      <a
                        href={`https://wa.me/${(selectedLead.whatsapp || selectedLead.phone).replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="whatsapp-action-btn"
                      >
                        <WhatsappIcon size={14} color="#062b13" />
                        <span>Chat on WhatsApp</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Verified Contact Card */}
              <div style={{
                background: 'rgba(15, 20, 34, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '700', marginBottom: '10px' }}>
                  Email & Phone Channels
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Phone size={16} color="#34d399" />
                      <span style={{ fontSize: '0.88rem', fontFamily: 'var(--font-mono)' }}>{selectedLead.phone}</span>
                    </div>
                    <button className="email-copy-btn" onClick={() => copyToClipboard(selectedLead.phone)}>
                      <Copy size={14} />
                    </button>
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

                {/* Social & Professional Links */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  {selectedLead.linkedin_url && (
                    <a
                      href={selectedLead.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline"
                      style={{
                        fontSize: '0.78rem',
                        padding: '6px 14px',
                        color: '#38bdf8',
                        borderColor: 'rgba(10, 102, 194, 0.35)',
                        background: 'rgba(10, 102, 194, 0.12)'
                      }}
                    >
                      <LinkedinIcon size={14} />
                      <span>{selectedLead.linkedin_url.includes('/in/') ? 'Personal LinkedIn Profile' : 'Search Profile on LinkedIn'}</span>
                      <ExternalLink size={12} />
                    </a>
                  )}

                  {selectedLead.company_linkedin && selectedLead.company_linkedin !== selectedLead.linkedin_url && (
                    <a
                      href={selectedLead.company_linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline"
                      style={{ fontSize: '0.78rem', padding: '6px 12px', color: '#0077b5' }}
                    >
                      <LinkedinIcon size={13} />
                      <span>Company LinkedIn</span>
                    </a>
                  )}

                  {selectedLead.company_website && (
                    <a
                      href={selectedLead.company_website}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline"
                      style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                    >
                      <Globe size={13} />
                      <span>Company Website</span>
                    </a>
                  )}

                  {selectedLead.twitter_url && (
                    <a
                      href={selectedLead.twitter_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline"
                      style={{ fontSize: '0.78rem', padding: '6px 12px', color: '#1da1f2' }}
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
