import { describe, it, expect } from 'vitest';
import { simulateAIExtraction } from '../services/aiService';
import { aiExtractionSchema } from '../lib/validations';

describe('AI Multilingual Intelligence & Factual Safety Guardrails', () => {
  it('detects Bengali script and generates courteous Bengali reply (Tahmina Record 2)', () => {
    const result = simulateAIExtraction({
      message: 'ফেলোশিপ প্রোগ্রামে ভর্তি হতে চাই। কবে শুরু হবে?',
      channel: 'Facebook Messenger',
      sender_name: 'Tahmina Akter',
      phone: null,
    });

    expect(result.language).toBe('bangla');
    expect(result.programme_interest).toBe('fellowship');
    expect(result.category).toBe('sales_enquiry');

    // Reply must be in Bengali script
    expect(/[\u0980-\u09FF]/.test(result.suggested_reply)).toBe(true);
    expect(result.suggested_reply).toContain('আসসালামু আলাইকুম');
  });

  it('detects Banglish and replies in natural Banglish (Rafi Record 1)', () => {
    const result = simulateAIExtraction({
      message: 'Assalamualaikum, apnader 3 day bootcamp er price koto? Payment kibhabe korbo?',
      channel: 'WhatsApp',
      sender_name: 'Rafi Ahmed',
      phone: '01711000001',
    });

    expect(result.language).toBe('banglish');
    expect(result.programme_interest).toBe('bootcamp');
    expect(result.category).toBe('sales_enquiry');

    // Reply must contain friendly Banglish greetings
    expect(result.suggested_reply.toLowerCase()).toContain('assalamu alaikum');
  });

  it('detects English and replies in professional English (Mahmud Record 3)', () => {
    const result = simulateAIExtraction({
      message: 'I run a 40-person textile company in Gazipur. We want AI training for our team. Can someone call me this week?',
      channel: 'Website form',
      sender_name: 'Mahmud Hasan',
      phone: '01711000003',
    });

    expect(result.language).toBe('english');
    expect(result.programme_interest).toBe('corporate_training');
    expect(result.category).toBe('corporate_training');
    expect(result.priority).toBe('high');
    expect(result.suggested_reply).toContain('corporate AI training');
  });

  it('safely handles employment questions without promising jobs (Record 6 Ishtiaq)', () => {
    const result = simulateAIExtraction({
      message: 'Ei course korle job pabo?',
      channel: 'Facebook comment',
      sender_name: 'Ishtiaq',
      phone: null,
    });

    expect(result.suggested_reply.toLowerCase()).not.toContain('100% job');
    expect(result.suggested_reply.toLowerCase()).not.toContain('job guaranteed');
  });

  it('safely escalates angry cancellation threat (Habibur Record 16)', () => {
    const result = simulateAIExtraction({
      message: 'Caller wants to cancel his enrolment and get his money back. Very upset. Said he will post about it on Facebook if not solved today.',
      channel: 'Phone call note',
      sender_name: 'Habibur Rahman',
      phone: '01711000015',
    });

    expect(result.category).toBe('refund_cancellation');
    expect(result.priority).toBe('high');
    expect(result.sentiment).toBe('negative');
    expect(result.requires_human_review).toBe(true);
    expect(result.review_reason).toBeDefined();
  });

  it('validates strictly against Zod extraction schema', () => {
    const mockOutput = {
      sender_name: 'Rafi Ahmed',
      phone: '01711000001',
      language: 'banglish',
      category: 'sales_enquiry',
      programme_interest: 'bootcamp',
      intent: 'Inquiring about price',
      priority: 'medium',
      sentiment: 'neutral',
      confidence: 0.95,
      key_details: ['3-day bootcamp', 'pricing'],
      requested_follow_up: null,
      requires_human_review: false,
      suggested_reply: 'Walaikum assalam Rafi!',
    };

    const parsed = aiExtractionSchema.safeParse(mockOutput);
    expect(parsed.success).toBe(true);

    // Test rejection or catch behavior for bad enum
    const badOutput = {
      ...mockOutput,
      category: 'INVALID_CATEGORY_NAME',
    };
    const parsedBad = aiExtractionSchema.parse(badOutput);
    // Catches to 'other' safely
    expect(parsedBad.category).toBe('other');
  });

  it('generates an executive weekly summary synthesizing inbound metrics and corporate leads', async () => {
    const { generateAIWeeklySummary } = await import('../services/aiService');
    const { processSampleData } = await import('../services/dataImportService');

    const sample = processSampleData();
    const mockMetrics = {
      totalEnquiries: sample.enquiries.length,
      genuineSalesLeads: sample.leads.length,
      leadsByStatus: { New: 14, Contacted: 0, Interested: 0, Paid: 0, Lost: 0 },
      followUpsOverdue: 14,
      followUpsPending: 14,
      enquiriesBySource: [{ name: 'WhatsApp', count: 8 }],
      enquiriesByProgramme: [{ name: 'Bootcamp', count: 5 }],
      enquiriesByCategory: [{ name: 'sales_enquiry', count: 6 }],
      volumeOverTime: [],
      urgentSupportCount: 2,
    };

    const summary = await generateAIWeeklySummary(sample.enquiries, sample.leads, mockMetrics);
    expect(summary.headline).toContain('Weekly');
    expect(summary.corporate_pipeline.total_potential_seats).toBe(175);
    expect(summary.action_plan.length).toBeGreaterThan(0);
    expect(summary.critical_attention_items.length).toBeGreaterThan(0);
  });

  it('dynamically adapts seats, corporate deals, and escalations when database records change', async () => {
    const { generateAIWeeklySummary } = await import('../services/aiService');

    const customEnquiries: any[] = [
      {
        id: 'enq_custom_1',
        sender_name: 'Tanvir Hossain',
        phone: '01700112233',
        source_channel: 'Website form',
        original_message: 'We want to train a team of 65 engineers in generative AI for Beximco Tech.',
        received_at: new Date().toISOString(),
        detected_language: 'english',
        category: 'corporate_training',
        programme_interest: 'corporate_training',
        priority: 'high',
        sentiment: 'positive',
        ai_confidence: 0.98,
        ai_suggested_reply: 'Thank you Tanvir...',
        ai_key_details: ['65 engineers', 'Beximco Tech'],
        requires_human_review: false,
        handling_status: 'processed',
        internal_notes: 'Beximco Tech corporate inquiry',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'enq_custom_2',
        sender_name: 'Nusrat Jahan',
        phone: '01800112233',
        source_channel: 'WhatsApp',
        original_message: 'Amar bkash payment deduct hoyeche kintu batch confirm hoy nai, please help',
        received_at: new Date().toISOString(),
        detected_language: 'banglish',
        category: 'payment_support',
        programme_interest: 'bootcamp',
        priority: 'high',
        sentiment: 'neutral',
        ai_confidence: 0.95,
        ai_suggested_reply: 'Checking...',
        ai_key_details: ['bKash payment issue'],
        requires_human_review: true,
        handling_status: 'unprocessed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const customLeads: any[] = [
      {
        id: 'lead_custom_1',
        contact_name: 'Tanvir Hossain',
        phone: '01700112233',
        normalized_phone: '+8801700112233',
        company_name: 'Beximco Tech',
        source_channel: 'Website form',
        programme_interest: 'corporate_training',
        pipeline_status: 'New',
        priority: 'high',
        notes: '65 seats enterprise cohort',
        enquiry_ids: ['enq_custom_1'],
        last_interaction_at: new Date().toISOString(),
        last_contacted_at: null,
        next_follow_up_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const mockMetrics = {
      totalEnquiries: 2,
      genuineSalesLeads: 1,
      leadsByStatus: { New: 1, Contacted: 0, Interested: 0, Paid: 0, Lost: 0 },
      followUpsOverdue: 0,
      followUpsPending: 1,
      enquiriesBySource: [{ name: 'Website form', count: 1 }, { name: 'WhatsApp', count: 1 }],
      enquiriesByProgramme: [{ name: 'corporate_training', count: 1 }],
      enquiriesByCategory: [{ name: 'corporate_training', count: 1 }],
      volumeOverTime: [],
      urgentSupportCount: 1,
    };

    const summary = await generateAIWeeklySummary(customEnquiries, customLeads, mockMetrics);
    expect(summary.corporate_pipeline.total_potential_seats).toBe(65);
    expect(summary.corporate_pipeline.deals[0].name).toBe('Tanvir Hossain');
    expect(summary.corporate_pipeline.deals[0].company).toBe('Beximco Tech');
    expect(summary.critical_attention_items.some((item) => item.includes('Nusrat Jahan'))).toBe(true);
    expect(summary.action_plan.some((act) => act.includes('Tanvir Hossain'))).toBe(true);
    expect(summary.action_plan.some((act) => act.includes('Nusrat Jahan'))).toBe(true);
  });
});

