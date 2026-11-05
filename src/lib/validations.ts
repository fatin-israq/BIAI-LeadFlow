import { z } from 'zod';

export const detectedLanguageSchema = z.preprocess((val) => {
  if (typeof val !== 'string') return val;
  const s = val.toLowerCase().trim();
  if (s.includes('bangla') || s.includes('bengali') || s === 'bn') return 'bangla';
  if (s.includes('banglish')) return 'banglish';
  if (s.includes('mixed')) return 'mixed';
  if (s.includes('english') || s === 'en') return 'english';
  return s;
}, z.enum(['bangla', 'banglish', 'english', 'mixed']));

export const enquiryCategorySchema = z.preprocess((val) => {
  if (typeof val !== 'string') return val;
  const s = val.toLowerCase().trim().replace(/[-\s]+/g, '_');
  if (s.includes('sales') || s.includes('admission') || s.includes('pricing') || s.includes('course_fee') || s.includes('enroll')) return 'sales_enquiry';
  if (s.includes('programme') || s.includes('program') || s.includes('syllabus')) return 'programme_info';
  if (s.includes('corporate') || s.includes('enterprise') || s.includes('b2b') || s.includes('company_training')) return 'corporate_training';
  if (s.includes('payment') || s.includes('bkash') || s.includes('nagad') || s.includes('transaction')) return 'payment_support';
  if (s.includes('refund') || s.includes('cancel')) return 'refund_cancellation';
  if (s.includes('job') || s.includes('intern') || s.includes('career') || s.includes('resume') || s.includes('cv')) return 'job_application';
  if (s.includes('spam') || s.includes('scam') || s.includes('crypto')) return 'spam';
  if (s.includes('support') || s.includes('general')) return 'general_support';
  return s;
}, z.enum([
  'sales_enquiry',
  'programme_info',
  'corporate_training',
  'payment_support',
  'refund_cancellation',
  'general_support',
  'job_application',
  'spam',
  'other',
]));

export const programmeInterestSchema = z.preprocess((val) => {
  if (typeof val !== 'string') return val;
  const s = val.toLowerCase().trim().replace(/[-\s]+/g, '_');
  if (s.includes('bootcamp')) return 'bootcamp';
  if (s.includes('fellowship')) return 'fellowship';
  if (s.includes('corporate')) return 'corporate_training';
  if (s.includes('unknown') || s.includes('none') || s.includes('unspecified')) return 'unknown';
  return s;
}, z.enum([
  'bootcamp',
  'fellowship',
  'corporate_training',
  'unknown',
]));

export const priorityLevelSchema = z.preprocess((val) => {
  if (typeof val === 'string') return val.toLowerCase().trim();
  return val;
}, z.enum(['low', 'medium', 'high']));

export const sentimentTypeSchema = z.preprocess((val) => {
  if (typeof val === 'string') return val.toLowerCase().trim();
  return val;
}, z.enum(['positive', 'neutral', 'negative']));

export const sourceChannelSchema = z.enum([
  'WhatsApp',
  'Facebook Messenger',
  'Facebook comment',
  'Website form',
  'Phone call note',
]);

export const aiExtractionSchema = z.object({
  sender_name: z.string().nullable().catch(null),
  phone: z.string().nullable().catch(null),
  language: detectedLanguageSchema.catch('english'),
  category: enquiryCategorySchema.catch('other'),
  programme_interest: programmeInterestSchema.catch('unknown'),
  intent: z.string().min(1, 'Intent description is required'),
  priority: priorityLevelSchema.catch('medium'),
  sentiment: sentimentTypeSchema.catch('neutral'),
  confidence: z.number().min(0).max(1).catch(0.85),
  key_details: z
    .preprocess((val) => {
      if (Array.isArray(val)) return val.map((v) => (typeof v === 'string' ? v : JSON.stringify(v)));
      if (val && typeof val === 'object') {
        return Object.entries(val).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
      }
      if (typeof val === 'string') return [val];
      return [];
    }, z.array(z.string()))
    .catch([]),
  requested_follow_up: z
    .preprocess((val) => {
      if (typeof val === 'boolean') return val ? 'Follow-up requested' : null;
      return val;
    }, z.string().nullable())
    .catch(null),
  requires_human_review: z.boolean().catch(false),
  review_reason: z.string().nullable().optional().catch(null),
  suggested_reply: z.string().min(1, 'Suggested reply is required'),
  is_mock: z.boolean().optional().catch(false),
});

export const intakeInputSchema = z.object({
  message: z.string().min(3, 'Message must be at least 3 characters long'),
  channel: sourceChannelSchema,
  sender_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  received_at: z.string().optional(),
  internal_notes: z.string().optional().nullable(),
});

export type IntakeInput = z.infer<typeof intakeInputSchema>;
export type ValidatedAIExtraction = z.infer<typeof aiExtractionSchema>;

export const aiWeeklySummarySchema = z.object({
  headline: z.string().catch('BIAI Weekly Inbound Intelligence & Pipeline Brief'),
  period: z.string().catch('Current Weekly Cycle'),
  executive_summary: z.string(),
  highlights: z.array(z.string()).catch([]),
  corporate_pipeline: z.object({
    total_potential_seats: z.number().catch(0),
    deals: z.array(
      z.object({
        name: z.string(),
        company: z.string(),
        seats: z.number(),
        priority: z.string(),
      })
    ).catch([]),
  }),
  critical_attention_items: z.array(z.string()).catch([]),
  action_plan: z.array(z.string()).catch([]),
  generated_at: z.string().catch(() => new Date().toISOString()),
  is_mock: z.boolean().optional().catch(false),
});

export type ValidatedAIWeeklySummary = z.infer<typeof aiWeeklySummarySchema>;


