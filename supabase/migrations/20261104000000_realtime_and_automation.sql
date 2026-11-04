-- ==============================================================================
-- BIAI LeadFlow: Production Realtime & Automation Migration
-- Enables PostgreSQL Realtime Publications, RLS, and Inbound Pipeline Automation
-- ==============================================================================

-- 1. Enable Realtime Replication for All Core Tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.enquiries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_up_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;

-- Set Full Replica Identity to guarantee old + new row access in Realtime payloads
ALTER TABLE public.enquiries REPLICA IDENTITY FULL;
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.follow_up_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.activity_logs REPLICA IDENTITY FULL;

-- 2. Add is_overdue column to follow_up_tasks if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='follow_up_tasks' AND column_name='is_overdue'
    ) THEN
        ALTER TABLE public.follow_up_tasks ADD COLUMN is_overdue BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 3. Row Level Security (RLS) Policies
-- Allow public anon API access (with publishable key) alongside authenticated users
CREATE POLICY "Allow anon read leads" ON public.leads FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert leads" ON public.leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update leads" ON public.leads FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read enquiries" ON public.enquiries FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert enquiries" ON public.enquiries FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update enquiries" ON public.enquiries FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read tasks" ON public.follow_up_tasks FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert tasks" ON public.follow_up_tasks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update tasks" ON public.follow_up_tasks FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read logs" ON public.activity_logs FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert logs" ON public.activity_logs FOR INSERT TO anon WITH CHECK (true);

-- 4. Automated Database-Level Lead Linker & 48-Hour SLA Task Scheduler
-- Splitting into BEFORE INSERT (for lead attachment & normalization)
-- and AFTER INSERT (for task & log creation to satisfy Foreign Key constraints).

DROP TRIGGER IF EXISTS trigger_auto_inbound_enquiry ON public.enquiries;
DROP TRIGGER IF EXISTS trigger_auto_inbound_enquiry_before ON public.enquiries;
DROP TRIGGER IF EXISTS trigger_auto_inbound_enquiry_after ON public.enquiries;

CREATE OR REPLACE FUNCTION public.handle_inbound_enquiry_before()
RETURNS TRIGGER AS $$
DECLARE
    target_lead_id UUID;
    norm_phone TEXT;
BEGIN
    -- Ensure UUID exists
    IF NEW.id IS NULL THEN
        NEW.id := uuid_generate_v4();
    END IF;

    -- A. Auto-normalize Bangladeshi mobile numbers
    IF NEW.phone IS NOT NULL AND (NEW.normalized_phone IS NULL OR NEW.normalized_phone = '') THEN
        norm_phone := regexp_replace(NEW.phone, '[^\d]', '', 'g');
        IF norm_phone LIKE '8801%' THEN
            norm_phone := substring(norm_phone from 3);
        END IF;
        NEW.normalized_phone := norm_phone;
    ELSE
        norm_phone := NEW.normalized_phone;
    END IF;

    -- B. Lead Eligibility Check (Sales, Corporate Training, Programme Info)
    IF NEW.category IN ('sales_enquiry', 'corporate_training', 'programme_info') AND NEW.lead_id IS NULL THEN
        -- Check if lead with matching normalized phone already exists
        IF norm_phone IS NOT NULL AND length(norm_phone) >= 10 THEN
            SELECT id INTO target_lead_id 
            FROM public.leads 
            WHERE normalized_phone = norm_phone 
            ORDER BY created_at DESC 
            LIMIT 1;
        END IF;

        IF target_lead_id IS NOT NULL THEN
            -- Link to existing lead
            UPDATE public.leads
            SET enquiry_ids = array_append(enquiry_ids, NEW.id::text),
                last_interaction_at = NEW.received_at,
                updated_at = NOW()
            WHERE id = target_lead_id;

            NEW.lead_id := target_lead_id;
        ELSE
            -- Create new Lead record
            INSERT INTO public.leads (
                contact_name,
                phone,
                normalized_phone,
                company_name,
                source_channel,
                programme_interest,
                pipeline_status,
                priority,
                notes,
                estimated_value,
                enquiry_ids,
                last_interaction_at,
                created_at,
                updated_at
            ) VALUES (
                COALESCE(NEW.sender_name, 'Anonymous Contact'),
                NEW.phone,
                norm_phone,
                NULL,
                NEW.source_channel,
                COALESCE(NEW.programme_interest, 'unknown'),
                'New',
                COALESCE(NEW.priority, 'medium'),
                NEW.internal_notes,
                CASE WHEN NEW.category = 'corporate_training' THEN 150000 ELSE 25000 END,
                ARRAY[NEW.id::text],
                NEW.received_at,
                NOW(),
                NOW()
            ) RETURNING id INTO target_lead_id;

            NEW.lead_id := target_lead_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_inbound_enquiry_before
BEFORE INSERT ON public.enquiries
FOR EACH ROW
EXECUTE FUNCTION public.handle_inbound_enquiry_before();

CREATE OR REPLACE FUNCTION public.handle_inbound_enquiry_after()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create 48h SLA task if a sales lead was attached/created
    IF NEW.lead_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.follow_up_tasks WHERE enquiry_id = NEW.id) THEN
            INSERT INTO public.follow_up_tasks (
                lead_id,
                enquiry_id,
                title,
                description,
                due_at,
                status,
                created_at
            ) VALUES (
                NEW.lead_id,
                NEW.id,
                'Initial Response SLA: ' || COALESCE(NEW.sender_name, 'Prospect'),
                'Enforce 48-hour SLA response for inbound enquiry via ' || NEW.source_channel,
                NOW() + INTERVAL '48 HOURS',
                'pending',
                NOW()
            );
        END IF;

        INSERT INTO public.activity_logs (
            lead_id, 
            enquiry_id, 
            event_type, 
            description, 
            metadata, 
            created_by
        ) VALUES (
            NEW.lead_id,
            NEW.id,
            'enquiry_received',
            'Inbound enquiry automatically attached to lead via ' || NEW.source_channel,
            jsonb_build_object('source', NEW.source_channel, 'category', NEW.category),
            'system'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_inbound_enquiry_after
AFTER INSERT ON public.enquiries
FOR EACH ROW
EXECUTE FUNCTION public.handle_inbound_enquiry_after();

-- 5. Stored Procedure for Cron Job: Check & Flag Overdue SLA Tasks
CREATE OR REPLACE FUNCTION public.check_and_mark_overdue_tasks()
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE public.follow_up_tasks
    SET is_overdue = TRUE
    WHERE status = 'pending' 
      AND due_at < NOW() 
      AND (is_overdue IS FALSE OR is_overdue IS NULL);

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

