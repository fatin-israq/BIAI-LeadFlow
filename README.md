# BIAI LeadFlow — AI-Powered Multilingual CRM

> Built for the **BIAI AI Engineering Internship Technical Assessment (Round 2)**.  
> An enterprise-grade, production-quality CRM designed for the Bangladesh Institute of Artificial Intelligence (BIAI) to manage inbound multi-channel enquiries, extract structured intelligence from Bangla, Banglish, and English text, enforce a 5-stage sales pipeline with contact deduplication, and automate 48-hour follow-up SLAs.

---

## 1. Executive Summary & Problem Solved

BIAI receives enquiries across five fragmented channels:
- **WhatsApp**
- **Facebook Messenger**
- **Facebook comments**
- **Website contact forms**
- **Phone call notes**

Before LeadFlow, enquiries were lost, prospective students waited days without answers, spam and job applications cluttered sales records, and team members lacked visibility into who required a follow-up.

**BIAI LeadFlow** solves this with an AI-first workflow:
1. **Centralizes every enquiry** from all 5 channels in Asia/Dhaka time (`GMT+6`).
2. **AI Multilingual Intake Studio**: Extracts structured data (name, phone, category, programme interest, intent, priority, sentiment) from Bangla (বাংলা), Banglish (Roman Bengali), and English messages without hallucinating missing fields.
3. **Culturally Attuned Suggested Replies**: Drafts polite, policy-safe responses matching the sender's language, with one-click clipboard copying.
4. **5-Stage Sales Pipeline**: Kanban board (`New`, `Contacted`, `Interested`, `Paid`, `Lost`) with drag-and-drop and phone-based contact deduplication.
5. **Non-Sales Isolation**: Prevents spam (crypto promotions), job applicants, payment complaints, and refund threats from polluting the sales pipeline while escalating urgent issues to human staff.
6. **48-Hour SLA Engine**: Tracks time since last interaction and flags overdue leads for timely outreach.

---

## 2. System Architecture

```
                          ┌───────────────────────────────────────┐
                          │         React Frontend (Vite)         │
                          │   Tailwind CSS • shadcn/ui • Recharts │
                          │     Kanban DnD • Zod Form Validation  │
                          └───────────────────┬───────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │                                               │
             [Demo / Offline Mode]                                    │ [Production Proxy]
                      ▼                                               ▼
          ┌───────────────────────┐                     ┌───────────────────────────┐
          │  Local Storage Layer  │                     │ Cloudflare Pages Function │
          │  20 Pristine Samples  │                     │   /api/ai/process-enquiry │
          │  Full State & Kanban  │                     └─────────────┬─────────────┘
          └───────────────────────┘                                   │
                                                        ┌─────────────┴─────────────┐
                                                        ▼                           ▼
                                             ┌─────────────────────┐     ┌─────────────────────┐
                                             │     n8n Webhook     │     │  Google Gemini API  │
                                             │  Workflow Engine    │     │  1.5 Flash (Edge)   │
                                             └──────────┬──────────┘     └─────────────────────┘
                                                        │
                                                        ▼
                                             ┌─────────────────────┐
                                             │ Supabase PostgreSQL │
                                             │   RLS & Dhaka Time  │
                                             └─────────────────────┘
```

---

## 3. Handling of the 20 Supplied Sample Enquiries

The supplied dataset (`sample-enquiries.csv`) contains 20 real-world edge cases. LeadFlow handles each with explicit business rules:

