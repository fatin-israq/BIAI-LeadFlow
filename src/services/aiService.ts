import {
  AIExtractionResult,
  DetectedLanguage,
  EnquiryCategory,
  ProgrammeInterest,
  PriorityLevel,
  SentimentType,
  Enquiry,
  Lead,
  AIWeeklySummary,
  DashboardMetrics,
} from '../types';
import { aiExtractionSchema, aiWeeklySummarySchema, IntakeInput } from '../lib/validations';
import { isOverdue48Hours } from '../lib/utils';

export const AI_SYSTEM_PROMPT = `
You are the AI Enquiry Extraction and Response Assistant for BIAI (Bangladesh Institute of Artificial Intelligence).
Your mission is to read inbound messages across WhatsApp, Facebook, Website, and Phone notes in Bengali script, Banglish (Roman Bengali), or English, and output structured, strictly validated JSON.

CORE EXTRACTION RULES:
1. SENDER IDENTITY & CONTACT:
   - Extract sender name ONLY if explicitly mentioned in the message text. If missing, return null.
   - Extract phone number ONLY if digits exist in the text. If missing, return null. NEVER fabricate phone numbers.
2. MULTILINGUAL HANDLING & RESPONSE:
   - Detect language accurately: "bangla" (Bengali script), "banglish" (Romanized Bengali), "english", or "mixed".
   - Suggest a polite, professional reply MATCHING the exact language and register of the sender:
     * Bengali script -> respond in courteous Bengali script.
     * Banglish -> respond in natural, friendly Banglish.
     * English -> respond in professional English.
3. FACTUAL SAFETY & ANTI-HALLUCINATION:
   - BIAI pricing, admission schedules, refund policies, and physical class venues are determined by the team.
   - NEVER invent or commit to specific prices, refund timelines, job guarantees, or government accreditations.
   - If asked about fees, jobs, refunds, or offline locations, politely acknowledge the inquiry and state that our team will confirm the official details directly.
4. CATEGORIZATION & LEAD SEGREGATION:
   - Categories:
     * "sales_enquiry": Genuine learner seeking course details, pricing, or enrollment.
     * "programme_info": General questions about syllabus, class recordings, prerequisites.
     * "corporate_training": Companies, managing directors, HR teams seeking staff training.
     * "payment_support": Customer mentions completed transaction, bKash/Nagad issues, missing confirmation.
     * "refund_cancellation": Dissatisfied user demanding refund or course withdrawal. High priority & flag human review!
     * "general_support": Free masterclasses, school students, non-commercial assistance.
     * "job_application": CV submissions, internship seekers, career inquiries. NOT a sales lead!
     * "spam": Unsolicited crypto promotions, shady affiliate links, junk messages.
     * "other": Ambiguous messages requiring human triage.
5. PROGRAMME INTEREST:
   - Classify as "bootcamp", "fellowship", "corporate_training", or "unknown".
6. JSON OUTPUT SCHEMA:
   Return ONLY raw JSON conforming to this structure:
   {
     "sender_name": string | null,
     "phone": string | null,
     "language": "bangla" | "banglish" | "english" | "mixed",
     "category": "sales_enquiry" | "programme_info" | "corporate_training" | "payment_support" | "refund_cancellation" | "general_support" | "job_application" | "spam" | "other",
     "programme_interest": "bootcamp" | "fellowship" | "corporate_training" | "unknown",
     "intent": string,
     "priority": "low" | "medium" | "high",
     "sentiment": "positive" | "neutral" | "negative",
     "confidence": number between 0 and 1,
     "key_details": string[],
     "requested_follow_up": string | null,
     "requires_human_review": boolean,
     "review_reason": string | null,
     "suggested_reply": string
   }
`;

/**
 * Intelligent Client-side Simulation for Demo Mode / Local Fallback
 * Accurately analyzes Bangla, Banglish, and English text without fabricating information.
 */
