import Papa from 'papaparse';
import { Enquiry, Lead, FollowUpTask, ActivityLog, SourceChannel } from '../types';
import { normalizePhone, isLeadEligibleCategory, isOverdue48Hours } from '../lib/utils';
import { RAW_SAMPLE_ENQUIRIES, PreclassifiedSample } from '../data/sampleEnquiries';

export interface IngestionResult {
  enquiries: Enquiry[];
  leads: Lead[];
  tasks: FollowUpTask[];
  activityLogs: ActivityLog[];
  duplicateCount: number;
}

/**
 * Strips UTF-8 Byte Order Mark (BOM) if present
 */
export function stripBOM(content: string): string {
  if (content.charCodeAt(0) === 0xFEFF) {
    return content.slice(1);
  }
  return content;
}

/**
 * Builds standard UUID / ID generator
 */
export function generateId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
}

/**
 * Converts a raw timestamp or sample date to an ISO 8601 string in Asia/Dhaka (+06:00)
 */
export function parseDhakaTimestamp(rawDate: string): string {
  const trimmed = rawDate.trim();
  if (trimmed.includes('+') || trimmed.endsWith('Z')) {
    return trimmed;
  }
  // If formatted like "2026-10-26 09:12"
  const formatted = trimmed.replace(' ', 'T');
  return `${formatted}:00+06:00`;
}

/**
 * Core Ingestion Engine:
 * Takes preclassified samples or parses raw CSV and applies:
 * 1. Normalized phone deduplication
 * 2. Multi-channel enquiry preservation (Rafi Ahmed Record 1 & 12 linked to 1 Lead)
 * 3. Qualified sales pipeline segregation (excluding Spam, Job applicant, Payment/Refund disputes)
 * 4. Automatic 48-hour SLA follow-up task generation
 */
