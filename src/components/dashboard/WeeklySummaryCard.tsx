import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  RotateCw,
  Building,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClockAlert,
  ShieldAlert,
  Users,
  CheckSquare,
  Square,
  TrendingUp,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { AIWeeklySummary, DashboardMetrics, Enquiry, Lead } from '../../types';
import { generateAIWeeklySummary } from '../../services/aiService';
import { useToast } from '../ui/Toast';

interface WeeklySummaryCardProps {
  metrics: DashboardMetrics;
  enquiries: Enquiry[];
  leads: Lead[];
}

type TabKey = 'overview' | 'corporate' | 'escalations' | 'actions' | 'all';

export const WeeklySummaryCard: React.FC<WeeklySummaryCardProps> = ({
  metrics,
  enquiries,
  leads,
}) => {
  const { showToast } = useToast();
  const [summary, setSummary] = useState<AIWeeklySummary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [completedActions, setCompletedActions] = useState<Record<number, boolean>>({});

  // Auto-synthesize on initial load if records are present
  useEffect(() => {
    if (!summary && enquiries.length > 0) {
      handleGenerate(false);
    }
  }, [enquiries, leads, metrics]);

  const handleGenerate = async (notify = true) => {
    setIsGenerating(true);
    try {
      const result = await generateAIWeeklySummary(enquiries, leads, metrics);
      setSummary(result);
      if (notify) {
        showToast('AI Weekly Executive Summary updated!', 'success');
      }
    } catch {
      showToast('Failed to generate weekly summary', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleAction = (idx: number) => {
    setCompletedActions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const totalSeats = summary?.corporate_pipeline?.total_potential_seats ?? 175;
  const corporateDeals = summary?.corporate_pipeline?.deals || [];

  const handleCopy = () => {
    if (!summary) return;
    const text = `
# ${summary.headline}
Period: ${summary.period}

## Executive Summary
${summary.executive_summary}

## Key Topline Highlights
${summary.highlights.map((h) => `- ${h}`).join('\n')}

## Corporate Training Pipeline (${totalSeats} seats)
${corporateDeals
  .map((d) => `- ${d.name} (${d.company}) — ${d.seats} seats [Priority: ${d.priority}]`)
  .join('\n')}

## Critical Escalations & SLA Attention
${summary.critical_attention_items.map((i) => `- ${i}`).join('\n')}

## Recommended Priority Actions
${summary.action_plan.map((act, i) => `${completedActions[i] ? '[x]' : '[ ]'} ${act}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    showToast('Executive digest copied to clipboard', 'success');
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Helper to dynamically parse action items into structured, scannable cards
  const formatActionItem = (raw: string, index: number) => {
    const cleaned = raw.replace(/^(\d+[\.\)]\s*|\[\s*\]\s*|[-*]\s*)/, '').trim();
    let role = 'Admissions';
    let roleBadge = 'bg-brand-100 text-brand-700 border-brand-200';
    let urgent = false;

    const lower = cleaned.toLowerCase();
    if (
      lower.includes('b2b') ||
      lower.includes('corporate') ||
      lower.includes('bank') ||
      lower.includes('textile') ||
      lower.includes('proposal')
    ) {
      role = 'Enterprise Partnerships';
      roleBadge = 'bg-purple-100 text-purple-700 border-purple-200';
      urgent = true;
    } else if (
      lower.includes('bkash') ||
      lower.includes('payment') ||
      lower.includes('finance') ||
      lower.includes('trx') ||
      lower.includes('reconcil')
    ) {
      role = 'Finance & Accounts';
      roleBadge = 'bg-amber-100 text-amber-700 border-amber-200';
      urgent = true;
    } else if (
      lower.includes('refund') ||
      lower.includes('habibur') ||
      lower.includes('escalat') ||
      lower.includes('operations') ||
      lower.includes('brand risk')
    ) {
      role = 'Operations & Support';
      roleBadge = 'bg-rose-100 text-rose-700 border-rose-200';
      urgent = true;
    } else if (
      lower.includes('sla') ||
      lower.includes('overdue') ||
      lower.includes('backlog') ||
      lower.includes('reply')
    ) {
      role = 'Admissions Team';
      roleBadge = 'bg-indigo-100 text-indigo-700 border-indigo-200';
    }

    let title = cleaned;
    let desc = cleaned;
    if (cleaned.includes(':')) {
      const parts = cleaned.split(':');
      title = parts[0].trim();
      desc = parts.slice(1).join(':').trim();
    } else if (cleaned.length > 55) {
      const words = cleaned.split(' ');
      title = words.slice(0, 5).join(' ');
      desc = cleaned;
    }

    return { role, roleBadge, title, desc, urgent };
  };

  // Helper to dynamically parse critical items into styled triage cards
  const formatCriticalItem = (raw: string) => {
    let badge = 'SLA Alert';
    let badgeClass = 'bg-indigo-100 text-indigo-700 border-indigo-200';
    let borderClass = 'border-indigo-200 bg-indigo-50/30';
    let actionLabel = 'Review';

    const lower = raw.toLowerCase();
    if (
      lower.includes('refund') ||
      lower.includes('escalat') ||
      lower.includes('threat') ||
      lower.includes('dissatisfaction')
    ) {
      badge = 'Urgent Escalation';
      badgeClass = 'bg-rose-100 text-rose-700 border-rose-200';
      borderClass = 'border-rose-200 bg-rose-50/30';
      actionLabel = 'Call Today';
    } else if (
      lower.includes('payment') ||
      lower.includes('bkash') ||
      lower.includes('trx')
    ) {
      badge = 'Payment Verification';
      badgeClass = 'bg-amber-100 text-amber-700 border-amber-200';
      borderClass = 'border-amber-200 bg-amber-50/30';
      actionLabel = 'Verify TrxID';
    } else if (lower.includes('sla') || lower.includes('overdue') || lower.includes('48-hour')) {
      badge = '48h SLA Alert';
      badgeClass = 'bg-indigo-100 text-indigo-700 border-indigo-200';
      borderClass = 'border-indigo-200 bg-indigo-50/30';
      actionLabel = 'Batch Outreach';
    }

    let title = raw;
    let desc = raw;
    if (raw.includes(':')) {
      const parts = raw.split(':');
      title = parts[0].trim();
      desc = parts.slice(1).join(':').trim();
    }

    return { badge, badgeClass, borderClass, actionLabel, title, desc };
  };

  const actionItems = summary?.action_plan || [
    'Prioritize immediate phone outreach to Kamrul Islam (Motijheel Bank) and Mahmud Hasan (Gazipur Textile).',
    "Finance team must reconcile Farzana Rahman's bKash payment and dispatch official admission confirmation.",
    'Operations lead must contact Habibur Rahman with an empathetic resolution to de-escalate public brand risk.',
    'Clear overdue lead follow-up backlog using the AI suggested replies in Banglish/Bangla.',
  ];

  const criticalItems = summary?.critical_attention_items || [
    'Urgent Escalation: Habibur Rahman (Phone note) demanded immediate refund and threatened social media post. Needs senior director call today.',
    'Payment Verification: Farzana Rahman (WhatsApp) reported an unconfirmed bKash transfer from Oct 25. Requires TrxID verification before enrollment.',
    `SLA Compliance: ${metrics.followUpsOverdue} qualified leads are past the 48-hour contact window. Outreach response times must be stabilized.`,
  ];

  return (
    <div className="bg-white rounded-xl border border-navy-200 shadow-2xs overflow-hidden">
      {/* Top Header Bar */}
      <div className="p-4 sm:p-5 border-b border-navy-100 bg-gradient-to-r from-brand-50/40 via-white to-indigo-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-navy-900 tracking-tight">
                AI Weekly Executive Intelligence
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  summary?.is_mock === false
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-brand-100 text-brand-700'
                }`}
              >
                {summary?.is_mock === false ? 'Gemini 3 Flash • Live' : 'AI Synthesis'}
              </span>
              {summary?.period && (
                <span className="text-[10px] text-navy-500 font-mono hidden md:inline bg-navy-50 px-2 py-0.5 rounded border border-navy-200/60">
                  Cycle: {summary.period}
                </span>
              )}
            </div>
            <p className="text-xs text-navy-500 mt-0.5">
              Automated multi-channel triage, corporate opportunities, and SLA risk synthesis
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            onClick={handleCopy}
            disabled={!summary}
            title="Copy structured markdown digest"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-navy-200 text-navy-700 hover:bg-navy-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-navy-500" />
                <span>Copy Brief</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleGenerate(true)}
            disabled={isGenerating}
            title="Regenerate intelligence summary"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-navy-200 text-navy-700 hover:bg-navy-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 text-navy-500 ${isGenerating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isGenerating ? 'Synthesizing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse card' : 'Expand card'}
            className="p-1.5 rounded-lg border border-navy-200 hover:bg-navy-50 text-navy-500 transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Glanceable Topline Metrics Strip (Solves text overload with instant numbers) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-200'
                  : 'bg-navy-50/40 border-navy-100 hover:bg-navy-50 hover:border-navy-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-navy-500">
                  Lead Conversion
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg font-bold text-navy-900">
                {metrics.totalEnquiries > 0
                  ? Math.round((metrics.genuineSalesLeads / metrics.totalEnquiries) * 100)
                  : 70}
                %{' '}
                <span className="text-xs font-normal text-emerald-700 font-semibold">
                  ({metrics.genuineSalesLeads}/{metrics.totalEnquiries})
                </span>
              </div>
              <p className="text-[10px] text-navy-500 mt-0.5 truncate">
                Qualified sales prospects
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('corporate')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'corporate'
                  ? 'bg-purple-50/50 border-purple-300 ring-1 ring-purple-200'
                  : 'bg-navy-50/40 border-navy-100 hover:bg-navy-50 hover:border-navy-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                  Corporate Demand
                </span>
                <Building className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-lg font-bold text-navy-900">
                {totalSeats} <span className="text-xs font-semibold text-purple-700">Seats</span>
              </div>
              <p className="text-[10px] text-navy-500 mt-0.5 truncate">
                {corporateDeals.length} active enterprise deals
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('escalations')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'escalations'
                  ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-200'
                  : 'bg-navy-50/40 border-navy-100 hover:bg-navy-50 hover:border-navy-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                  SLA & Urgent
                </span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-lg font-bold text-navy-900">
                {metrics.followUpsOverdue}{' '}
                <span className="text-xs font-semibold text-rose-600">SLA Risks</span>
              </div>
              <p className="text-[10px] text-rose-600 font-medium mt-0.5 truncate">
                {criticalItems.length} triage items flagged
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('actions')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'actions'
                  ? 'bg-brand-50/50 border-brand-300 ring-1 ring-brand-200'
                  : 'bg-navy-50/40 border-navy-100 hover:bg-navy-50 hover:border-navy-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
                  Action Checklist
                </span>
                <CheckSquare className="w-4 h-4 text-brand-600" />
              </div>
              <div className="text-lg font-bold text-navy-900">
                {Object.values(completedActions).filter(Boolean).length}/{actionItems.length}{' '}
                <span className="text-xs font-semibold text-brand-700">Done</span>
              </div>
              <p className="text-[10px] text-navy-500 mt-0.5 truncate">
                Assigned team priorities
              </p>
            </button>
          </div>

          {/* Concise Executive Takeaway Banner (No endless paragraph) */}
          <div className="p-3.5 bg-brand-50/40 rounded-xl border border-brand-100/80 flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="text-navy-800 leading-relaxed text-[11.5px]">
              <span className="font-bold text-navy-900">Executive Takeaway: </span>
              {summary ? (
                summary.executive_summary
              ) : (
                <>
                  AI filtered noise into{' '}
                  <strong className="text-brand-900 font-bold">
                    {metrics.genuineSalesLeads} sales-qualified leads
                  </strong>
                  , uncovered{' '}
                  <strong className="text-purple-900 font-bold">
                    {totalSeats} B2B training seats
                  </strong>{' '}
                  across corporate buyers, and isolated{' '}
                  <strong className="text-rose-700 font-bold">
                    {metrics.followUpsOverdue} SLA follow-ups
                  </strong>{' '}
                  requiring immediate outreach.
                </>
              )}
            </div>
          </div>

          {/* Segmented Tab Navigation Bar */}
          <div className="border-b border-navy-200 flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-navy-500 hover:text-navy-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Key Highlights</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-navy-100 text-navy-600 font-bold">
                {summary?.highlights?.length || 4}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('corporate')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'corporate'
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-navy-500 hover:text-navy-800'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Corporate Pipeline</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-700 font-bold">
                {totalSeats} seats
              </span>
            </button>

            <button
              onClick={() => setActiveTab('escalations')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'escalations'
                  ? 'border-rose-600 text-rose-700'
                  : 'border-transparent text-navy-500 hover:text-navy-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Urgent & SLA Attention</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
                {criticalItems.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('actions')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'actions'
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-navy-500 hover:text-navy-800'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Action Plan</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-brand-100 text-brand-700 font-bold">
                {actionItems.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ml-auto cursor-pointer ${
                activeTab === 'all'
                  ? 'border-navy-900 text-navy-900'
                  : 'border-transparent text-navy-400 hover:text-navy-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Show All</span>
            </button>
          </div>

          {/* TAB CONTENT PANELS */}

          {/* 1. OVERVIEW & HIGHLIGHTS */}
          {(activeTab === 'overview' || activeTab === 'all') && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {summary?.highlights && summary.highlights.length > 0 ? (
                  summary.highlights.map((h, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl border border-navy-100 bg-navy-50/30 flex items-start gap-3"
                    >
                      <div className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                        {i === 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : i === 1 ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : i === 2 ? (
                          <Building className="w-4 h-4" />
                        ) : (
                          <ShieldAlert className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h5 className="font-bold text-navy-900 text-xs">Highlight #{i + 1}</h5>
                        <p className="text-[11px] text-navy-600 mt-0.5 leading-relaxed">{h}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="p-3.5 rounded-xl border border-navy-100 bg-navy-50/30 flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-navy-900 text-xs">Multi-Channel Inbound</h5>
                        <p className="text-[11px] text-navy-600 mt-0.5 leading-relaxed">
                          Captured <strong>{metrics.totalEnquiries} enquiries</strong> across
                          WhatsApp, Messenger, Phone, Web, and Social comments.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-navy-100 bg-navy-50/30 flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-navy-900 text-xs">Lead Qualification</h5>
                        <p className="text-[11px] text-navy-600 mt-0.5 leading-relaxed">
                          Identified <strong>{metrics.genuineSalesLeads} genuine sales leads</strong> ready for admissions follow-up.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 2. CORPORATE PIPELINE */}
          {(activeTab === 'corporate' || activeTab === 'all') && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-navy-700">
                  Target Pipeline Distribution ({totalSeats} Total Learners)
                </span>
                <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                  High-Value Enterprise
                </span>
              </div>

              {/* Progress bar visual */}
              {corporateDeals.length > 0 && totalSeats > 0 && (
                <div className="w-full h-2 rounded-full bg-navy-100 overflow-hidden flex">
                  {corporateDeals.map((d, i) => {
                    const pct = Math.max(5, Math.round((d.seats / totalSeats) * 100));
                    const colors = ['bg-purple-600', 'bg-indigo-500', 'bg-brand-400', 'bg-blue-400'];
                    return (
                      <div
                        key={i}
                        style={{ width: `${pct}%` }}
                        className={`${colors[i % colors.length]} h-full`}
                        title={`${d.company}: ${d.seats} seats`}
                      />
                    );
                  })}
                </div>
              )}

              {corporateDeals.length === 0 ? (
                <div className="p-6 rounded-xl border border-navy-100 bg-navy-50/20 text-center text-navy-500 text-xs">
                  No corporate inquiries recorded in this cycle.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {corporateDeals.map((deal, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/30 space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                            {deal.seats} Seats
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              deal.priority === 'High' || deal.priority === 'high'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {deal.priority} Priority
                          </span>
                        </div>
                        <h5 className="font-bold text-navy-900 text-xs mt-2">{deal.company}</h5>
                        <p className="text-[11px] text-navy-600">Decision Maker: {deal.name}</p>
                      </div>

                      <div className="pt-2 border-t border-purple-100/80 flex items-center justify-between text-[10px] text-purple-800 font-medium">
                        <span>Action required</span>
                        <span className="underline">Syllabus Proposal</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. ESCALATIONS & SLA */}
          {(activeTab === 'escalations' || activeTab === 'all') && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {criticalItems.map((raw, idx) => {
                  const item = formatCriticalItem(raw);
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border ${item.borderClass} space-y-2 flex flex-col justify-between`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeClass}`}
                          >
                            {item.badge}
                          </span>
                          <span className="text-[10px] font-semibold text-navy-500">Alert</span>
                        </div>
                        <h5 className="font-bold text-navy-900 text-xs mt-2">{item.title}</h5>
                        <p className="text-[11px] text-navy-600 leading-relaxed">{item.desc}</p>
                      </div>
                      <div className="pt-2 border-t border-navy-200/60 text-[10px] font-semibold text-navy-700 flex items-center justify-between">
                        <span>Status</span>
                        <span className="bg-white px-2 py-0.5 rounded border border-navy-200">
                          {item.actionLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. ACTION CHECKLIST */}
          {(activeTab === 'actions' || activeTab === 'all') && (
            <div className="space-y-2 pt-1 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-navy-700">
                  Priority Execution Checklist for This Week
                </span>
                <span className="text-[10px] text-navy-500">
                  Click to mark item as completed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {actionItems.map((raw, idx) => {
                  const act = formatActionItem(raw, idx);
                  const isDone = !!completedActions[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleAction(idx)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                        isDone
                          ? 'bg-emerald-50/40 border-emerald-200 text-navy-400'
                          : 'bg-white border-navy-200/90 hover:border-brand-300 hover:shadow-2xs'
                      }`}
                    >
                      <button
                        type="button"
                        className="mt-0.5 text-navy-400 hover:text-brand-600 transition-colors shrink-0"
                      >
                        {isDone ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-navy-400" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${act.roleBadge}`}
                          >
                            {act.role}
                          </span>
                          {act.urgent && !isDone && (
                            <span className="text-[9.5px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                              Urgent
                            </span>
                          )}
                        </div>
                        <h6
                          className={`font-bold text-xs ${
                            isDone ? 'line-through text-navy-400' : 'text-navy-900'
                          }`}
                        >
                          {act.title}
                        </h6>
                        <p
                          className={`text-[11px] mt-0.5 leading-snug ${
                            isDone ? 'line-through text-navy-400' : 'text-navy-600'
                          }`}
                        >
                          {act.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
