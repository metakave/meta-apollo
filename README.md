# Apollo Light 🚀
### Autonomous B2B Lead Scraping & Intelligence Engine

Apollo Light is a lightweight, self-hosted clone of Apollo.io. It discovers target companies by industry and location, crawls corporate websites and leadership pages, extracts decision-makers, generates corporate email permutations, and performs live DNS MX validation.

---

## Features

- **Multi-Source Company Discovery**: Free ecosystem discovery across B2B registers, domains, and directories.
- **Deep Website Scraping**: Automatically extracts company description, detected tech stack (React, Next.js, Stripe, HubSpot, Shopify, etc.), phone numbers, WhatsApp contact widgets, and social links.
- **WhatsApp Contact Intelligence**: Automatically detects and validates WhatsApp numbers from `wa.me` links, WhatsApp Web/API widgets, text patterns, and contact pages. Provides 1-click **"Chat on WhatsApp"** directly in browser and WhatsApp desktop.
- **Decision-Maker & LinkedIn Profile Discovery**:
  - Scans team, about, contact, and leadership pages for key roles (`CEO`, `Founder`, `CTO`, `VP`, `Head of Growth`).
  - Discovers verified personal LinkedIn profiles (`/in/`) with direct 1-click access and automated targeted LinkedIn People Search links.
- **Corporate Email Permutation & Verification**:
  - Generates standard B2B patterns (`first.last@domain`, `first@domain`, `flast@domain`).
  - Real-time DNS MX validation (identifying Google Workspace, Microsoft 365, Zoho Mail, etc.) without requiring paid third-party APIs.
- **Real-Time Job Streaming**: Live Server-Sent Events (SSE) terminal and progress bar showing each crawling step.
- **Cold Outreach CSV Export**: 1-click export formatted for instant import into Instantly, Lemlist, Smartlead, or HubSpot with verified emails, WhatsApp numbers, direct WhatsApp chat links, and LinkedIn URLs.
- **Modern Apollo UI**: Dark-mode glassmorphic dashboard with quick industry shortcuts, direct WhatsApp and LinkedIn filters, and slide-over lead intelligence profiles.

---

## Quick Start

### 1. Start the Application
```bash
# Starts both the backend API and client
npm run dev
```

Alternatively, to run the standalone server (with built frontend):
```bash
npm run dev:server
```

Open your browser at **`http://localhost:5001`** (or `http://localhost:3000` in Vite dev mode).

---

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status |
| `GET` | `/api/stats` | Global metrics (total leads, verified emails, companies) |
| `GET` | `/api/leads` | Filterable leads (`industry`, `location`, `search`, `email_status`) |
| `POST` | `/api/scrape` | Queue a background scraping job with parameters |
| `GET` | `/api/jobs/:id/events` | Live SSE stream of scraping progress and terminal logs |
| `POST` | `/api/leads/verify/:id` | Re-verify an individual lead's MX status on demand |
| `GET` | `/api/export` | Download filtered leads as CSV or JSON |

---

## Architecture
- **Backend**: Node.js, Express, `node:sqlite` (zero-dependency built-in WAL database), Axios, Cheerio, Node DNS promises.
- **Frontend**: React 19, Vite, Lucide Icons, Vanilla CSS design system.
