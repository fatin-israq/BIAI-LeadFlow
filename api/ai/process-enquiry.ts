import { z } from 'zod';

export const config = {
  runtime: 'edge',
};

const intakeInputSchema = z.object({
  message: z.string().min(3),
  channel: z.string(),
  sender_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  received_at: z.string().optional(),
  internal_notes: z.string().optional().nullable(),
});

const detectedLanguageSchema = z.preprocess((val) => {
  if (typeof val !== 'string') return val;
  const s = val.toLowerCase().trim();
  if (s.includes('bangla') || s.includes('bengali') || s === 'bn') return 'bangla';
  if (s.includes('banglish')) return 'banglish';
  if (s.includes('mixed')) return 'mixed';
  if (s.includes('english') || s === 'en') return 'english';
  return s;
}, z.enum(['bangla', 'banglish', 'english', 'mixed']));

const enquiryCategorySchema = z.preprocess((val) => {
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

const programmeInterestSchema = z.preprocess((val) => {
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

const aiExtractionSchema = z.object({
  sender_name: z.string().nullable().catch(null),
  phone: z.string().nullable().catch(null),
  language: detectedLanguageSchema.catch('english'),
  category: enquiryCategorySchema.catch('other'),
  programme_interest: programmeInterestSchema.catch('unknown'),
  intent: z.string().catch('Customer inquiry received'),
  priority: z.preprocess((val) => typeof val === 'string' ? val.toLowerCase().trim() : val, z.enum(['low', 'medium', 'high'])).catch('medium'),
  sentiment: z.preprocess((val) => typeof val === 'string' ? val.toLowerCase().trim() : val, z.enum(['positive', 'neutral', 'negative'])).catch('neutral'),
  confidence: z.number().min(0).max(1).catch(0.85),
  key_details: z.preprocess((val) => {
    if (Array.isArray(val)) return val.map((v) => typeof v === 'string' ? v : JSON.stringify(v));
    if (val && typeof val === 'object') {
      return Object.entries(val).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
    }
    if (typeof val === 'string') return [val];
    return [];
  }, z.array(z.string())).catch([]),
  requested_follow_up: z.preprocess((val) => typeof val === 'boolean' ? (val ? 'Follow-up requested' : null) : val, z.string().nullable()).catch(null),
  requires_human_review: z.boolean().catch(false),
  review_reason: z.string().nullable().optional().catch(null),
  suggested_reply: z.string().catch('Thank you for reaching out to BIAI.'),
});

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = await request.json();
    const parseResult = intakeInputSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parseResult.error.format() }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { message, channel, sender_name, phone } = parseResult.data;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
    const N8N_SHARED_SECRET = process.env.N8N_SHARED_SECRET;

    // Check for obvious localhost misconfiguration on cloud Vercel
    if (N8N_WEBHOOK_URL && (N8N_WEBHOOK_URL.includes('localhost') || N8N_WEBHOOK_URL.includes('127.0.0.1'))) {
      console.warn(
        `[Vercel API] ⚠️ N8N_WEBHOOK_URL is set to localhost (${N8N_WEBHOOK_URL}). ` +
        `Vercel runs in the cloud and cannot reach your computer's localhost. ` +
        `Please use a public tunnel (e.g. cloudflared, ngrok, or localtunnel) or cloud n8n URL.`
      );
    }

    // OPTION 1: n8n Webhook Integration
    if (N8N_WEBHOOK_URL) {
      try {
        console.log(`[Vercel API] 🔄 Forwarding enquiry to n8n webhook: ${N8N_WEBHOOK_URL}`);
        const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-Shared-Secret': N8N_SHARED_SECRET || '',
          },
          body: JSON.stringify({
            message,
            channel,
            sender_name,
            phone,
            received_at: new Date().toISOString(),
          }),
        });

        if (n8nResponse.ok) {
          const n8nJson = await n8nResponse.json();
          const isFallback =
            (n8nJson.category === 'other' || !n8nJson.category) &&
            (!n8nJson.key_details || n8nJson.key_details.length === 0) &&
            n8nJson.intent === 'General inquiry';

          if (!isFallback) {
            const validated = aiExtractionSchema.parse(n8nJson);
            console.log('[Vercel API] ✅ Successfully processed enquiry via n8n!');
            return new Response(JSON.stringify(validated), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          console.warn('[Vercel API] ⚠️ n8n returned dummy fallback output. Falling back to direct Gemini.');
        } else {
          const errBody = await n8nResponse.text();
          console.warn(`[Vercel API] ⚠️ n8n webhook returned HTTP ${n8nResponse.status}: ${errBody}`);
        }
      } catch (n8nErr: any) {
        console.warn(`[Vercel API] ⚠️ Failed to reach n8n webhook (${n8nErr.message}). Falling back to Gemini/Local.`);
      }
    }

    // OPTION 2: Direct Gemini Flash Server-Side Processing
    if (GEMINI_API_KEY) {
      console.log(`[Vercel API] 🤖 Calling Gemini (${GEMINI_MODEL}) directly...`);
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

      const systemPrompt = `
You are the AI Enquiry Assistant for BIAI (Bangladesh Institute of Artificial Intelligence).
Extract structured data from customer enquiries in Bangla, Banglish, or English.
CRITICAL RULES:
- Never fabricate sender name or phone if missing.
- Categorize accurately: sales_enquiry, programme_info, corporate_training, payment_support, refund_cancellation, general_support, job_application, spam, other.
- Do NOT invent pricing, refund terms, job guarantees, or class locations.
- Suggest a natural reply matching the sender's language (Bangla script, Banglish, or English).
- Return ONLY valid JSON with keys: sender_name, phone, language, category, programme_interest, intent, priority, sentiment, confidence, key_details, requested_follow_up, requires_human_review, review_reason, suggested_reply.
`;

      const userPrompt = `
Source Channel: ${channel}
Sender Name Provided: ${sender_name || 'Not provided'}
Phone Provided: ${phone || 'Not provided'}
Incoming Message:
"${message}"
`;

      let geminiRes = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      });

      if (!geminiRes.ok && GEMINI_MODEL !== 'gemini-flash-latest') {
        console.warn(`[Vercel API] ${GEMINI_MODEL} returned ${geminiRes.status}. Retrying with gemini-flash-latest...`);
        geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2,
              },
            }),
          }
        );
      }

      if (!geminiRes.ok) {
        const errorText = await geminiRes.text();
        throw new Error(`Gemini API error (${geminiRes.status}): ${errorText}`);
      }

      const geminiData = await geminiRes.json();
      const textOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textOutput) {
        throw new Error('Empty response from Gemini API');
      }

      let rawText = textOutput.trim();
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) rawText = match[0];

      const parsedJSON = JSON.parse(rawText);
      const validated = aiExtractionSchema.parse(parsedJSON);

      return new Response(JSON.stringify(validated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        error: 'Neither reachable N8N_WEBHOOK_URL nor GEMINI_API_KEY configured on server.',
        fallback_required: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('[Vercel API] ❌ Internal error:', err);
    return new Response(
      JSON.stringify({
        error: err.message || 'Internal processing error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export { handler as POST };
