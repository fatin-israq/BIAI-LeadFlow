import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function biaiDevApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'biai-dev-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/ai/generate-summary' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const parsed = JSON.parse(body || '{}');
              const currentEnv = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
              const geminiKey = currentEnv.GEMINI_API_KEY || env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
              const geminiModel = currentEnv.GEMINI_MODEL || env.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

              if (!geminiKey) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'GEMINI_API_KEY not configured', fallback_required: true }));
                return;
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
                `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
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

              // If primary model is unavailable or 404, fallback to gemini-3.5-flash-lite
              if (!geminiRes.ok && geminiModel !== 'gemini-3.5-flash-lite') {
                console.warn(`[AI Middleware] ${geminiModel} returned ${geminiRes.status}. Retrying with gemini-3.5-flash-lite...`);
                geminiRes = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`,
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
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Gemini API returned ${geminiRes.status}` }));
                return;
              }

              const data = await geminiRes.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(text || '{}');
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message || 'Internal dev server error' }));
            }
          });
          return;
        }

        if (req.url === '/api/ai/process-enquiry' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const parsed = JSON.parse(body || '{}');

              // Dynamically reload .env so changes are picked up immediately without restarting Vite
              const currentEnv = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
              const n8nWebhook = currentEnv.N8N_WEBHOOK_URL || env.N8N_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;

              // OPTION A: Forward to live n8n Webhook if configured
              if (n8nWebhook) {
                console.log(`[AI Middleware] 🔄 Forwarding enquiry to n8n: ${n8nWebhook}`);
                try {
                  const n8nRes = await fetch(n8nWebhook, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-N8N-Shared-Secret': currentEnv.N8N_SHARED_SECRET || env.N8N_SHARED_SECRET || '',
                    },
                    body: JSON.stringify(parsed),
                  });

                  if (n8nRes.ok) {
                    const data = await n8nRes.json();
                    console.log('[AI Middleware] ✅ Successfully processed via n8n!');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(data));
                    return;
                  } else {
                    const errStatus = n8nRes.status;
                    const errBody = await n8nRes.text();
                    console.warn(`[AI Middleware] ⚠️ n8n returned ${errStatus}: ${errBody}. Falling back to direct Gemini.`);
                  }
                } catch (n8nErr) {
                  console.warn('[AI Middleware] ⚠️ n8n webhook connection error, falling back to direct Gemini:', n8nErr);
                }
              }

              // OPTION B: Direct Gemini API call
              const geminiKey = currentEnv.GEMINI_API_KEY || env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
              const geminiModel = currentEnv.GEMINI_MODEL || env.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

              if (!geminiKey) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'GEMINI_API_KEY not configured', fallback_required: true }));
                return;
              }

              const prompt = `You are the AI Enquiry Assistant for BIAI (Bangladesh Institute of Artificial Intelligence).
Extract structured data from customer enquiries in Bangla, Banglish, or English.
CRITICAL RULES:
- Never fabricate sender name or phone if missing.
- Categorize accurately: sales_enquiry, programme_info, corporate_training, payment_support, refund_cancellation, general_support, job_application, spam, other.
- Do NOT invent pricing, refund terms, job guarantees, or class locations.
- Suggest a natural reply matching the sender's language (Bangla script, Banglish, or English).
- Return ONLY valid JSON with keys: sender_name, phone, language, category, programme_interest, intent, priority, sentiment, confidence, key_details, requested_follow_up, requires_human_review, review_reason, suggested_reply.

Channel: ${parsed.channel || 'Website form'}
Sender: ${parsed.sender_name || 'None'}
Phone: ${parsed.phone || 'None'}
Message: "${parsed.message || ''}"`;

              let geminiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
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

              if (!geminiRes.ok && geminiModel !== 'gemini-3.5-flash-lite') {
                console.warn(`[AI Middleware] ${geminiModel} returned ${geminiRes.status}. Retrying with gemini-3.5-flash-lite...`);
                geminiRes = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`,
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
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Gemini API returned ${geminiRes.status}` }));
                return;
              }

              const data = await geminiRes.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(text || '{}');
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message || 'Internal dev server error' }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), biaiDevApiPlugin(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-charts': ['recharts'],
            'vendor-icons': ['lucide-react'],
            'vendor-dnd': ['@hello-pangea/dnd'],
          },
        },
      },
    },
  };
});
