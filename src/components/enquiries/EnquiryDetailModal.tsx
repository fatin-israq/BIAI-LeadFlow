import React, { useState } from 'react';
import { Enquiry, Lead } from '../../types';
import { Modal } from '../ui/Modal';
import {
  formatDateTime,
  formatTimeAgo,
  getCategoryBadge,
  getPriorityBadge,
  getLanguageBadge,
} from '../../lib/utils';
import {
  Copy,
  Check,
  Phone,
  MessageSquare,
  AlertTriangle,
  User,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import { storage } from '../../services/storageAdapter';

interface EnquiryDetailModalProps {
  enquiry: Enquiry | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  onViewLead?: (leadId: string) => void;
}

export const EnquiryDetailModal: React.FC<EnquiryDetailModalProps> = ({
  enquiry,
  isOpen,
  onClose,
  onUpdate,
  onViewLead,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState(enquiry?.internal_notes || '');
  const [replyText, setReplyText] = useState(enquiry?.ai_suggested_reply || '');

  React.useEffect(() => {
    if (enquiry) {
      setNotes(enquiry.internal_notes || '');
      setReplyText(enquiry.ai_suggested_reply || '');
    }
  }, [enquiry]);

  if (!enquiry) return null;

  const catBadge = getCategoryBadge(enquiry.category);
  const priBadge = getPriorityBadge(enquiry.priority);
  const langBadge = getLanguageBadge(enquiry.detected_language);

  const handleCopyReply = () => {
    if (!replyText) return;
    navigator.clipboard.writeText(replyText);
    setCopied(true);
    showToast('Suggested reply copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      await storage.saveEnquiry({
        ...enquiry,
        internal_notes: notes,
        ai_suggested_reply: replyText,
      });
      showToast('Enquiry updated successfully', 'success');
      if (onUpdate) onUpdate();
    } catch {
      showToast('Failed to update enquiry', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={enquiry.sender_name || 'Anonymous Contact'}
      subtitle={`Received via ${enquiry.source_channel} • ${formatDateTime(enquiry.received_at)} (${formatTimeAgo(enquiry.received_at)})`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Urgent Human Review Banner */}
        {enquiry.requires_human_review && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">Human Intervention Required</p>
              <p className="text-rose-700">
                This message contains a high-priority customer dispute, payment verification issue, or refund escalation. Exercise care and follow BIAI internal policies.
              </p>
            </div>
          </div>
        )}

        {/* Metadata Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${catBadge.className}`}>
            {catBadge.label}
          </span>
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${langBadge.className}`}>
            {langBadge.label}
          </span>
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${priBadge.className}`}>
            {priBadge.label}
          </span>
          {enquiry.programme_interest && enquiry.programme_interest !== 'unknown' && (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-md border bg-indigo-50 text-indigo-700 border-indigo-200">
              Interest: {enquiry.programme_interest.toUpperCase()}
            </span>
          )}
          {enquiry.lead_id && (
            <button
              onClick={() => {
                onClose();
                if (onViewLead && enquiry.lead_id) onViewLead(enquiry.lead_id);
              }}
              className="px-2.5 py-1 text-xs font-medium rounded-md border bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View in Sales Pipeline</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Contact Info Grid */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-navy-50 rounded-lg border border-navy-100 text-xs">
          <div>
            <span className="text-navy-500 font-medium block">Phone Number</span>
            <span className="font-semibold text-navy-800 flex items-center gap-1.5 mt-0.5">
              <Phone className="w-3.5 h-3.5 text-navy-400" />
              {enquiry.phone ? enquiry.phone : <em className="text-navy-400 font-normal">Not provided (preserved as null)</em>}
            </span>
          </div>
          <div>
            <span className="text-navy-500 font-medium block">Source Channel</span>
            <span className="font-semibold text-navy-800 flex items-center gap-1.5 mt-0.5">
              <MessageSquare className="w-3.5 h-3.5 text-navy-400" />
              {enquiry.source_channel}
            </span>
          </div>
        </div>

        {/* Original Message Display */}
        <div>
          <label className="block text-xs font-bold text-navy-700 mb-1.5 uppercase tracking-wide">
            Original Incoming Message
          </label>
          <div className="p-4 bg-white border border-navy-200 rounded-lg text-sm text-navy-900 font-mono leading-relaxed select-text whitespace-pre-wrap">
            {enquiry.original_message}
          </div>
          <p className="text-[11px] text-navy-400 mt-1">
            * Exact original message preserved without alteration or AI rewriting.
          </p>
        </div>

        {/* AI Key Details */}
        {enquiry.ai_key_details && enquiry.ai_key_details.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-navy-700 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              AI Extracted Insights
            </label>
            <ul className="space-y-1.5 bg-navy-50/60 p-3 rounded-lg border border-navy-200/60 text-xs text-navy-700">
              {enquiry.ai_key_details.map((detail, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-brand-500 font-bold">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Reply Studio */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-navy-700 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              Suggested AI Reply ({langBadge.label})
            </label>
            <button
              onClick={handleCopyReply}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors cursor-pointer"
            >
              {copied ? (
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
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={3}
            className="w-full text-xs font-sans p-3 bg-white border border-navy-200 rounded-lg text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            placeholder="AI suggested response will appear here..."
          />
          <p className="text-[11px] text-navy-400 mt-1">
            Review and adapt before sending via {enquiry.source_channel}. BIAI enforces human verification before customer messaging.
          </p>
        </div>

        {/* Internal Staff Notes */}
        <div>
          <label className="block text-xs font-bold text-navy-700 mb-1.5 uppercase tracking-wide">
            Internal Staff Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full text-xs p-3 bg-navy-50/50 border border-navy-200 rounded-lg text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            placeholder="Add internal notes, context, or follow-up instructions..."
          />
        </div>

        {/* Modal Action Buttons */}
        <div className="pt-3 border-t border-navy-100 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-navy-600 hover:text-navy-900 hover:bg-navy-50 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handleSaveNotes}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