| ID | Sender & Channel | Language | Category | Programme | Intelligent Handling & Safety Boundary |
|---|---|---|---|---|---|
| **1** | Rafi Ahmed (WhatsApp) | Banglish | Sales Enquiry | Bootcamp | Asks about 3-day bootcamp fee. Linked to Lead with phone `01711000001`. |
| **2** | Tahmina Akter (Messenger) | Bangla | Sales Enquiry | Fellowship | Bengali script preserved. Phone is missing; **preserved as `null` without fabricating numbers**. |
| **3** | Mahmud Hasan (Website) | English | Corporate Training | Corporate | Managing Director of Gazipur textile company; **high-value 40-employee B2B opportunity**. |
| **4** | Sabbir (WhatsApp) | Banglish | Programme Info | Unknown | Asks about live vs recorded classes; **programme kept as Unknown** without guessing. |
| **5** | Nasreen Sultana (Phone note) | English | Sales Enquiry | Unknown | Inquired about student discount; notes callback tomorrow after 5 PM relative to Oct 26. |
| **6** | Ishtiaq (FB comment) | Banglish | Programme Info | Unknown | Asks if course guarantees a job. **Reply explicitly avoids making false employment promises**. |
| **7** | Farzana Rahman (WhatsApp) | Bangla | Payment Support | Unknown | Claims bKash payment made Oct 25; **NOT marked as Paid; escalated for human transaction verification**. |
| **8** | Anika Chowdhury (Website) | English | Programme Info | Unknown | Asks about refund terms; **does NOT invent refund rules; states admissions team will clarify**. |
| **9** | Jahid (Messenger) | Banglish | Programme Info | Unknown | Asks about Mirpur offline venue; **does NOT claim classes are in Mirpur without verification**. |
| **10** | Kamrul Islam (WhatsApp) | English | Corporate Training | Corporate | Bank HR requesting quote for 120 staff; **high-priority corporate lead**. |
| **11** | Earn Crypto Daily (FB comment) | English | Spam | Unknown | Unsolicited cryptocurrency signals; **classified as spam; excluded from sales pipeline**. |
| **12** | Rafi Ahmed (WhatsApp) | Banglish | Sales Enquiry | Bootcamp | Second enquiry with same phone `01711000001`; **deduplicated and attached to Rafi's existing lead**. |
| **13** | Mim (Messenger) | Bangla | General Support | Unknown | Class 9 student asking about free masterclass; **kept in general support, not forced into sales**. |
| **14** | Shirin Sultana (Website) | English | Sales Enquiry | Fellowship | 8-year marketing manager with no coding; **identified as Fellowship candidate for executive AI track**. |
| **15** | Tanvir (WhatsApp) | Banglish | Programme Info | Unknown | Inquiring about add-on and lifetime access; programme kept as Unknown. |
| **16** | Habibur Rahman (Phone note) | English | Refund / Cancel | Unknown | Upset caller threatening Facebook post; **flagged for urgent management escalation**. |
| **17** | Nowshin (Messenger) | Banglish | Programme Info | Unknown | Inquires about govt accreditation; **neutral response avoiding unauthorized accreditation claims**. |
| **18** | Rezaul Karim (WhatsApp) | Bangla | Corporate Training | Corporate | Garment factory owner with 15 workers; **corporate training group discount opportunity**. |
| **19** | Samira (WhatsApp) | English | Sales Enquiry | Fellowship | Inquiring about 2-installment payment option for Fellowship. |
| **20** | Arif Hossain (Website) | English | Job Application | Unknown | AI intern candidate; **classified as job application; excluded from customer sales pipeline**. |

---

## 4. Screens & Capabilities

### Screen 1: Overview Dashboard (`/`)
- **KPI Summary Cards**: Real dynamic counts of Total Inbound, Sales Leads, New, Interested, Paid, Lost, and Overdue 48h SLA tasks.
- **Interactive Recharts**:
  - Enquiries by Source Channel (WhatsApp, Messenger, Facebook comments, Web forms, Phone notes)
  - Sales Pipeline Distribution (Pie chart of stages)
  - Demand by Programme Interest (Bootcamp, Fellowship, Corporate)
  - Inbound Volume & Conversion Velocity over time
- **Urgent Attention Center**: Highlights escalated customer support issues (Farzana payment verification, Habibur refund threat).
- **Recent Enquiries Table**: One-click inspection of original message and AI draft reply.

### Screen 2: Enquiry Inbox (`/enquiries`)
- Complete table of all 20 records.
- Multi-criteria filtering by Channel, Language (Bangla, Banglish, English, Mixed), Category, Priority, and Processing Status.
- Instant search across sender name, phone number, and message text.
- Full preservation of original messages (never overwritten by summaries).
- Manual Inbound modal for logging walk-ins, phone calls, or external leads.

### Screen 3: AI Intake Studio (`/ai-intake`) — Core Feature
- **Input Studio (Left)**: Message input, channel selector, optional contact info, received time, internal notes, and one-click quick presets for sample scenarios.
- **AI Extraction Card (Right)**:
  - Confidence rating badge
  - Extracted Name & Phone (with null safety)
  - Category & Programme Interest dropdowns
  - Detected language tag with language override option
  - Sentiment & Priority selectors
  - Extracted key facts bullet list
  - Human review alert banner for sensitive categories
- **Suggested Reply Studio**:
  - Culturally appropriate reply matching Bengali script, Banglish, or English
  - Copy Reply to Clipboard with visual feedback
  - Regenerate button
  - Editable reply box before saving