export function simulateAIExtraction(input: IntakeInput): AIExtractionResult {
  const text = input.message.toLowerCase();
  const rawText = input.message;

  // 1. Language Detection
  const hasBengaliScript = /[\u0980-\u09FF]/.test(rawText);
  const banglishTokens = [
    'apnader', 'koto', 'kibhabe', 'korbo', 'vai', 'gula', 'hoy', 'naki', 'pawa', 'jay',
    'korle', 'pabo', 'kothay', 'hobe', 'bolen', 'shomoy', 'ekta', 'chachhen', 'somporke',
    'assalamu', 'walaikum', 'amra', 'amader', 'apnar', 'janiye', 'shuru'
  ];
  const hasBanglishWord = banglishTokens.some((token) => new RegExp(`\\b${token}\\b`, 'i').test(rawText));

  let language: DetectedLanguage = 'english';
  if (hasBengaliScript) {
    language = /[a-zA-Z]/.test(rawText) && rawText.length > 20 ? 'mixed' : 'bangla';
  } else if (hasBanglishWord) {
    language = 'banglish';
  }

  // 2. Phone Extraction from text
  const phoneMatch = rawText.match(/(?:\+?880|0)1[3-9]\d{8}/);
  const extractedPhone = phoneMatch ? phoneMatch[0] : input.phone || null;

  // 3. Name Extraction if explicitly stated
  let extractedName: string | null = input.sender_name || null;
  const nameMatchBangla = rawText.match(/আমার নাম\s+([^\s,।.]+[\s]+[^\s,।.]+)/);
  const nameMatchEnglish = rawText.match(/(?:my name is|i am|this is)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i);
  if (nameMatchBangla) extractedName = nameMatchBangla[1].trim();
  else if (nameMatchEnglish) extractedName = nameMatchEnglish[1].trim();

  // 4. Category & Programme Interest Classification
  let category: EnquiryCategory = 'sales_enquiry';
  let programmeInterest: ProgrammeInterest = 'unknown';
  let priority: PriorityLevel = 'medium';
  let sentiment: SentimentType = 'neutral';
  let requiresHumanReview = false;
  let reviewReason: string | null = null;
  const keyDetails: string[] = [];

  // Check for Spam
  if (
    text.includes('crypto') ||
    text.includes('earn 5000') ||
    text.includes('bit.ly') ||
    text.includes('click here') ||
    text.includes('usd every day')
  ) {
    category = 'spam';
    priority = 'low';
    keyDetails.push('Unsolicited promotional content / scam link detected');
  }
  // Check for Job Application
  else if (
    text.includes('intern') ||
    text.includes('looking for a job') ||
    text.includes('where do i apply') ||
    text.includes('cv') ||
    text.includes('resume') ||
    text.includes('চাকরি') ||
    text.includes('নিয়োগ')
  ) {
    category = 'job_application';
    priority = 'low';
    keyDetails.push('Inquiring about job or internship openings');
  }
  // Check for Refund / Cancellation Dispute
  else if (
    text.includes('cancel') ||
    text.includes('refund') ||
    text.includes('money back') ||
    text.includes('facebook') && text.includes('post') ||
    text.includes('টাকা ফেরত') ||
    text.includes('বাতিল')
  ) {
    category = 'refund_cancellation';
    priority = 'high';
    sentiment = 'negative';
    requiresHumanReview = true;
    reviewReason = 'Urgent customer dissatisfaction / refund dispute with risk of public escalation';
    keyDetails.push('Customer requested cancellation and refund', 'Upset tone detected; requires management intervention');
  }
  // Check for Payment Support
  else if (
    text.includes('পেমেন্ট করেছি') ||
    text.includes('বিকাশে') ||
    text.includes('bkash') ||
    text.includes('confirmation paini') ||
    text.includes('পায়নি') ||
    text.includes('payment done') ||
    text.includes('transaction')
  ) {
    category = 'payment_support';
    priority = 'high';
    sentiment = 'negative';
    requiresHumanReview = true;
    reviewReason = 'Payment verification required before updating enrollment status';
    keyDetails.push('Customer claims payment was sent via bKash/banking', 'Needs TrxID confirmation from finance');
  }
  // Check for Corporate Training
  else if (
    text.includes('textile') ||
    text.includes('company') ||
    text.includes('bank') ||
    text.includes('employees') ||
    text.includes('কর্মীদের') ||
    text.includes('কর্মী') ||
    text.includes('corporate') ||
    text.includes('team training') ||
    text.includes('কোম্পানির')
  ) {
    category = 'corporate_training';
    programmeInterest = 'corporate_training';
    priority = 'high';
    sentiment = 'positive';
    keyDetails.push('B2B workforce training inquiry', 'High-value organizational opportunity');
  }
  // Check for General Support / Free Masterclass
  else if (
    text.includes('ফ্রি মাস্টারক্লাস') ||
    text.includes('free masterclass') ||
    text.includes('ক্লাস ৯') ||
    text.includes('class 9') ||
    text.includes('school')
  ) {
    category = 'general_support';
    programmeInterest = 'unknown';
    priority = 'low';
    sentiment = 'positive';
    keyDetails.push('Inquiry regarding free webinar / masterclass participation');
  }
  // Check for Specific Programmes
  else {
    if (text.includes('bootcamp') || text.includes('বুটক্যাম্প')) {
      programmeInterest = 'bootcamp';
      keyDetails.push('Interested specifically in the AI Bootcamp');
    } else if (text.includes('fellowship') || text.includes('ফেলোশিপ')) {
      programmeInterest = 'fellowship';
      keyDetails.push('Interested in the BIAI Fellowship');
    }

    if (text.includes('price') || text.includes('cost') || text.includes('fee') || text.includes('koto') || text.includes('কত') || text.includes('discount')) {
      keyDetails.push('Requested pricing and fee structure');
    }

    if (text.includes('job pabo') || text.includes('guarantee') || text.includes('placement')) {
      keyDetails.push('Inquired about job prospects post-training');
    }
  }

  // 5. Generate Safe Multilingual Suggested Reply
  let suggestedReply = '';
  if (category === 'spam') {
    suggestedReply = '[Spam detected - No external response generated]';
  } else if (category === 'job_application') {
    if (language === 'bangla') {
      suggestedReply = 'বিআইএআই (BIAI)-তে ক্যারিয়ার গড়ার আগ্রহের জন্য ধন্যবাদ! আমাদের উন্মুক্ত ইন্টার্নশিপ ও নিয়োগের তথ্য অফিসিয়াল ক্যারিয়ার পেইজ এবং লিংকডইনে প্রকাশ করা হয়। অনুগ্রহ করে আমাদের ক্যারিয়ার পোর্টাল ভিজিট করুন।';
    } else {
      suggestedReply = 'Thank you for your interest in joining the BIAI team! Please visit our official career portal at biai.com.bd/careers or check our LinkedIn page for current internship and full-time vacancies.';
    }
  } else if (category === 'refund_cancellation') {
    if (language === 'bangla') {
      suggestedReply = 'আসসালামু আলাইকুম। আপনার উদ্বেগের কথা আমরা বুঝতে পেরেছি এবং অসুবিধার জন্য আন্তরিকভাবে দুঃখিত। আপনার বিষয়টি আমরা সর্বোচ্চ গুরুত্ব দিয়ে সিনিয়র ম্যানেজমেন্ট টিমের কাছে পাঠিয়েছি। আমাদের টিম দ্রুত আপনার সাথে যোগাযোগ করে সমাধান করবে।';
    } else {
      suggestedReply = 'We sincerely regret the distress caused. Your cancellation and refund request has been escalated directly to our senior management team for priority resolution. A representative will contact you today.';
    }
  } else if (category === 'payment_support') {
    if (language === 'bangla') {
      suggestedReply = 'আসসালামু আলাইকুম! পেমেন্ট সংক্রান্ত সমস্যার জন্য আমরা দুঃখিত। আপনার বিকাশ ট্রানজেকশনটি যাচাই করতে অনুগ্রহ করে ট্রানজেকশন আইডি (TrxID) এবং যে নম্বর থেকে টাকা পাঠিয়েছেন তা উল্লেখ করুন। আমাদের টিম দ্রুত যাচাই করে নিশ্চিত করবে।';
    } else {
      suggestedReply = 'Assalamu alaikum! Thank you for letting us know. To verify your payment, please share your Transaction ID (TrxID) and the sender number. Our accounts team will confirm and update your status promptly.';
    }
  } else if (category === 'corporate_training') {
    if (language === 'bangla') {
      suggestedReply = 'আসসালামু আলাইকুম! আপনার প্রতিষ্ঠানের কর্মীদের জন্য এআই ট্রেনিংয়ে আগ্রহ প্রকাশের জন্য আন্তরিক ধন্যবাদ। আপনাদের উপযোগী কাস্টমাইজড ট্রেনিং মডিউল ও প্রস্তাবনা নিয়ে আলোচনা করতে আমাদের এন্টারপ্রাইজ টিম দ্রুত আপনার সাথে যোগাযোগ করবে।';
    } else {
      suggestedReply = 'Thank you for reaching out to BIAI regarding corporate AI training for your team. We provide tailored enterprise programs for organizations. Our corporate partnerships team will contact you shortly to arrange a consultation.';
    }
  } else {
    // Sales / Programme Info
    if (language === 'bangla') {
      suggestedReply = 'আসসালামু আলাইকুম! বিআইএআই (BIAI)-এর প্রোগ্রামে আগ্রহ প্রকাশের জন্য ধন্যবাদ। কোর্স মডিউল, পরবর্তী ব্যাচের সময়সূচী এবং ভর্তি সংক্রান্ত বিস্তারিত তথ্য জানাতে আমাদের টিম দ্রুত আপনার সাথে যোগাযোগ করবে।';
    } else if (language === 'banglish') {
      suggestedReply = 'Assalamu alaikum! BIAI-er programme-e interest jananor jonno dhonnobad. Course syllabus, fee ebong admission er shob details niye amader team apnake call ba message-e janabe. Apnar ki specific kono batch preference ache?';
    } else {
      suggestedReply = 'Thank you for your interest in BIAI programs! Our admissions team will share the complete curriculum, upcoming schedule, and enrollment details with you shortly.';
    }
  }

  return {
    sender_name: extractedName,
    phone: extractedPhone,
    language,
    category,
    programme_interest: programmeInterest,
    intent: keyDetails[0] || 'Inquiry regarding BIAI courses and admissions',
    priority,
    sentiment,
    confidence: 0.94,
    key_details: keyDetails.length > 0 ? keyDetails : ['Customer inquiry received via ' + input.channel],
    requested_follow_up: text.includes('call') ? 'Phone consultation requested' : null,
    requires_human_review: requiresHumanReview,
    review_reason: reviewReason,
    suggested_reply: suggestedReply,
    is_mock: true,
  };
}

