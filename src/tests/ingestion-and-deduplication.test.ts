import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  parseCSVEnquiries,
  processSampleData,
  stripBOM,
} from '../services/dataImportService';
import { RAW_SAMPLE_ENQUIRIES } from '../data/sampleEnquiries';
import { normalizePhone, isLeadEligibleCategory } from '../lib/utils';

describe('Sample Data Ingestion & Deduplication', () => {
  it('reads and parses all 20 rows from sample-enquiries.csv without data loss', () => {
    const csvPath = path.resolve(process.cwd(), 'sample-enquiries.csv');
    const rawContent = fs.readFileSync(csvPath, 'utf8');

    // Verify BOM handling
    const stripped = stripBOM(rawContent);
    expect(stripped.startsWith('id,channel')).toBe(true);

    const rows = parseCSVEnquiries(rawContent);
    expect(rows.length).toBe(20);

    // Verify Bengali characters in Record 2 are intact
    const row2 = rows.find((r: any) => r.id === '2');
    expect(row2.message).toContain('ফেলোশিপ');
  });

  it('preserves exactly 20 original enquiries after processing', () => {
    const processed = processSampleData(RAW_SAMPLE_ENQUIRIES);
    expect(processed.enquiries.length).toBe(20);

    // Confirm all IDs 1-20 are present
    const sampleIds = processed.enquiries.map((e) => e.sample_id);
    for (let i = 1; i <= 20; i++) {
      expect(sampleIds).toContain(i);
    }
  });

  it('correctly handles Rafi Ahmed deduplication (Records 1 & 12)', () => {
    const processed = processSampleData(RAW_SAMPLE_ENQUIRIES);

    // Both original enquiries must exist
    const rafiEnquiries = processed.enquiries.filter(
      (e) => e.phone === '01711000001'
    );
    expect(rafiEnquiries.length).toBe(2);
    expect(rafiEnquiries[0].sample_id).toBe(1);
    expect(rafiEnquiries[1].sample_id).toBe(12);

    // They must be linked to EXACTLY ONE Lead
    const rafiLeads = processed.leads.filter(
      (l) => l.normalized_phone === '01711000001'
    );
    expect(rafiLeads.length).toBe(1);

    const rafiLead = rafiLeads[0];
    expect(rafiLead.contact_name).toContain('Rafi Ahmed');
    expect(rafiLead.enquiry_ids).toContain('enq_1');
    expect(rafiLead.enquiry_ids).toContain('enq_12');

    // Both enquiries must reference this lead_id
    expect(rafiEnquiries[0].lead_id).toBe(rafiLead.id);
    expect(rafiEnquiries[1].lead_id).toBe(rafiLead.id);
  });

  it('normalizes Bangladeshi phone numbers consistently', () => {
    expect(normalizePhone('01711000001')).toBe('01711000001');
    expect(normalizePhone('+8801711000001')).toBe('01711000001');
    expect(normalizePhone('8801711000001')).toBe('01711000001');
    expect(normalizePhone('01711-000001')).toBe('01711000001');
    expect(normalizePhone('')).toBe(null);
    expect(normalizePhone(null)).toBe(null);
  });

  it('keeps missing phone numbers as null without inventing fake values (Tahmina Record 2)', () => {
    const processed = processSampleData(RAW_SAMPLE_ENQUIRIES);
    const tahmina = processed.enquiries.find((e) => e.sample_id === 2);
    expect(tahmina?.phone).toBeNull();
    expect(tahmina?.normalized_phone).toBeNull();
  });

  it('excludes Spam (Record 11) from the sales pipeline', () => {
    const processed = processSampleData(RAW_SAMPLE_ENQUIRIES);
    const spamEnquiry = processed.enquiries.find((e) => e.sample_id === 11);

    expect(spamEnquiry?.category).toBe('spam');
    expect(spamEnquiry?.handling_status).toBe('spam');
    expect(spamEnquiry?.lead_id).toBeNull();

    const spamLead = processed.leads.find((l) =>
      l.contact_name.toLowerCase().includes('crypto')
    );
    expect(spamLead).toBeUndefined();
  });

  it('excludes Job Application (Record 20 Arif Hossain) from the sales pipeline', () => {
    const processed = processSampleData(RAW_SAMPLE_ENQUIRIES);
    const arifEnquiry = processed.enquiries.find((e) => e.sample_id === 20);

    expect(arifEnquiry?.category).toBe('job_application');
    expect(arifEnquiry?.lead_id).toBeNull();

    const arifLead = processed.leads.find((l) =>
      l.contact_name.toLowerCase().includes('arif')
    );
    expect(arifLead).toBeUndefined();
  });

  it('does NOT mark Farzana (Record 7) as Paid automatically', () => {
    const processed = processSampleData(RAW_SAMPLE_ENQUIRIES);
    const farzana = processed.enquiries.find((e) => e.sample_id === 7);

    expect(farzana?.category).toBe('payment_support');
    expect(farzana?.handling_status).toBe('escalated');
    expect(farzana?.requires_human_review).toBe(true);
    expect(farzana?.lead_id).toBeNull();
  });

  it('correctly tags Corporate Training leads (Records 3, 10, 18)', () => {
    const processed = processSampleData(RAW_SAMPLE_ENQUIRIES);
    const corporateLeads = processed.leads.filter(
      (l) => l.programme_interest === 'corporate_training'
    );
    expect(corporateLeads.length).toBe(3);

    // Mahmud Hasan 40-person textile
    const mahmud = corporateLeads.find((l) => l.contact_name.includes('Mahmud'));
    expect(mahmud).toBeDefined();
    expect(mahmud?.company_name).toContain('Gazipur');

    // Kamrul Islam bank 120 employees
    const kamrul = corporateLeads.find((l) => l.contact_name.includes('Kamrul'));
    expect(kamrul).toBeDefined();

    // Rezaul Karim garment factory 15 workers
    const rezaul = corporateLeads.find((l) => l.contact_name.includes('Rezaul'));
    expect(rezaul).toBeDefined();
  });
});

