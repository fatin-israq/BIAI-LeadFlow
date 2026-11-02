# BIAI LeadFlow — 5-Minute Loom Video Walkthrough Script

> This guide provides a minute-by-minute presentation structure to help you record a crisp, confident Loom presentation for the BIAI Hiring Team.

---

## ⏱️ Video Breakdown (Target: 4:30 - 5:00 minutes)

### [0:00 - 0:45] Minute 1: The Problem & Introduction
- **What to show**: Camera or Overview Dashboard (`http://localhost:5173/`).
- **What to say**:
  > *"Hi everyone, I’m excited to present **BIAI LeadFlow**, an AI-powered multilingual CRM built specifically for BIAI's multi-channel enquiry workflow.*
  > *BIAI currently receives enquiries across WhatsApp, Facebook Messenger, Facebook comments, website forms, and phone calls. Information gets scattered, non-sales inquiries like spam or complaints clutter the inbox, and leads don't get followed up on time.*
  > *LeadFlow solves this by centralizing all enquiries, using Gemini Flash to extract structured intelligence from Bangla, Banglish, and English messages, enforcing a 5-stage sales pipeline with phone deduplication, and automating 48-hour follow-up SLAs."*

---

### [0:45 - 2:00] Minute 2: The Core Feature — AI Intake Studio
- **What to show**: Navigate to **AI Intake Studio** (`/ai-intake`).
- **Demo 1 — Banglish (Rafi Ahmed)**:
  - Click the preset `Rafi (Bootcamp Banglish)`.
  - Point out the message: *"Assalamualaikum, apnader 3 day bootcamp er price koto? Payment kibhabe korbo?"*
  - Click **Analyze with AI**.
  - Show the extracted fields: Name (`Rafi Ahmed`), Phone (`01711000001`), Language (`Banglish`), Category (`Sales Enquiry`), Programme (`Bootcamp`).
  - Highlight the suggested reply: Courteous Banglish reply matching the sender’s language style, with a one-click copy button.
- **Demo 2 — Bangla Script & Missing Phone (Tahmina Akter)**:
  - Click preset `Tahmina (Fellowship Bangla)`: *"ফেলোশিপ প্রোগ্রামে ভর্তি হতে চাই। কবে শুরু হবে?"*
  - Click **Analyze with AI**.
  - Point out: Language detected as `Bangla (বাংলা)`, suggested reply generated in Bengali script, and crucially: **phone is preserved as null without hallucinating a fake number**.
- **Demo 3 — Urgent Refund Threat (Habibur Rahman)**:
  - Click preset `Habibur (Urgent Refund Threat)`.
  - Click **Analyze with AI**.
  - Show the red **Human Review Warning Banner**: Flagged as high-priority refund dispute requiring management escalation. It does not get treated as a sales lead!

---

### [2:00 - 3:00] Minute 3: Sales Pipeline & Deduplication (Kanban Board)
- **What to show**: Navigate to **Sales Pipeline** (`/pipeline`).
- **What to say & show**:
  - Show the 5 stages: `New`, `Contacted`, `Interested`, `Paid`, `Lost`.
  - **Demonstrate Rafi Ahmed Deduplication**:
    - Click Rafi Ahmed’s card to open the **Lead Detail Modal**.
    - Point out that **both Enquiry #1 and Enquiry #12 are linked to this single lead** via exact phone match (`01711000001`). Neither message was lost or overwritten!
  - **Show Drag-and-Drop**:
    - Drag a lead from `New` to `Contacted` or `Interested`.
    - Point out that status updates persist instantly with an activity log audit.
  - **Show Non-Sales Isolation**:
    - Mention that Earn Crypto Daily (Spam, Record 11) and Arif Hossain (Intern Applicant, Record 20) are excluded from this board.

---

### [3:00 - 3:45] Minute 4: Overview Analytics & 48-Hour SLA Engine
- **What to show**: Navigate to **Overview Dashboard** (`/`) and **Follow-ups & SLA** (`/followups`).
- **What to say & show**:
  - Show the summary KPIs: Total inbound, genuine sales leads, stage counts, and overdue follow-ups.
  - Highlight the 4 Recharts: Source channel distribution, pipeline health, programme demand, and daily volume.
  - Show the **48-Hour SLA Banner**: Explaining that unattended leads exceeding 48 hours are automatically flagged so no prospective learner is forgotten.
  - Navigate to `/followups` and show how staff can mark tasks complete with a single click.

---

### [3:45 - 4:45] Minute 5: Technical Architecture & Next Steps
- **What to show**: Show code briefly (VS Code / terminal running `npm run test`).
- **What to say**:
  - Mention the stack: React 18, TypeScript, Tailwind, Recharts, Vite, Supabase PostgreSQL, and Cloudflare Pages Functions.
  - Mention that 19 automated unit & integration tests verify the deduplication, language parsing, and safety guardrails.
  - Show the exported n8n workflows (`ai-enquiry-processor.json` and `follow-up-reminders.json`).
  - Explain next steps: Adding a RAG vector database for official syllabus documents and direct Meta Graph API webhook ingestion.
  - Close with: *"Thank you! I look forward to our discussion and demonstrating the live system."*

