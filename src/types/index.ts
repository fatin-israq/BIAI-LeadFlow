export type SourceChannel =
  | 'WhatsApp'
  | 'Facebook Messenger'
  | 'Facebook comment'
  | 'Website form'
  | 'Phone call note';

export type DetectedLanguage = 'bangla' | 'banglish' | 'english' | 'mixed';

export type EnquiryCategory =
  | 'sales_enquiry'
  | 'programme_info'
  | 'corporate_training'
  | 'payment_support'
  | 'refund_cancellation'
  | 'general_support'
  | 'job_application'
  | 'spam'
  | 'other';

export type ProgrammeInterest =
  | 'bootcamp'
  | 'fellowship'
  | 'corporate_training'
  | 'unknown';

export type PriorityLevel = 'low' | 'medium' | 'high';

export type SentimentType = 'positive' | 'neutral' | 'negative';

export type HandlingStatus =
  | 'unprocessed'
  | 'processed'
  | 'escalated'
  | 'resolved'
  | 'spam';

export type PipelineStatus = 'New' | 'Contacted' | 'Interested' | 'Paid' | 'Lost';

export interface Enquiry {
  id: string;
  sample_id?: number | null;
  sender_name: string | null;
  phone: string | null;
  normalized_phone: string | null;
  source_channel: SourceChannel;
  original_message: string;
  received_at: string; // ISO 8601 string in Asia/Dhaka time
  detected_language: DetectedLanguage;
  category: EnquiryCategory;
  programme_interest: ProgrammeInterest;
  priority: PriorityLevel;
  sentiment: SentimentType;
  ai_confidence: number | null;
  ai_suggested_reply: string | null;
  ai_key_details: string[];
  requires_human_review: boolean;
  handling_status: HandlingStatus;
  internal_notes?: string | null;
  lead_id?: string | null;
  is_demo?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  contact_name: string;
  phone: string | null;
  normalized_phone: string | null;
  company_name: string | null;
  source_channel: SourceChannel;
  programme_interest: ProgrammeInterest;
  pipeline_status: PipelineStatus;
  priority: PriorityLevel;
  notes: string | null;
  estimated_value?: number | null;
  enquiry_ids: string[];
  last_interaction_at: string;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowUpTask {
  id: string;
  lead_id: string | null;
  enquiry_id: string | null;
  title: string;
  description: string | null;
  due_at: string;
  completed_at: string | null;
  status: 'pending' | 'completed' | 'dismissed';
  created_at: string;
  created_by?: string;
  is_overdue?: boolean;
}

export interface ActivityLog {
  id: string;
  lead_id?: string | null;
  enquiry_id?: string | null;
  event_type:
    | 'lead_created'
    | 'enquiry_received'
    | 'enquiry_attached'
    | 'status_changed'
    | 'note_added'
    | 'reply_drafted'
    | 'reply_copied'
    | 'followup_created'
    | 'followup_completed'
    | 'escalated';
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
  created_by?: string;
}

export interface AIExtractionResult {
  sender_name: string | null;
  phone: string | null;
  language: DetectedLanguage;
  category: EnquiryCategory;
  programme_interest: ProgrammeInterest;
  intent: string;
  priority: PriorityLevel;
  sentiment: SentimentType;
  confidence: number;
  key_details: string[];
  requested_follow_up: string | null;
  requires_human_review: boolean;
  review_reason?: string | null;
  suggested_reply: string;
  is_mock?: boolean;
}

export interface DashboardMetrics {
  totalEnquiries: number;
  genuineSalesLeads: number;
  leadsByStatus: Record<PipelineStatus, number>;
  followUpsOverdue: number;
  followUpsPending: number;
  enquiriesBySource: { name: string; count: number }[];
  enquiriesByProgramme: { name: string; count: number }[];
  enquiriesByCategory: { name: string; count: number }[];
  volumeOverTime: { date: string; enquiries: number; leads: number }[];
  urgentSupportCount: number;
}

export interface AIWeeklySummary {
  headline: string;
  period: string;
  executive_summary: string;
  highlights: string[];
  corporate_pipeline: {
    total_potential_seats: number;
    deals: { name: string; company: string; seats: number; priority: string }[];
  };
  critical_attention_items: string[];
  action_plan: string[];
  generated_at: string;
  is_mock?: boolean;
}