/**
 * Main AI Extraction Service
 * Attempts to call Cloudflare Pages Function `/api/ai/process-enquiry` (or configured n8n endpoint)
 * and falls back gracefully to client-side multilingual simulation when offline or in demo mode.
 */
export async function processEnquiryWithAI(input: IntakeInput): Promise<AIExtractionResult> {
  // If explicitly in demo mode or running locally without backend
  const forceDemo = import.meta.env.VITE_DEMO_MODE === 'true';

  if (!forceDemo) {
    try {
      const response = await fetch('/api/ai/process-enquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (response.ok) {
        const json = await response.json();
        const parsed = aiExtractionSchema.safeParse(json);
        if (parsed.success) {
          return { ...parsed.data, is_mock: false };
        } else {
          console.warn('AI response did not match schema:', parsed.error);
        }
      } else {
        const errText = await response.text();
        console.warn(`AI endpoint returned HTTP ${response.status}:`, errText);
      }
    } catch (err) {
      console.info('Backend AI proxy unreachable, using local multilingual engine:', err);
    }
  }

  // Local AI Simulation with high-fidelity multilingual parsing
  return simulateAIExtraction(input);
}

function formatDateShort(date: Date): string {
  const d = date.getDate();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = monthNames[date.getMonth()];
  const y = date.getFullYear();
  return `${d} ${m} ${y}`;
}

