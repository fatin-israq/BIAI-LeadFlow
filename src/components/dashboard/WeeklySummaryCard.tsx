import React, { useState } from 'react';
import { Sparkles, Copy, Check, RotateCw, Building, AlertTriangle, CheckCircle2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { AIWeeklySummary, DashboardMetrics, Enquiry, Lead } from '../../types';
import { generateAIWeeklySummary } from '../../services/aiService';
import { useToast } from '../ui/Toast';

interface WeeklySummaryCardProps {
  metrics: DashboardMetrics;
  enquiries: Enquiry[];
  leads: Lead[];
}

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

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateAIWeeklySummary(enquiries, leads, metrics);
      setSummary(result);
      setIsExpanded(true);
      showToast('AI Weekly Executive Summary generated!', 'success');
    } catch {
      showToast('Failed to generate weekly summary', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    const text = `
# ${summary.headline}
*Period: ${summary.period}*

## Executive Summary
${summary.executive_summary}

## Key Highlights
${summary.highlights.map((h) => `- ${h}`).join('\n')}

## Corporate Training Pipeline (175 seats)
${summary.corporate_pipeline.deals.map((d) => `- ${d.name} (${d.company}) - Priority: ${d.priority}`).join('\n')}

## Critical Escalations & SLA Attention
${summary.critical_attention_items.map((i) => `- ${i}`).join('\n')}

## Action Recommendations
${summary.action_plan.join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    showToast('Weekly summary copied to clipboard', 'success');
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="bg-gradient-to-br from-white via-brand-50/20 to-indigo-50/30 rounded-xl border border-brand-200/90 shadow-2xs overflow-hidden">
      {/* Header bar */}
      <div className="p-4 border-b border-brand-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-navy-900">
                AI Weekly Executive Summary
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                AI Synthesis
              </span>
            </div>
            <p className="text-xs text-navy-500">
              Synthesizes enquiry trends, high-value corporate deals, and 48-hour SLA risks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!summary ? (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate AI Weekly Digest</span>
                </>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-navy-200 text-navy-700 hover:bg-navy-50 transition-colors cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-navy-500" />
                    <span>Copy Digest</span>
                  </>
                )}
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-navy-200 text-navy-700 hover:bg-navy-50 transition-colors cursor-pointer"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg hover:bg-black/5 text-navy-500"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Content Body */}
      {summary && isExpanded && (
        <div className="p-5 space-y-4 text-xs animate-in fade-in duration-200">
          {/* Executive Paragraph */}
          <div className="p-3.5 bg-white/90 rounded-lg border border-brand-100 shadow-2xs">
            <p className="text-navy-800 leading-relaxed font-medium">
              {summary.executive_summary}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Highlights */}
            <div className="bg-white/80 p-3.5 rounded-lg border border-navy-100 space-y-2">
              <h4 className="font-bold text-navy-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Key Weekly Highlights
              </h4>
              <ul className="space-y-1.5 text-navy-700">
                {summary.highlights.map((h, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-brand-600 font-bold">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Corporate B2B Opportunities */}
            <div className="bg-white/80 p-3.5 rounded-lg border border-navy-100 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-purple-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
                  <Building className="w-3.5 h-3.5 text-purple-600" />
                  Corporate B2B Demand
                </h4>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  175 Potential Learners
                </span>
              </div>
              <div className="space-y-1.5">
                {summary.corporate_pipeline.deals.map((deal, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-purple-50/50 border border-purple-100 flex items-center justify-between text-[11px]"
                  >
                    <div>
                      <strong className="text-navy-900">{deal.name}</strong>
                      <span className="text-navy-500 block">{deal.company}</span>
                    </div>
                    <span className="font-bold text-purple-700">{deal.seats} seats</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Recommendations */}
          <div className="p-3.5 bg-brand-50/60 rounded-lg border border-brand-200/80 space-y-2">
            <h4 className="font-bold text-brand-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              Recommended Priority Actions This Week
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-navy-800">
              {summary.action_plan.map((act, idx) => (
                <div key={idx} className="p-2 rounded bg-white border border-brand-100 font-medium">
                  {act}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
