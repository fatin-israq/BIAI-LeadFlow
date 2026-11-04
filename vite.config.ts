import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function biaiDevApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'biai-dev-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
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
              const geminiModel = currentEnv.GEMINI_MODEL || env.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash';

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

              const geminiRes = await fetch(
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
