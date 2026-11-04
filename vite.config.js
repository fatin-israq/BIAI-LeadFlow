var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
function biaiDevApiPlugin(env) {
    return {
        name: 'biai-dev-api-middleware',
        configureServer: function (server) {
            var _this = this;
            server.middlewares.use(function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
                var body_1;
                var _this = this;
                return __generator(this, function (_a) {
                    if (req.url === '/api/ai/process-enquiry' && req.method === 'POST') {
                        body_1 = '';
                        req.on('data', function (chunk) {
                            body_1 += chunk;
                        });
                        req.on('end', function () { return __awaiter(_this, void 0, void 0, function () {
                            var parsed, currentEnv, n8nWebhook, n8nRes, data_1, errStatus, errBody, n8nErr_1, geminiKey, geminiModel, prompt_1, geminiRes, data, text, err_1;
                            var _a, _b, _c, _d, _e;
                            return __generator(this, function (_f) {
                                switch (_f.label) {
                                    case 0:
                                        _f.trys.push([0, 11, , 12]);
                                        parsed = JSON.parse(body_1 || '{}');
                                        currentEnv = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
                                        n8nWebhook = currentEnv.N8N_WEBHOOK_URL || env.N8N_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
                                        if (!n8nWebhook) return [3 /*break*/, 8];
                                        console.log("[AI Middleware] \uD83D\uDD04 Forwarding enquiry to n8n: ".concat(n8nWebhook));
                                        _f.label = 1;
                                    case 1:
                                        _f.trys.push([1, 7, , 8]);
                                        return [4 /*yield*/, fetch(n8nWebhook, {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'X-N8N-Shared-Secret': currentEnv.N8N_SHARED_SECRET || env.N8N_SHARED_SECRET || '',
                                                },
                                                body: JSON.stringify(parsed),
                                            })];
                                    case 2:
                                        n8nRes = _f.sent();
                                        if (!n8nRes.ok) return [3 /*break*/, 4];
                                        return [4 /*yield*/, n8nRes.json()];
                                    case 3:
                                        data_1 = _f.sent();
                                        console.log('[AI Middleware] ✅ Successfully processed via n8n!');
                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify(data_1));
                                        return [2 /*return*/];
                                    case 4:
                                        errStatus = n8nRes.status;
                                        return [4 /*yield*/, n8nRes.text()];
                                    case 5:
                                        errBody = _f.sent();
                                        console.warn("[AI Middleware] \u26A0\uFE0F n8n returned ".concat(errStatus, ": ").concat(errBody, ". Falling back to direct Gemini."));
                                        _f.label = 6;
                                    case 6: return [3 /*break*/, 8];
                                    case 7:
                                        n8nErr_1 = _f.sent();
                                        console.warn('[AI Middleware] ⚠️ n8n webhook connection error, falling back to direct Gemini:', n8nErr_1);
                                        return [3 /*break*/, 8];
                                    case 8:
                                        geminiKey = currentEnv.GEMINI_API_KEY || env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
                                        geminiModel = currentEnv.GEMINI_MODEL || env.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
                                        if (!geminiKey) {
                                            res.writeHead(503, { 'Content-Type': 'application/json' });
                                            res.end(JSON.stringify({ error: 'GEMINI_API_KEY not configured', fallback_required: true }));
                                            return [2 /*return*/];
                                        }
                                        prompt_1 = "You are the AI Enquiry Assistant for BIAI (Bangladesh Institute of Artificial Intelligence).\nExtract structured data from customer enquiries in Bangla, Banglish, or English.\nCRITICAL RULES:\n- Never fabricate sender name or phone if missing.\n- Categorize accurately: sales_enquiry, programme_info, corporate_training, payment_support, refund_cancellation, general_support, job_application, spam, other.\n- Do NOT invent pricing, refund terms, job guarantees, or class locations.\n- Suggest a natural reply matching the sender's language (Bangla script, Banglish, or English).\n- Return ONLY valid JSON with keys: sender_name, phone, language, category, programme_interest, intent, priority, sentiment, confidence, key_details, requested_follow_up, requires_human_review, review_reason, suggested_reply.\n\nChannel: ".concat(parsed.channel || 'Website form', "\nSender: ").concat(parsed.sender_name || 'None', "\nPhone: ").concat(parsed.phone || 'None', "\nMessage: \"").concat(parsed.message || '', "\"");
                                        return [4 /*yield*/, fetch("https://generativelanguage.googleapis.com/v1beta/models/".concat(geminiModel, ":generateContent?key=").concat(geminiKey), {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    contents: [{ role: 'user', parts: [{ text: prompt_1 }] }],
                                                    generationConfig: {
                                                        responseMimeType: 'application/json',
                                                        temperature: 0.2,
                                                    },
                                                }),
                                            })];
                                    case 9:
                                        geminiRes = _f.sent();
                                        if (!geminiRes.ok) {
                                            res.writeHead(502, { 'Content-Type': 'application/json' });
                                            res.end(JSON.stringify({ error: "Gemini API returned ".concat(geminiRes.status) }));
                                            return [2 /*return*/];
                                        }
                                        return [4 /*yield*/, geminiRes.json()];
                                    case 10:
                                        data = _f.sent();
                                        text = (_e = (_d = (_c = (_b = (_a = data.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                        res.end(text || '{}');
                                        return [3 /*break*/, 12];
                                    case 11:
                                        err_1 = _f.sent();
                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ error: err_1.message || 'Internal dev server error' }));
                                        return [3 /*break*/, 12];
                                    case 12: return [2 /*return*/];
                                }
                            });
                        }); });
                        return [2 /*return*/];
                    }
                    next();
                    return [2 /*return*/];
                });
            }); });
        },
    };
}
// https://vitejs.dev/config/
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
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
