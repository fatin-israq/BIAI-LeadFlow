-- BIAI LeadFlow: Initial Database Schema Migration
-- Timezone aware (Asia/Dhaka default or UTC storage)

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_name TEXT NOT NULL,
    phone TEXT,
    normalized_phone TEXT,
    company_name TEXT,
    source_channel TEXT NOT NULL,
    programme_interest TEXT NOT NULL DEFAULT 'unknown',
    pipeline_status TEXT NOT NULL DEFAULT 'New' CHECK (pipeline_status IN ('New', 'Contacted', 'Interested', 'Paid', 'Lost')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    notes TEXT,
    estimated_value NUMERIC DEFAULT 0,
    enquiry_ids TEXT[] DEFAULT '{}',
    last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_contacted_at TIMESTAMPTZ,
    next_follow_up_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for leads
CREATE INDEX IF NOT EXISTS idx_leads_normalized_phone ON public.leads (normalized_phone);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_status ON public.leads (pipeline_status);
CREATE INDEX IF NOT EXISTS idx_leads_last_interaction ON public.leads (last_interaction_at);

-- 3. Create Enquiries Table
CREATE TABLE IF NOT EXISTS public.enquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id INTEGER UNIQUE,
    sender_name TEXT,
    phone TEXT,
    normalized_phone TEXT,
    source_channel TEXT NOT NULL,
    original_message TEXT NOT NULL,
    received_at TIMESTAMPTZ NOT NULL,
    detected_language TEXT DEFAULT 'english',
    category TEXT NOT NULL DEFAULT 'sales_enquiry',
    programme_interest TEXT DEFAULT 'unknown',
    priority TEXT NOT NULL DEFAULT 'medium',
    sentiment TEXT DEFAULT 'neutral',
    ai_confidence NUMERIC(3, 2),
    ai_suggested_reply TEXT,
    ai_key_details JSONB DEFAULT '[]'::jsonb,
    requires_human_review BOOLEAN NOT NULL DEFAULT FALSE,
    handling_status TEXT NOT NULL DEFAULT 'unprocessed',
    internal_notes TEXT,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for enquiries
CREATE INDEX IF NOT EXISTS idx_enquiries_normalized_phone ON public.enquiries (normalized_phone);
CREATE INDEX IF NOT EXISTS idx_enquiries_source_channel ON public.enquiries (source_channel);
CREATE INDEX IF NOT EXISTS idx_enquiries_category ON public.enquiries (category);
CREATE INDEX IF NOT EXISTS idx_enquiries_received_at ON public.enquiries (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_lead_id ON public.enquiries (lead_id);

-- 4. Create Follow-Up Tasks Table
CREATE TABLE IF NOT EXISTS public.follow_up_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    enquiry_id UUID REFERENCES public.enquiries(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_due_status ON public.follow_up_tasks (status, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON public.follow_up_tasks (lead_id);

-- 5. Create Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    enquiry_id UUID REFERENCES public.enquiries(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_lead ON public.activity_logs (lead_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs (created_at DESC);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Workspace Policies: Allow full read/write for authenticated users
CREATE POLICY "Allow authenticated read leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write leads" ON public.leads FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read enquiries" ON public.enquiries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write enquiries" ON public.enquiries FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read tasks" ON public.follow_up_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write tasks" ON public.follow_up_tasks FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read logs" ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write logs" ON public.activity_logs FOR ALL TO authenticated USING (true);

