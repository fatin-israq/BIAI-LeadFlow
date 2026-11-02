import { z } from 'zod';

const intakeInputSchema = z.object({
  message: z.string().min(3),
  channel: z.string(),
  sender_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  received_at: z.string().optional(),
  internal_notes: z.string().optional().nullable(),
});

const aiExtractionSchema = z.object({
  sender_name: z.string().nullable().catch(null),
  phone: z.string().nullable().catch(null),
  language: z.enum(['bangla', 'banglish', 'english', 'mixed']).catch('english'),
  category: z.enum([
    'sales_enquiry',
    'programme_info',
    'corporate_training',
    'payment_support',
    'refund_cancellation',
    'general_support',
    'job_application',
    'spam',
    'other',
  ]).catch('other'),
  programme_interest: z.enum(['bootcamp', 'fellowship', 'corporate_training', 'unknown']).catch('unknown'),
  intent: z.string(),
  priority: z.enum(['low', 'medium', 'high']).catch('medium'),
  sentiment: z.enum(['positive', 'neutral', 'negative']).catch('neutral'),
  confidence: z.number().min(0).max(1).catch(0.85),
  key_details: z.array(z.string()).catch([]),
  requested_follow_up: z.string().nullable().catch(null),
  requires_human_review: z.boolean().catch(false),
  review_reason: z.string().nullable().optional().catch(null),
  suggested_reply: z.string(),
});

interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  N8N_WEBHOOK_URL?: string;
  N8N_SHARED_SECRET?: string;
}

type PagesFunction<T = Record<string, any>> = (context: {
  request: Request;
  env: T;
}) => Promise<Response>;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const rawBody = await context.request.json();
    const parseResult = intakeInputSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parseResult.error.format() }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { message, channel, sender_name, phone } = parseResult.data;
    const { GEMINI_API_KEY, GEMINI_MODEL, N8N_WEBHOOK_URL, N8N_SHARED_SECRET } = context.env;

    // OPTION 1: n8n Webhook Integration
    if (N8N_WEBHOOK_URL) {
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

      if (!n8nResponse.ok) {
        throw new Error(`n8n webhook error: ${n8nResponse.statusText}`);
      }

      const n8nJson = await n8nResponse.json();
      const validated = aiExtractionSchema.parse(n8nJson);
      return new Response(JSON.stringify(validated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // OPTION 2: Direct Gemini Flash Server-Side Processing
    if (GEMINI_API_KEY) {
      const model = GEMINI_MODEL || 'gemini-1.5-flash';
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

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

      const geminiRes = await fetch(geminiEndpoint, {
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

      if (!geminiRes.ok) {
        throw new Error(`Gemini API error: ${geminiRes.statusText}`);
      }

      const geminiData = await geminiRes.json();
      const textOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textOutput) {
        throw new Error('Empty response from Gemini API');
      }

      const parsedJSON = JSON.parse(textOutput);
      const validated = aiExtractionSchema.parse(parsedJSON);

      return new Response(JSON.stringify(validated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        error: 'Neither N8N_WEBHOOK_URL nor GEMINI_API_KEY configured on server.',
        fallback_required: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
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
};
