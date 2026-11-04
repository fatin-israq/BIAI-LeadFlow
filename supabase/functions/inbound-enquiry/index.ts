// ==============================================================================
// Supabase Edge Function: Inbound Enquiry & AI Processor
// Handles Webhooks from WhatsApp Cloud API, Facebook Messenger, and Web Forms
// Powered by Google Gemini 1.5/2.0 with Realtime Database Synchronization
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const META_VERIFY_TOKEN = Deno.env.get('META_VERIFY_TOKEN') || 'biai_leadflow_secret';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const AI_EXTRACTION_PROMPT = `
You are the AI Enquiry Assistant for BIAI (Bangladesh Institute of Artificial Intelligence).
Your job is to parse inbound messages received via WhatsApp, Facebook Messenger, Website forms, or Phone notes in Bengali script, Banglish (Roman Bengali), or English, and output structured JSON.

MANDATORY RULES:
1. SENDER IDENTITY: Extract sender_name only if explicitly stated in text. Never invent names.
2. PHONE NUMBER: Extract phone only if digits exist in message. Never hallucinate phones.
3. LANGUAGE DETECTION: Strictly detect "bangla" (Bengali script), "banglish" (Roman Bengali), "english", or "mixed".
4. CATEGORIZATION: Choose one of:
   - "sales_enquiry": Genuine individual seeking course info, fees, enrollment.
   - "programme_info": Questions about format, offline vs online, certificate validity.
   - "corporate_training": Organizations/MDs/HR seeking group training for staff.
   - "payment_support": Customer mentions sent bKash/Nagad money, missing confirmation.
   - "refund_cancellation": Dissatisfied user demanding money back or withdrawal.
   - "general_support": High school students, free webinars.
   - "job_application": Internships, career seeking. NOT a sales lead!
   - "spam": Crypto, promotions, MLM.
   - "other": Ambiguous message.
5. PROGRAMME INTEREST: "bootcamp", "fellowship", "corporate_training", or "unknown".
6. FACTUAL SAFETY: Never invent or commit to specific fees, batch start dates, refund timelines, job guarantees, or offline venue locations.
7. SUGGESTED REPLY: Draft a polite, helpful reply MATCHING the exact language and register of the sender (courteous Bengali script for Bangla, friendly Banglish for Banglish, professional English for English).

Return ONLY raw JSON conforming to:
{
  "sender_name": string | null,
  "phone": string | null,
  "language": "bangla" | "banglish" | "english" | "mixed",
  "category": "sales_enquiry" | "programme_info" | "corporate_training" | "payment_support" | "refund_cancellation" | "general_support" | "job_application" | "spam" | "other",
  "programme_interest": "bootcamp" | "fellowship" | "corporate_training" | "unknown",
  "intent": string,
  "priority": "low" | "medium" | "high",
  "sentiment": "positive" | "neutral" | "negative",
  "confidence": number,
  "key_details": string[],
  "requested_follow_up": string | null,
  "requires_human_review": boolean,
  "review_reason": string | null,
  "suggested_reply": string
}
`;

serve(async (req: Request) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // 1. Meta Webhook Verification (WhatsApp / Messenger initial handshake)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const body = await req.json();

    // Normalize incoming payload from different channels
    let messageText = '';
    let sourceChannel = 'Website form';
    let incomingSenderName: string | null = null;
    let incomingPhone: string | null = null;

    // A. Check for Meta WhatsApp Cloud API format
    if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msg = body.entry[0].changes[0].value.messages[0];
      sourceChannel = 'WhatsApp';
      messageText = msg.text?.body || '';
      incomingPhone = msg.from || null;
      incomingSenderName = body.entry[0].changes[0].value.contacts?.[0]?.profile?.name || null;
    } 
    // B. Check for Facebook Messenger format
    else if (body.entry?.[0]?.messaging?.[0]) {
      const msg = body.entry[0].messaging[0];
      sourceChannel = 'Facebook Messenger';
      messageText = msg.message?.text || '';
      incomingPhone = null;
      incomingSenderName = null;
    } 
    // C. Standard JSON payload (Web form / API)
    else {
      messageText = body.message || '';
      sourceChannel = body.channel || 'Website form';
      incomingSenderName = body.sender_name || null;
      incomingPhone = body.phone || null;
    }

    if (!messageText || messageText.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Message body cannot be empty' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call Google Gemini API for Extraction
    let aiResult: any = null;

    if (GEMINI_API_KEY) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const geminiPayload = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${AI_EXTRACTION_PROMPT}\n\nIncoming Channel: ${sourceChannel}\nSender Provided: ${incomingSenderName || 'None'}\nPhone Provided: ${incomingPhone || 'None'}\nIncoming Message:\n"${messageText}"`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      };

      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload),
      });

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const rawJsonText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJsonText) {
          aiResult = JSON.parse(rawJsonText);
        }
      }
    }

    // Fallback if Gemini key is missing
    if (!aiResult) {
      const isBangla = /[\u0980-\u09FF]/.test(messageText);
      aiResult = {
        sender_name: incomingSenderName,
        phone: incomingPhone,
        language: isBangla ? 'bangla' : 'english',
        category: 'sales_enquiry',
        programme_interest: 'unknown',
        intent: 'General inquiry',
        priority: 'medium',
        sentiment: 'neutral',
        confidence: 0.85,
        key_details: ['Received from ' + sourceChannel],
        requires_human_review: false,
        review_reason: null,
        suggested_reply: isBangla
          ? 'আসসালামু আলাইকুম! বিআইএআই (BIAI)-তে যোগাযোগ করার জন্য ধন্যবাদ। আমাদের প্রতিনিধি দ্রুত আপনার সাথে যোগাযোগ করবেন।'
          : 'Thank you for reaching out to BIAI! Our team will get back to you shortly.',
      };
    }

    // Final consolidated fields
    const finalSenderName = incomingSenderName || aiResult.sender_name || null;
    const finalPhone = incomingPhone || aiResult.phone || null;

    // Save directly to Supabase
    // The database trigger 'handle_inbound_enquiry_automation' will automatically:
    // 1. Deduplicate by normalized phone
    // 2. Link or create the Lead in 'leads' table
    // 3. Create a 48h SLA task in 'follow_up_tasks' table
    // 4. Log to 'activity_logs'
    // 5. Emit Realtime event to all connected browsers!
    const { data: insertedEnquiry, error: dbError } = await supabase
      .from('enquiries')
      .insert({
        source_channel: sourceChannel,
        original_message: messageText,
        received_at: new Date().toISOString(),
        sender_name: finalSenderName,
        phone: finalPhone,
        detected_language: aiResult.language || 'english',
        category: aiResult.category || 'other',
        programme_interest: aiResult.programme_interest || 'unknown',
        priority: aiResult.priority || 'medium',
        sentiment: aiResult.sentiment || 'neutral',
        ai_confidence: aiResult.confidence || 0.9,
        ai_suggested_reply: aiResult.suggested_reply || null,
        ai_key_details: aiResult.key_details || [],
        requires_human_review: Boolean(aiResult.requires_human_review),
        handling_status: aiResult.requires_human_review ? 'escalated' : 'processed',
        internal_notes: aiResult.review_reason || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insertion error:', dbError);
      throw dbError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        enquiry: insertedEnquiry,
        ai: aiResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Inbound webhook execution error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