/**
 * Filters enquiries and leads to the target weekly cycle.
 * First checks real calendar last 7 days. If no records exist in that window
 * (e.g., when viewing seeded historical baseline records), automatically selects
 * the most recent 7-day intake window based on the latest enquiry timestamp.
 */
export function getWeeklyEnquiriesAndLeads(enquiries: Enquiry[], leads: Lead[]) {
  if (enquiries.length === 0) {
    return {
      periodLabel: 'No enquiries recorded',
      weeklyEnquiries: [] as Enquiry[],
      weeklyLeads: [] as Lead[],
    };
  }

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Check if enquiries exist in the current calendar last 7 days
  let filteredEnquiries = enquiries.filter((e) => new Date(e.received_at) >= oneWeekAgo);
  let periodLabel = `${formatDateShort(oneWeekAgo)} – ${formatDateShort(now)}`;

  // If no calendar enquiries exist (historical sample data or test mode),
  // select the 7-day window ending at the latest enquiry date
  if (filteredEnquiries.length === 0) {
    const sortedEnquiries = [...enquiries].sort(
      (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    );
    const latestDate = new Date(sortedEnquiries[0].received_at);
    const cycleStartDate = new Date(latestDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    filteredEnquiries = enquiries.filter(
      (e) => new Date(e.received_at) >= cycleStartDate && new Date(e.received_at) <= latestDate
    );
    periodLabel = `${formatDateShort(cycleStartDate)} – ${formatDateShort(latestDate)}`;
  }

  const enquiryIds = new Set(filteredEnquiries.map((e) => e.id));
  const weeklyLeads = leads.filter(
    (l) =>
      l.enquiry_ids.some((id) => enquiryIds.has(id)) ||
      filteredEnquiries.some((e) => e.normalized_phone && e.normalized_phone === l.normalized_phone)
  );

  return {
    periodLabel,
    weeklyEnquiries: filteredEnquiries,
    weeklyLeads,
  };
}

/**
 * Dynamically extracts potential student/staff seats from inquiry text or internal notes.
 */
export function extractPotentialSeats(text: string, notes?: string | null): number {
  const combined = `${text} ${notes || ''}`;
  const match = combined.match(/(\d+)\s*(?:person|people|employees?|staff|learners?|participants?|team members?|members?|seats?)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }
  const matchTeamOf = combined.match(/team of\s*(\d+)/i);
  if (matchTeamOf) {
    const num = parseInt(matchTeamOf[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }
  return 20; // default estimated cohort size for corporate inquiries if no count specified
}

/**
 * High-fidelity client-side simulation for weekly summary synthesis.
 * Dynamically parses real database records, calculating corporate pipeline deals,
 * actual critical escalations (refunds/bKash disputes), and real 48-hour SLA breaches.
 */
export function simulateAIWeeklySummary(
  weeklyEnquiries: Enquiry[],
  weeklyLeads: Lead[],
  metrics: DashboardMetrics,
  periodLabel: string
): AIWeeklySummary {
  // 1. Extract Corporate B2B Pipeline Deals
  const corporateLeads = weeklyLeads.filter((l) => l.programme_interest === 'corporate_training');
  const corporateEnquiries = weeklyEnquiries.filter((e) => e.category === 'corporate_training');

  const deals: { name: string; company: string; seats: number; priority: string }[] = [];
  const handledEnquiryIds = new Set<string>();

  for (const lead of corporateLeads) {
    const relatedEnquiry = weeklyEnquiries.find((e) => lead.enquiry_ids.includes(e.id));
    const msg = relatedEnquiry?.original_message || '';
    const seats = extractPotentialSeats(msg, lead.notes);
    deals.push({
      name: lead.contact_name,
      company: lead.company_name || 'Corporate Enterprise',
      seats,
      priority: lead.priority === 'high' ? 'High' : lead.priority === 'medium' ? 'Medium' : 'Low',
    });
    for (const eid of lead.enquiry_ids) {
      handledEnquiryIds.add(eid);
    }
  }

  // Also include any corporate enquiry that hasn't been linked to a Lead yet
  for (const enq of corporateEnquiries) {
    if (!handledEnquiryIds.has(enq.id)) {
      const seats = extractPotentialSeats(enq.original_message, enq.internal_notes);
      deals.push({
        name: enq.sender_name || 'Enterprise Inquirer',
        company: enq.internal_notes || 'Corporate Client',
        seats,
        priority: enq.priority === 'high' ? 'High' : 'Medium',
      });
      handledEnquiryIds.add(enq.id);
    }
  }

  const totalSeats = deals.reduce((acc, d) => acc + d.seats, 0);

  // 2. Overdue Leads
  const overdueLeads = weeklyLeads.filter((l) => isOverdue48Hours(l.last_interaction_at));

  // 3. Urgent / Escalation Enquiries
  const urgentEnquiries = weeklyEnquiries.filter(
    (e) =>
      e.requires_human_review ||
      e.category === 'refund_cancellation' ||
      e.category === 'payment_support' ||
      e.priority === 'high'
  );

  const criticalAttention: string[] = [];
  for (const enq of urgentEnquiries) {
    const sender = enq.sender_name || 'Customer';
    const channel = enq.source_channel;
    if (enq.category === 'refund_cancellation') {
      criticalAttention.push(
        `Urgent Escalation: ${sender} (${channel}) requested refund/cancellation. Requires senior director follow-up.`
      );
    } else if (enq.category === 'payment_support') {
      criticalAttention.push(
        `Payment Verification: ${sender} (${channel}) reported an unconfirmed payment. Reconciliation required before enrollment.`
      );
    } else if (enq.requires_human_review) {
      criticalAttention.push(
        `Review Flagged: ${sender} (${channel}) - ${enq.internal_notes || 'Flagged for human triage.'}`
      );
    }
  }

  if (overdueLeads.length > 0) {
    criticalAttention.push(
      `SLA Compliance: ${overdueLeads.length} qualified leads have breached the 48-hour contact window. Outreach response times must be stabilized.`
    );
  }

  // 4. Highlights
  const channelBreakdown = metrics.enquiriesBySource
    .filter((s) => s.count > 0)
    .map((s) => `${s.name}: ${s.count}`)
    .join(', ');

  const highlights = [
    `Captured ${weeklyEnquiries.length} multi-channel enquiries (${channelBreakdown || 'All active channels'})`,
    `Identified ${weeklyLeads.length} qualified sales leads (${Math.round((weeklyLeads.length / Math.max(weeklyEnquiries.length, 1)) * 100)}% qualification rate)`,
  ];

  if (deals.length > 0) {
    highlights.push(
      `Strong corporate B2B training interest across ${deals.length} organizations representing ~${totalSeats} learners`
    );
  }

  const spamOrJobCount = weeklyEnquiries.filter(
    (e) => e.category === 'spam' || e.category === 'job_application'
  ).length;
  if (spamOrJobCount > 0) {
    highlights.push(`Safely isolated ${spamOrJobCount} non-sales inquiries (spam/job applications) from the sales pipeline`);
  }

  // 5. Action Plan
  const actionPlan: string[] = [];
  if (deals.length > 0) {
    const topDealNames = deals.slice(0, 2).map((d) => d.name).join(' and ');
    actionPlan.push(
      `1. Prioritize immediate phone outreach to ${topDealNames} with tailored B2B AI syllabus proposals.`
    );
  } else {
    actionPlan.push('1. Launch targeted outreach for prospective corporate AI training partners.');
  }

  const paymentIssue = urgentEnquiries.find((e) => e.category === 'payment_support');
  if (paymentIssue) {
    actionPlan.push(
      `2. Finance team must reconcile ${paymentIssue.sender_name || 'student'}'s payment and dispatch official admission confirmation.`
    );
  } else {
    actionPlan.push('2. Reconcile pending bKash/Nagad transactions with admissions ledger.');
  }

  const refundIssue = urgentEnquiries.find((e) => e.category === 'refund_cancellation');
  if (refundIssue) {
    actionPlan.push(
      `3. Operations lead must contact ${refundIssue.sender_name || 'customer'} with an empathetic resolution to de-escalate public brand risk.`
    );
  } else {
    actionPlan.push('3. Conduct proactive quality follow-up on escalated customer requests.');
  }

  if (overdueLeads.length > 0) {
    actionPlan.push(
      `4. Clear the ${overdueLeads.length} overdue lead follow-up backlog using the AI suggested replies in Banglish/Bangla.`
    );
  } else {
    actionPlan.push('4. Maintain rapid first-response time across WhatsApp, Messenger, and Website inquiries.');
  }

  // 6. Executive Paragraph
  const execSummary = `This week (${periodLabel}), BIAI received ${weeklyEnquiries.length} inbound enquiries across 5 multi-channels. The AI intake engine successfully filtered non-sales noise (isolating spam and job applications) and identified ${weeklyLeads.length} high-intent prospective learners and B2B clients.${deals.length > 0 ? ` Notable high-value interest was captured in Corporate AI Training (${deals.length} organizations representing ~${totalSeats} learners).` : ''}${overdueLeads.length > 0 ? ` ${overdueLeads.length} leads have breached the 48-hour response SLA and require immediate outreach.` : ''}`;

  return {
    headline: 'BIAI Weekly Inbound Intelligence & Pipeline Brief',
    period: periodLabel,
    executive_summary: execSummary,
    highlights,
    corporate_pipeline: {
      total_potential_seats: totalSeats,
      deals,
    },
    critical_attention_items: criticalAttention,
    action_plan: actionPlan,
    generated_at: new Date().toISOString(),
    is_mock: true,
  };
}

/**
 * Main AI Weekly Summary Generator
 * Connects to Gemini API endpoint `/api/ai/generate-summary` to synthesize real enquiries
 * and leads from the past week, falling back smoothly to the dynamic local engine if offline.
 */
export async function generateAIWeeklySummary(
  enquiries: Enquiry[],
  leads: Lead[],
  metrics: DashboardMetrics
): Promise<AIWeeklySummary> {
  const { periodLabel, weeklyEnquiries, weeklyLeads } = getWeeklyEnquiriesAndLeads(enquiries, leads);

  const isBrowser = typeof window !== 'undefined';
  const forceDemo =
    !isBrowser ||
    (typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || process.env?.VITEST === 'true')) ||
    (typeof import.meta !== 'undefined' && (import.meta.env?.MODE === 'test' || import.meta.env?.VITE_DEMO_MODE === 'true'));

  if (!forceDemo) {
    try {
      const payload = {
        period: periodLabel,
        total_enquiries: weeklyEnquiries.length,
        enquiries_by_channel: metrics.enquiriesBySource,
        genuine_sales_leads: weeklyLeads.length,
        corporate_leads: weeklyLeads
          .filter((l) => l.programme_interest === 'corporate_training')
          .map((l) => {
            const enq = weeklyEnquiries.find((e) => l.enquiry_ids.includes(e.id));
            return {
              name: l.contact_name,
              company: l.company_name || 'Corporate Enterprise',
              notes: l.notes,
              message: enq?.original_message || '',
              seats: extractPotentialSeats(enq?.original_message || '', l.notes),
              priority: l.priority,
            };
          }),
        urgent_issues: weeklyEnquiries
          .filter(
            (e) =>
              e.requires_human_review ||
              e.category === 'refund_cancellation' ||
              e.category === 'payment_support'
          )
          .map((e) => ({
            sender_name: e.sender_name,
            channel: e.source_channel,
            category: e.category,
            message: e.original_message,
            notes: e.internal_notes,
          })),
        overdue_leads: weeklyLeads
          .filter((l) => isOverdue48Hours(l.last_interaction_at))
          .map((l) => ({
            contact_name: l.contact_name,
            company: l.company_name,
            last_interaction_at: l.last_interaction_at,
          })),
        enquiries_sample: weeklyEnquiries.slice(0, 15).map((e) => ({
          sender: e.sender_name,
          channel: e.source_channel,
          category: e.category,
          intent: e.original_message.substring(0, 120),
          language: e.detected_language,
        })),
      };

      const response = await fetch('/api/ai/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const json = await response.json();
        const parsed = aiWeeklySummarySchema.safeParse(json);
        if (parsed.success) {
          return { ...parsed.data, is_mock: false };
        } else {
          console.warn('AI summary response did not match schema:', parsed.error);
        }
      } else {
        const errText = await response.text();
        console.warn(`AI summary endpoint returned HTTP ${response.status}:`, errText);
      }
    } catch (err) {
      console.info('Summary AI endpoint unreachable, using dynamic local synthesis:', err);
    }
  }

  // Dynamic simulation using actual weekly enquiries and leads from database
  return simulateAIWeeklySummary(weeklyEnquiries, weeklyLeads, metrics, periodLabel);
}


