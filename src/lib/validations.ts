import { z } from 'zod';

export const detectedLanguageSchema = z.enum(['bangla', 'banglish', 'english', 'mixed']);

export const enquiryCategorySchema = z.enum([
  'sales_enquiry',
  'programme_info',
  'corporate_training',
  'payment_support',
  'refund_cancellation',
  'general_support',
  'job_application',
  'spam',
  'other',
]);

export const programmeInterestSchema = z.enum([
  'bootcamp',
  'fellowship',
  'corporate_training',
  'unknown',
]);

export const priorityLevelSchema = z.enum(['low', 'medium', 'high']);

export const sentimentTypeSchema = z.enum(['positive', 'neutral', 'negative']);

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
  key_details: z.array(z.string()).catch([]),
  requested_follow_up: z.string().nullable().catch(null),
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


