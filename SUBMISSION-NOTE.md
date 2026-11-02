# BIAI LeadFlow — Technical Assessment Submission Note

**Candidate Role:** AI Engineering Intern  
**Project:** BIAI LeadFlow — AI-Powered Multilingual CRM  
**Date:** November 2026  

---

### 1. What Was Built
I designed and developed **BIAI LeadFlow**, an AI-powered, multilingual CRM engineered specifically for BIAI’s multi-channel inbound pipeline (WhatsApp, Facebook Messenger, Facebook comments, Website forms, Phone call notes). 

Key capabilities include:
- **Intelligent Multilingual Intake Studio**: Reads unstructured inbound text in Bengali script (বাংলা), Banglish (Roman Bengali), and English. It uses Gemini Flash to extract structured fields (sender name, phone, category, programme interest, intent, priority, sentiment, and key facts) while enforcing strict null-safety (never inventing missing names or phone numbers).
- **Culturally Attuned Suggested Replies**: Automatically drafts polite replies in the sender's language with single-click copying, while adhering to strict factual boundaries (no hallucinated pricing, no fake refund policies, and no job guarantees).
- **5-Stage Sales Pipeline with Contact Deduplication**: A Kanban board (`New`, `Contacted`, `Interested`, `Paid`, `Lost`) with drag-and-drop state transitions. Genuine sales leads are deduplicated by normalized phone number (linking multiple messages, such as Rafi Ahmed’s Records 1 & 12, to a single lead without losing either message).
- **Non-Sales Isolation & Escalation**: Filters out spam (Record 11) and job applicants (Record 20) from sales metrics, while routing payment support (Farzana Record 7) and angry refund threats (Habibur Record 16) into high-priority human escalation.
- **48-Hour SLA Follow-Up Automation**: Automatically flags unattended leads exceeding 48 hours and provides an active follow-up task manager.
- **Dual Data Layer**: Works out-of-the-box in local demo mode via browser persistence while providing production-ready Supabase PostgreSQL migrations, Cloudflare Pages proxy functions, and exported n8n workflows.

---

### 2. AI Tools Used & How
1. **Google Gemini Flash (1.5 Flash / 2.5 Flash)**:
   - Configured via server-side Cloudflare Pages Function (`/api/ai/process-enquiry`) and n8n webhook (`n8n/workflows/ai-enquiry-processor.json`).
   - Runs with strict temperature (0.2) and JSON schema mode to guarantee deterministic output.
   - Guardrailed with prompt boundaries to prevent unauthorized commitments regarding course pricing, certificate accreditations, or career guarantees.
2. **n8n Community Edition**:
   - Built and exported two production workflows:
     - *Workflow A* (`ai-enquiry-processor.json`): Webhook trigger, input validation, Gemini processing, JSON validation, and response.
     - *Workflow B* (`follow-up-reminders.json`): Hourly cron query checking unattended leads exceeding 48 hours to create follow-up tasks without duplicates.
3. **Zod Validation Pipeline**:
   - Validates all AI outputs at runtime, guaranteeing schema compliance and graceful fallback.

---

### 3. What Does Not Work Yet / Current Limitations
- **External Channel Sending**: In accordance with the assessment brief, LeadFlow generates editable draft replies for copy-pasting. It intentionally does not send direct automated messages to WhatsApp or Facebook Messenger to prevent unauthorized messaging or API suspension.
- **Dynamic Pricing Knowledge Base**: Because BIAI currently has no public pricing knowledge base API, the AI appropriately defers pricing and refund terms to human staff rather than pulling from an integrated vector store.
- **Multi-Tenant User Workspaces**: Authentication is pre-configured for a single unified BIAI workspace; role-based multi-tenant permissions are not yet implemented.

---

### 4. What I Would Build / Fix Next
1. **RAG Knowledge Base with Vector Search**: Connect pgvector in Supabase with verified BIAI FAQ documents and syllabus PDFs, allowing the AI to answer specific curriculum questions with high factual accuracy.
2. **Official Meta Graph API & WhatsApp Cloud API Webhooks**: Directly ingest incoming WhatsApp messages and Facebook Messenger comments via verified webhooks in real time.
3. **AI Voice Note Transcription**: Add Whisper / Gemini Audio transcription for WhatsApp voice notes (common among prospective Bangladeshi students).
4. **Automated Weekly AI Management Summary**: Implement an automated weekly digest summarizing lead conversion rates, channel performance, and common customer objections.

