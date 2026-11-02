import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Copy,
  Check,
  RotateCw,
  Save,
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2,
  Phone,
  User,
  ArrowRight,
  ExternalLink,
  Languages,
} from 'lucide-react';
import {
  SourceChannel,
  DetectedLanguage,
  EnquiryCategory,
  ProgrammeInterest,
  PriorityLevel,
  SentimentType,
  AIExtractionResult,
} from '../types';
import { processEnquiryWithAI } from '../services/aiService';
import { storage } from '../services/storageAdapter';
import { useToast } from '../components/ui/Toast';
import {
  getCategoryBadge,
  getPriorityBadge,
  getLanguageBadge,
  isLeadEligibleCategory,
} from '../lib/utils';

export const AIIntakePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Left form state
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState<SourceChannel>('WhatsApp');
  const [senderName, setSenderName] = useState('');
  const [phone, setPhone] = useState('');
  const [receivedAt, setReceivedAt] = useState(
    new Date().toISOString().substring(0, 16)
  );
  const [internalNotes, setInternalNotes] = useState('');

  // Execution state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractionResult, setExtractionResult] =
    useState<AIExtractionResult | null>(null);

  // Editable fields in extraction result
  const [editedName, setEditedName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedCategory, setEditedCategory] =
    useState<EnquiryCategory>('sales_enquiry');
  const [editedProgramme, setEditedProgramme] =
    useState<ProgrammeInterest>('unknown');
  const [editedLanguage, setEditedLanguage] =
    useState<DetectedLanguage>('banglish');
  const [editedPriority, setEditedPriority] = useState<PriorityLevel>('medium');
  const [editedSentiment, setEditedSentiment] =
    useState<SentimentType>('neutral');
  const [editedReply, setEditedReply] = useState('');
  const [replyCopied, setReplyCopied] = useState(false);

  // Quick preset test samples
  const testSamples = [
    {
      label: 'Rafi (Bootcamp Banglish)',
      channel: 'WhatsApp' as SourceChannel,
      sender: 'Rafi Ahmed',
      phone: '01711000001',
      msg: 'Assalamualaikum, apnader 3 day bootcamp er price koto? Payment kibhabe korbo?',
    },
    {
      label: 'Tahmina (Fellowship Bangla)',
      channel: 'Facebook Messenger' as SourceChannel,
      sender: 'Tahmina Akter',
      phone: '',
      msg: 'ফেলোশিপ প্রোগ্রামে ভর্তি হতে চাই। কবে শুরু হবে?',
    },
    {
      label: 'Mahmud (Corporate 40p)',
      channel: 'Website form' as SourceChannel,
      sender: 'Mahmud Hasan (MD, Gazipur Textile)',
      phone: '01711000003',
      msg: 'I run a 40-person textile company in Gazipur. We want AI training for our team. Can someone call me this week?',
    },
    {
      label: 'Farzana (bKash Payment Dispute)',
      channel: 'WhatsApp' as SourceChannel,
      sender: 'Farzana Rahman',
      phone: '01711000007',
      msg: 'পেমেন্ট করেছি কিন্তু কোনো কনফার্মেশন পাইনি। আমার নাম ফারজানা রহমান। ২৫ তারিখে বিকাশে দিয়েছি।',
    },
    {
      label: 'Habibur (Urgent Refund Threat)',
      channel: 'Phone call note' as SourceChannel,
      sender: 'Habibur Rahman',
      phone: '01711000015',
      msg: 'Caller wants to cancel his enrolment and get his money back. Very upset. Said he will post about it on Facebook if not solved today.',
    },
    {
      label: 'Arif (Job Seeker / Intern)',
      channel: 'Website form' as SourceChannel,
      sender: 'Arif Hossain',
      phone: '01711000019',
      msg: 'Looking for a job as an AI intern. Where do I apply?',
    },
    {
      label: 'Crypto (Spam)',
      channel: 'Facebook comment' as SourceChannel,
      sender: 'Crypto Trader',
      phone: '',
      msg: 'Earn 5000 USD every day with our crypto signals! Click bit.ly/xxxx now!!!',
    },
  ];

  const handleApplyPreset = (preset: (typeof testSamples)[0]) => {
    setMessage(preset.msg);
    setChannel(preset.channel);
    setSenderName(preset.sender);
    setPhone(preset.phone);
    setExtractionResult(null);
  };

  const handleAnalyze = async () => {
    if (!message.trim() || message.trim().length < 3) {
      showToast('Please enter message text to analyze', 'error');
      return;
    }

    setIsAnalyzing(true);
    setExtractionResult(null);

    try {
      const result = await processEnquiryWithAI({
        message: message.trim(),
        channel,
        sender_name: senderName.trim() || null,
        phone: phone.trim() || null,
        received_at: receivedAt,
        internal_notes: internalNotes.trim() || null,
      });

      setExtractionResult(result);

      // Initialize editable fields with AI output
      setEditedName(result.sender_name || senderName || '');
      setEditedPhone(result.phone || phone || '');
      setEditedCategory(result.category);
      setEditedProgramme(result.programme_interest);
      setEditedLanguage(result.language);
      setEditedPriority(result.priority);
      setEditedSentiment(result.sentiment);
      setEditedReply(result.suggested_reply);

      showToast('AI analysis complete!', 'success');
    } catch (err: any) {
      console.error('AI extraction error:', err);
      showToast('Failed to analyze enquiry', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyReply = () => {
    if (!editedReply) return;
    navigator.clipboard.writeText(editedReply);
    setReplyCopied(true);
    showToast('Suggested reply copied to clipboard', 'success');
    setTimeout(() => setReplyCopied(false), 2500);
  };

  const handleRegenerateReply = async () => {
    if (!extractionResult) return;
    setIsAnalyzing(true);
    try {
      const result = await processEnquiryWithAI({
        message,
        channel,
        sender_name: editedName,
        phone: editedPhone,
      });
      setEditedReply(result.suggested_reply);
      showToast('Suggested reply refreshed', 'success');
    } catch {
      showToast('Failed to regenerate reply', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveEnquiry = async () => {
    if (!extractionResult) return;

    setIsSaving(true);
    try {
      const isoReceivedAt = receivedAt
        ? new Date(receivedAt).toISOString()
        : new Date().toISOString();

      const saved = await storage.saveEnquiry({
        sender_name: editedName.trim() || null,
        phone: editedPhone.trim() || null,
        normalized_phone: editedPhone.trim() || null,
        source_channel: channel,
        original_message: message.trim(),
        received_at: isoReceivedAt,
        detected_language: editedLanguage,
        category: editedCategory,
        programme_interest: editedProgramme,
        priority: editedPriority,
        sentiment: editedSentiment,
        ai_confidence: extractionResult.confidence,
        ai_suggested_reply: editedReply.trim(),
        ai_key_details: extractionResult.key_details,
        requires_human_review: extractionResult.requires_human_review,
        handling_status:
          editedCategory === 'spam'
            ? 'spam'
            : extractionResult.requires_human_review
            ? 'escalated'
            : 'processed',
        internal_notes: internalNotes.trim() || null,
      });

      const isSales = isLeadEligibleCategory(editedCategory);

      if (isSales) {
        showToast(
          'Enquiry saved and sales lead updated in pipeline!',
          'success'
        );
      } else {
        showToast(
          `Enquiry saved under "${editedCategory.replace('_', ' ')}" (non-sales inbox)`,
          'info'
        );
      }

      // Reset or redirect options
      if (isSales && saved.lead_id) {
        navigate('/pipeline');
      } else {
        navigate('/enquiries');
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('Failed to save enquiry', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Studio Header */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-indigo-950 p-6 rounded-2xl text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-brand-500/30 text-brand-200 text-xs font-semibold border border-brand-400/30">
            <Sparkles className="w-3.5 h-3.5 text-brand-300" />
            <span>AI Multilingual Processing Engine</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            AI Intake & Structured Extraction Studio
          </h2>
          <p className="text-xs text-brand-200 max-w-2xl leading-relaxed">
            Paste incoming messages from WhatsApp, Facebook, or web inquiries in
            Bangla, Banglish, or English. Gemini Flash automatically extracts
            structured lead data, isolates non-sales messages, and drafts a
            culturally accurate reply.
          </p>
        </div>

        {/* Preset test samples selector */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <span className="text-[11px] font-semibold text-brand-200 uppercase tracking-wider">
            Test with Sample Scenarios:
          </span>
          <div className="flex flex-wrap gap-1.5 max-w-md">
            {testSamples.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(sample)}
                className="text-[11px] font-medium px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors cursor-pointer"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Input Left, AI Extraction Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Input Form (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-navy-200/80 shadow-2xs space-y-4">
          <div className="border-b border-navy-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy-900">
              Inbound Enquiry Input
            </h3>
            <span className="text-xs text-navy-600 font-medium">Step 1</span>
          </div>

          {/* Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-navy-800">
                Incoming Customer Message <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-navy-600 font-medium">
                Bangla / Banglish / English
              </span>
            </div>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Paste raw customer message here (e.g. 'Assalamualaikum, apnader bootcamp er price koto?')"
              className="w-full text-xs font-mono p-3 bg-navy-50/50 border border-navy-200 rounded-lg text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Channel and Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">
                Source Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as SourceChannel)}
                className="w-full text-xs p-2 bg-white border border-navy-200 rounded-lg text-navy-800 focus:outline-none"
              >
                <option value="WhatsApp">WhatsApp</option>
                <option value="Facebook Messenger">Facebook Messenger</option>
                <option value="Facebook comment">Facebook comment</option>
                <option value="Website form">Website form</option>
                <option value="Phone call note">Phone call note</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">
                Received Date/Time
              </label>
              <input
                type="datetime-local"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-navy-200 rounded-lg text-navy-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Optional Name & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">
                Sender Name <span className="text-navy-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. Rafi Ahmed"
                className="w-full text-xs p-2 bg-white border border-navy-200 rounded-lg text-navy-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">
                Phone Number <span className="text-navy-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 01711000001"
                className="w-full text-xs p-2 bg-white border border-navy-200 rounded-lg text-navy-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Internal Staff Notes */}
          <div>
            <label className="block text-xs font-semibold text-navy-700 mb-1">
              Internal Staff Context / Notes
            </label>
            <input
              type="text"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="e.g. Caller mentioned corporate training budget..."
              className="w-full text-xs p-2 bg-white border border-navy-200 rounded-lg text-navy-800 focus:outline-none"
            />
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            disabled={isAnalyzing || !message.trim()}
            onClick={handleAnalyze}
            className="w-full py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-brand-200" />
                <span>Analyzing Multilingual Enquiry...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-brand-200" />
                <span>Analyze with AI</span>
              </>
            )}
          </button>
        </div>

        {/* RIGHT COLUMN: AI Extraction Results (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-navy-200/80 shadow-2xs space-y-5">
          <div className="border-b border-navy-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-navy-900">
                AI Extraction & Suggested Action
              </h3>
              {extractionResult?.is_mock && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Demo AI Mode
                </span>
              )}
            </div>
            <span className="text-xs text-navy-600 font-medium">Step 2 (Editable)</span>
          </div>

          {!extractionResult ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 mx-auto flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="max-w-sm mx-auto">
                <h4 className="text-xs font-bold text-navy-800">
                  No Analysis Run Yet
                </h4>
                <p className="text-xs text-navy-500 mt-1">
                  Paste a message on the left or click one of the sample scenario
                  presets at the top, then press <strong>Analyze with AI</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Human Review Banner if triggered */}
              {extractionResult.requires_human_review && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold">Human Verification Required</p>
                    <p className="text-rose-700">
                      {extractionResult.review_reason ||
                        'This message represents a potential dispute, refund request, or payment verification issue. Do not automate without review.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Confidence & Detection Metrics Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-navy-50/70 rounded-lg border border-navy-200/60 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-navy-600">Confidence:</span>
                  <span className="font-bold text-brand-700 bg-white px-2 py-0.5 rounded border border-navy-200">
                    {(extractionResult.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-navy-600">Detected Language:</span>
                  <select
                    value={editedLanguage}
                    onChange={(e) =>
                      setEditedLanguage(e.target.value as DetectedLanguage)
                    }
                    className="font-bold text-xs bg-white border border-navy-200 rounded px-2 py-0.5 text-navy-800"
                  >
                    <option value="bangla">Bangla (বাংলা)</option>
                    <option value="banglish">Banglish</option>
                    <option value="english">English</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-navy-600">Sentiment:</span>
                  <select
                    value={editedSentiment}
                    onChange={(e) =>
                      setEditedSentiment(e.target.value as SentimentType)
                    }
                    className="font-semibold text-xs bg-white border border-navy-200 rounded px-2 py-0.5 text-navy-800"
                  >
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                  </select>
                </div>
              </div>

              {/* Contact Information & Extraction */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-navy-500 font-semibold mb-1">
                    Extracted Contact Name
                  </label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="None detected"
                    className="w-full p-2 bg-white border border-navy-200 rounded-lg text-navy-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-navy-500 font-semibold mb-1">
                    Extracted Phone Number
                  </label>
                  <input
                    type="text"
                    value={editedPhone}
                    onChange={(e) => setEditedPhone(e.target.value)}
                    placeholder="None detected (null)"
                    className="w-full p-2 bg-white border border-navy-200 rounded-lg text-navy-900 font-mono"
                  />
                </div>
              </div>

              {/* Categorization & Programme Selectors */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-navy-500 font-semibold mb-1">
                    Enquiry Category
                  </label>
                  <select
                    value={editedCategory}
                    onChange={(e) =>
                      setEditedCategory(e.target.value as EnquiryCategory)
                    }
                    className="w-full p-2 bg-white border border-navy-200 rounded-lg text-navy-900 font-medium"
                  >
                    <option value="sales_enquiry">Sales Enquiry</option>
                    <option value="programme_info">Programme Info</option>
                    <option value="corporate_training">Corporate Training</option>
                    <option value="payment_support">Payment Support</option>
                    <option value="refund_cancellation">
                      Refund / Cancellation
                    </option>
                    <option value="general_support">General Support</option>
                    <option value="job_application">Job Application</option>
                    <option value="spam">Spam / Junk</option>
                    <option value="other">Other / Review</option>
                  </select>
                </div>

                <div>
                  <label className="block text-navy-500 font-semibold mb-1">
                    Programme Interest
                  </label>
                  <select
                    value={editedProgramme}
                    onChange={(e) =>
                      setEditedProgramme(e.target.value as ProgrammeInterest)
                    }
                    className="w-full p-2 bg-white border border-navy-200 rounded-lg text-navy-900 font-medium"
                  >
                    <option value="unknown">Unknown / Unspecified</option>
                    <option value="bootcamp">Bootcamp</option>
                    <option value="fellowship">Fellowship</option>
                    <option value="corporate_training">Corporate Training</option>
                  </select>
                </div>

                <div>
                  <label className="block text-navy-500 font-semibold mb-1">
                    Priority Level
                  </label>
                  <select
                    value={editedPriority}
                    onChange={(e) =>
                      setEditedPriority(e.target.value as PriorityLevel)
                    }
                    className="w-full p-2 bg-white border border-navy-200 rounded-lg text-navy-900 font-medium"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {/* Key Details Extracted */}
              {extractionResult.key_details.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-navy-700 uppercase tracking-wide mb-1.5">
                    Extracted Fact Points
                  </label>
                  <ul className="space-y-1 bg-navy-50/60 p-3 rounded-lg border border-navy-200/60 text-xs text-navy-700">
                    {extractionResult.key_details.map((detail, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-brand-600 font-bold">•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested Reply Studio */}
              <div className="pt-2 border-t border-navy-100">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                    <label className="text-xs font-bold text-navy-900 uppercase tracking-wide">
                      Draft Suggested Reply
                    </label>
                    <span className="text-[10px] text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.2 rounded font-semibold">
                      Language: {editedLanguage}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRegenerateReply}
                      className="text-xs font-medium text-navy-500 hover:text-navy-800 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3" />
                      Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyReply}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors cursor-pointer"
                    >
                      {replyCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-brand-600" />
                          <span>Copy Reply</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={editedReply}
                  onChange={(e) => setEditedReply(e.target.value)}
                  className="w-full text-xs font-sans p-3 bg-white border border-navy-200 rounded-lg text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 leading-relaxed"
                />
                <p className="text-[11px] text-navy-400 mt-1">
                  * Replies must not promise employment or invent pricing without team confirmation.
                </p>
              </div>

              {/* Action Buttons to Save */}
              <div className="pt-3 border-t border-navy-100 flex items-center justify-between">
                <span className="text-xs text-navy-500">
                  {isLeadEligibleCategory(editedCategory) ? (
                    <span className="text-emerald-700 font-semibold">
                      Will create/update genuine lead in Sales Pipeline
                    </span>
                  ) : (
                    <span className="text-navy-500">
                      Non-sales category (Saved in Inbox only)
                    </span>
                  )}
                </span>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setExtractionResult(null)}
                    className="px-3.5 py-2 text-xs font-medium text-navy-600 hover:text-navy-900 rounded-lg transition-colors cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveEnquiry}
                    className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : 'Save Enquiry & Sync Lead'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

