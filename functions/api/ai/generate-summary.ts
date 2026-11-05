import { z } from 'zod';

const aiWeeklySummarySchema = z.object({
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
});

interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}

type PagesFunction<T = Record<string, any>> = (context: {
  request: Request;
  env: T;
}) => Promise<Response>;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const parsed = await context.request.json();
    const GEMINI_API_KEY = context.env.GEMINI_API_KEY;
    const GEMINI_MODEL = context.env.GEMINI_MODEL || 'gemini-3-flash-preview';

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'GEMINI_API_KEY not configured on server',
          fallback_required: true,
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const prompt = `You are the Executive AI Intelligence Assistant for BIAI (Bangladesh Institute of Artificial Intelligence).
Synthesize the provided real customer enquiries, corporate pipeline opportunities, and 48-hour SLA risks from the past week into an executive briefing for leadership.

Analyze the REAL data provided:
1. Executive Summary: 2-3 sentences summarizing enquiry trends, channel volumes, qualified leads vs noise (spam/job applicants), high-value corporate deals, and SLA status.
2. Key Highlights: 3-4 bullet points summarizing real enquiry volume, top channels, qualified leads, and spam/job isolation.
3. Corporate Pipeline: Identify all corporate training deals from the data with real seat estimates, company names, contact names, and priority. Total potential seats must be the exact sum of all seats across the deals.
4. Critical Attention Items: Highlight urgent escalations (refund requests, payment verification issues like bKash/Nagad) and overdue leads past 48h SLA.
5. Action Plan: 4 prioritized, highly actionable steps for sales, accounts, and operations teams to execute this week.

Return ONLY raw JSON with this exact schema:
{
  "headline": string,
  "period": string,
  "executive_summary": string,
  "highlights": string[],
  "corporate_pipeline": {
    "total_potential_seats": number,
    "deals": [
      { "name": string, "company": string, "seats": number, "priority": "High" | "Medium" | "Low" }
    ]
  },
  "critical_attention_items": string[],
  "action_plan": string[]
}

Data for Analysis:
- Period: ${parsed.period || 'Current Intake Cycle'}
- Total Inbound Enquiries: ${parsed.total_enquiries || 0}
- Enquiries by Channel: ${JSON.stringify(parsed.enquiries_by_channel || [])}
- Qualified Sales Leads: ${parsed.genuine_sales_leads || 0}
- Corporate Training Opportunities: ${JSON.stringify(parsed.corporate_leads || [])}
- Urgent Issues / Escalations: ${JSON.stringify(parsed.urgent_issues || [])}
- SLA Breaches (>48h Overdue Leads): ${JSON.stringify(parsed.overdue_leads || [])}
- Representative Enquiry Digest: ${JSON.stringify(parsed.enquiries_sample || [])}`;

    let geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      }
    );

    if (!geminiRes.ok && GEMINI_MODEL !== 'gemini-3.5-flash-lite') {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        }
      );
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API error (${geminiRes.status}): ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const textOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) {
      throw new Error('Empty response from Gemini API');
    }

    const parsedJSON = JSON.parse(textOutput);
    const validated = aiWeeklySummarySchema.parse(parsedJSON);

    return new Response(JSON.stringify(validated), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
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
