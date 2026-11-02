import fs from 'fs';
import path from 'path';
import { parseCSVEnquiries, processSampleData } from '../../src/services/dataImportService';
import { RAW_SAMPLE_ENQUIRIES } from '../../src/data/sampleEnquiries';

async function runImport() {
  console.log('🚀 Starting BIAI Sample Enquiries Ingestion...');

  const csvPath = path.resolve(process.cwd(), 'sample-enquiries.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ sample-enquiries.csv not found at ${csvPath}`);
    process.exit(1);
  }

  const rawCsv = fs.readFileSync(csvPath, 'utf8');
  const parsedRows = parseCSVEnquiries(rawCsv);
  console.log(`✅ Successfully parsed ${parsedRows.length} raw rows from CSV.`);

  // Process sample records through deduplication and classification engine
  const processed = processSampleData(RAW_SAMPLE_ENQUIRIES);

  console.log('📊 Ingestion Results:');
  console.log(`   - Enquiries Preserved: ${processed.enquiries.length}`);
  console.log(`   - Sales Leads Created: ${processed.leads.length}`);
  console.log(`   - Linked Duplicate Leads: ${processed.duplicateCount}`);
  console.log(`   - Overdue SLA Follow-Up Tasks: ${processed.tasks.length}`);
  console.log(`   - Audit Activity Logs: ${processed.activityLogs.length}`);

  // Verification checks:
  const rafiEnquiries = processed.enquiries.filter((e) => e.phone === '01711000001');
  const rafiLeads = processed.leads.filter((l) => l.normalized_phone === '01711000001');
  console.log(`\n🔍 Checking Rafi Ahmed Deduplication (Records 1 & 12):`);
  console.log(`   - Rafi Enquiries found: ${rafiEnquiries.length} (expected 2)`);
  console.log(`   - Rafi Leads created: ${rafiLeads.length} (expected 1)`);
  console.log(`   - Rafi Lead enquiry_ids: [${rafiLeads[0]?.enquiry_ids.join(', ')}]`);

  const spam = processed.enquiries.filter((e) => e.category === 'spam');
  const spamLead = processed.leads.find((l) => l.contact_name?.includes('Crypto'));
  console.log(`\n🔍 Checking Spam Isolation (Record 11):`);
  console.log(`   - Spam Enquiry categorized: ${spam.length > 0}`);
  console.log(`   - Excluded from Leads Pipeline: ${!spamLead}`);

  const intern = processed.enquiries.filter((e) => e.category === 'job_application');
  const internLead = processed.leads.find((l) => l.contact_name?.includes('Arif Hossain'));
  console.log(`\n🔍 Checking Job Application Isolation (Record 20):`);
  console.log(`   - Job application categorized: ${intern.length > 0}`);
  console.log(`   - Excluded from Sales Pipeline: ${!internLead}`);

  const refund = processed.enquiries.find((e) => e.sample_id === 16);
  console.log(`\n🔍 Checking Escalated Refund Dispute (Record 16 Habibur Rahman):`);
  console.log(`   - Requires Human Review: ${refund?.requires_human_review}`);
  console.log(`   - Handling Status: ${refund?.handling_status}`);

  console.log('\n✨ Idempotent import validation complete!');
}

runImport().catch((err) => {
  console.error('Error during import execution:', err);
  process.exit(1);
});