### Screen 4: 5-Stage Sales Pipeline Kanban (`/pipeline`)
- Stages: `New` -> `Contacted` -> `Interested` -> `Paid` -> `Lost`.
- Drag-and-drop card movement powered by `@hello-pangea/dnd`.
- Quick stage selector dropdown directly on cards.
- Cards show contact name, company (for corporate leads), programme badge, last interaction time, and 48-hour overdue indicator.
- Clicking any card opens the **Lead Detail Modal** displaying:
  - Contact information
  - Full timeline of all linked enquiries (e.g. Rafi Ahmed's message 1 & message 2 side-by-side)
  - Complete activity audit trail
  - Strategy notes editor
  - One-click follow-up task creator

### Screen 5: Follow-ups & 48-Hour SLA Monitor (`/followups`)
- Automatic SLA monitoring: Flags leads where elapsed time exceeds 48 hours without contact.
- Filter by All, Overdue, Pending, and Completed.
- One-click task completion with audit logging.
- Schedule custom callback tasks linked to leads.

---

## 5. Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide icons, React Router v6
- **Charts**: Recharts
- **Kanban Interactions**: `@hello-pangea/dnd`
- **Validation**: Zod (strict schema enforcement on all AI outputs)
- **CSV & Date Handling**: PapaParse (BOM handling & quoting), Date-fns (Dhaka timezone)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Automation & AI**:
  - Cloudflare Pages Functions (`functions/api/ai/process-enquiry.ts`)
  - Google Gemini 1.5 Flash API (low-latency, inexpensive, JSON mode)
  - Self-hosted n8n Community Edition (`n8n/workflows/`)

---

## 6. Local Setup & Quick Start

### Prerequisites
- Node.js `v18+` or `v20+` (tested on Node v26)
- npm `v9+`

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd biai-leadflow
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
By default, `VITE_DEMO_MODE=true` is enabled. The application will start immediately with the 20 preclassified sample records persisted in browser storage.

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Run Automated Test Suite
```bash
npm run test
```
All 19 unit and integration tests will execute, verifying CSV parsing, phone deduplication, language detection, safety guardrails, and 48-hour SLA calculation.

### 5. Build for Production
```bash
npm run build
```
Creates an optimized production bundle in `dist/`.

---

## 7. Connecting Cloud Infrastructure

### Supabase Setup
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the SQL Editor and run the migration in `supabase/migrations/20261102000000_initial_schema.sql`.
3. In your `.env`:
   ```env
   VITE_DEMO_MODE=false
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### Vercel Deployment (Recommended)
1. Push your latest changes to GitHub:
   ```bash
   git add .
   git commit -m "feat: vercel deployment config"
   git push origin master
   ```
2. Log in to [Vercel](https://vercel.com) and click **"Add New Project"** -> **"Import Git Repository"** -> select `BIAI-LeadFlow`.
3. Vercel automatically detects the **Vite** framework preset:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**, add:
   - `VITE_DEMO_MODE`: `true` (or `false` if using live Supabase)
   - `VITE_SUPABASE_URL`: (Optional, your Supabase project URL)
   - `VITE_SUPABASE_ANON_KEY`: (Optional, your Supabase anon public key)
   - `GEMINI_API_KEY`: (Optional, for backend Gemini 1.5 Flash processing)
   - `GEMINI_MODEL`: `gemini-1.5-flash`
   - `N8N_WEBHOOK_URL` & `N8N_SHARED_SECRET`: (Optional, if forwarding to n8n)
5. Click **Deploy**. Vercel will build the SPA and deploy the serverless Edge function at `/api/ai/process-enquiry`.

### Cloudflare Pages Deployment
1. Connect your GitHub repository to Cloudflare Pages.
2. Build settings:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Add Environment Variables in Cloudflare Pages dashboard:
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `GEMINI_MODEL`: `gemini-1.5-flash`
   - (Optional) `N8N_WEBHOOK_URL` & `N8N_SHARED_SECRET`

### n8n Workflows Setup
Two pre-configured workflows are located in `n8n/workflows/`:
1. `n8n/workflows/ai-enquiry-processor.json`:
   - Inbound webhook -> Input validation -> Gemini Flash prompt calling -> Zod schema validation -> Return structured JSON.
2. `n8n/workflows/follow-up-reminders.json`:
   - Hourly schedule trigger -> Query leads with `last_interaction_at > 48h` -> Create overdue follow-up tasks avoiding duplicates.
- Import both JSON files into your self-hosted n8n instance and activate them.

---

## 8. Original Sample Data Notice

All people and phone numbers in this assessment are fictional. There are 20 enquiries in Bangla, Banglish, and English from WhatsApp, Facebook, the website, and phone call notes. The CRM intelligently classifies genuine sales enquiries versus support issues, refund disputes, spam, and job seekers.
