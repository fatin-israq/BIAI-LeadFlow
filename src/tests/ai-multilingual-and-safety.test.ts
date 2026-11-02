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
});