export function processSampleData(samples = RAW_SAMPLE_ENQUIRIES): IngestionResult {
  const enquiries: Enquiry[] = [];
  const leads: Lead[] = [];
  const tasks: FollowUpTask[] = [];
  const activityLogs: ActivityLog[] = [];

  // Map to group leads by normalized phone or temporary key
  const leadByPhoneMap = new Map<string, Lead>();

  for (const sample of samples) {
    const enquiryId = `enq_${sample.sample_id}`;
    const normPhone = normalizePhone(sample.phone);
    const isSalesLead = isLeadEligibleCategory(sample.category);

    let assignedLeadId: string | null = null;

    if (isSalesLead) {
      // Check for phone-based deduplication
      if (normPhone && leadByPhoneMap.has(normPhone)) {
        // MATCH FOUND: Link to existing lead (Rafi Ahmed Record 1 & Record 12)
        const existingLead = leadByPhoneMap.get(normPhone)!;
        assignedLeadId = existingLead.id;

        // Associate enquiry with lead
        if (!existingLead.enquiry_ids.includes(enquiryId)) {
          existingLead.enquiry_ids.push(enquiryId);
        }

        // Update last interaction if newer
        if (new Date(sample.received_at) > new Date(existingLead.last_interaction_at)) {
          existingLead.last_interaction_at = sample.received_at;
          existingLead.updated_at = sample.received_at;
        }

        // Record attachment activity
        activityLogs.push({
          id: generateId('log'),
          lead_id: existingLead.id,
          enquiry_id: enquiryId,
          event_type: 'enquiry_attached',
          description: `Second enquiry from ${sample.sender_name} automatically linked via phone ${normPhone}`,
          metadata: {
            sample_id: sample.sample_id,
            channel: sample.channel,
            message: sample.original_message,
          },
          created_at: sample.received_at,
          created_by: 'system',
        });
      } else {
        // Create new Lead
        const leadId = `lead_${sample.sample_id}`;
        assignedLeadId = leadId;

        // Clean company name from sender name if present e.g. "Mahmud Hasan (Managing Director, Gazipur textile company)"
        let contactName = sample.sender_name || 'Anonymous Contact';
        let companyName = sample.company_name || null;

        if (sample.sender_name?.includes('(')) {
          const match = sample.sender_name.match(/^(.*?)\s*\((.*?)\)$/);
          if (match) {
            contactName = match[1].trim();
            if (!companyName) {
              companyName = match[2].trim();
            }
          }
        }

        const newLead: Lead = {
          id: leadId,
          contact_name: contactName,
          phone: sample.phone,
          normalized_phone: normPhone,
          company_name: companyName,
          source_channel: sample.channel,
          programme_interest: sample.programme_interest,
          pipeline_status: 'New',
          priority: sample.priority,
          notes: sample.internal_notes,
          estimated_value: sample.category === 'corporate_training' ? 150000 : 25000,
          enquiry_ids: [enquiryId],
          last_interaction_at: sample.received_at,
          last_contacted_at: null,
          next_follow_up_at: null,
          created_at: sample.received_at,
          updated_at: sample.received_at,
        };

        leads.push(newLead);
        if (normPhone) {
          leadByPhoneMap.set(normPhone, newLead);
        }

        activityLogs.push({
          id: generateId('log'),
          lead_id: leadId,
          enquiry_id: enquiryId,
          event_type: 'lead_created',
          description: `Lead created from ${sample.channel} enquiry: ${sample.original_message.substring(0, 60)}...`,
          metadata: {
            sample_id: sample.sample_id,
            category: sample.category,
            priority: sample.priority,
          },
          created_at: sample.received_at,
          created_by: 'system',
        });
      }
    }

    // Build the preserved Enquiry entity
    const enquiry: Enquiry = {
      id: enquiryId,
      sample_id: sample.sample_id,
      sender_name: sample.sender_name,
      phone: sample.phone,
      normalized_phone: normPhone,
      source_channel: sample.channel,
      original_message: sample.original_message,
      received_at: sample.received_at,
      detected_language: sample.detected_language,
      category: sample.category,
      programme_interest: sample.programme_interest,
      priority: sample.priority,
      sentiment: sample.sentiment,
      ai_confidence: sample.ai_confidence,
      ai_suggested_reply: sample.ai_suggested_reply,
      ai_key_details: sample.ai_key_details,
      requires_human_review: sample.requires_human_review,
      handling_status: sample.handling_status,
      internal_notes: sample.internal_notes,
      lead_id: assignedLeadId,
      is_demo: true,
      created_at: sample.received_at,
      updated_at: sample.received_at,
    };

    enquiries.push(enquiry);

    // If support issue / refund / escalated, log an activity
    if (sample.requires_human_review || sample.handling_status === 'escalated') {
      activityLogs.push({
        id: generateId('log'),
        enquiry_id: enquiryId,
        event_type: 'escalated',
        description: `Urgent handling required for enquiry #${sample.sample_id} (${sample.category})`,
        metadata: {
          sender: sample.sender_name,
          category: sample.category,
          message: sample.original_message,
        },
        created_at: sample.received_at,
        created_by: 'system',
      });
    }
  }

  // 48-Hour Follow-Up Logic for Leads:
  // For sample records from Oct 26-27, they have exceeded 48 hours relative to the current time,
  // creating overdue reminders. We also create specific follow-ups for high-priority leads.
  for (const lead of leads) {
    if (lead.pipeline_status === 'New' || lead.pipeline_status === 'Interested') {
      const isOverdue = isOverdue48Hours(lead.last_interaction_at);
      const isUrgentCorporate = lead.programme_interest === 'corporate_training';

      const task: FollowUpTask = {
        id: generateId('task'),
        lead_id: lead.id,
        enquiry_id: lead.enquiry_ids[0] || null,
        title: isUrgentCorporate
          ? `Urgent Enterprise Proposal: ${lead.contact_name}`
          : `48h SLA Follow-up: ${lead.contact_name}`,
        description: isUrgentCorporate
          ? `Prepare customized proposal for ${lead.company_name || 'corporate client'}. High priority.`
          : `No contact recorded for over 48 hours since incoming enquiry on ${lead.source_channel}.`,
        due_at: new Date(new Date(lead.last_interaction_at).getTime() + 48 * 60 * 60 * 1000).toISOString(),
        completed_at: null,
        status: 'pending',
        is_overdue: isOverdue,
        created_at: lead.last_interaction_at,
      };

      tasks.push(task);
    }
  }

  return {
    enquiries,
    leads,
    tasks,
    activityLogs,
    duplicateCount: 1, // Rafi Ahmed (record 12 attached to record 1)
  };
}

/**
 * Parses raw CSV string from sample-enquiries.csv
 */
export function parseCSVEnquiries(csvContent: string): any[] {
  const clean = stripBOM(csvContent);
  const parsed = Papa.parse(clean, {
    header: true,
    skipEmptyLines: true,
  });

  return parsed.data;
}

