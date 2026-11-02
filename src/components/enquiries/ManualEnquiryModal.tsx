import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { SourceChannel, EnquiryCategory, ProgrammeInterest, PriorityLevel, DetectedLanguage } from '../../types';
import { storage } from '../../services/storageAdapter';
import { useToast } from '../ui/Toast';

interface ManualEnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const ManualEnquiryModal: React.FC<ManualEnquiryModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { showToast } = useToast();
  const [senderName, setSenderName] = useState('');
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<SourceChannel>('Phone call note');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<EnquiryCategory>('sales_enquiry');
  const [programmeInterest, setProgrammeInterest] = useState<ProgrammeInterest>('unknown');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [language, setLanguage] = useState<DetectedLanguage>('banglish');
  const [internalNotes, setInternalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      showToast('Please enter message text or call note', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await storage.saveEnquiry({
        sender_name: senderName.trim() || null,
        phone: phone.trim() || null,
        normalized_phone: phone.trim() || null,
        source_channel: channel,
        original_message: message.trim(),
        received_at: new Date().toISOString(),
        detected_language: language,
        category,
        programme_interest: programmeInterest,
        priority,
        sentiment: 'neutral',
        ai_confidence: 1.0,
        ai_suggested_reply: null,
        ai_key_details: ['Manually logged enquiry by staff'],
        requires_human_review: false,
        handling_status: 'processed',
        internal_notes: internalNotes.trim() || null,
      });

      showToast('Enquiry recorded successfully', 'success');
      onCreated();
      onClose();

      // Reset form
      setSenderName('');
      setPhone('');
      setMessage('');
      setInternalNotes('');
    } catch {
      showToast('Failed to save manual enquiry', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record New Enquiry" subtitle="Manually log an incoming message or phone call note" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-navy-700 mb-1">
              Sender Name <span className="text-navy-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="e.g. Tanvir Ahmed"
              className="w-full text-xs p-2.5 rounded-lg border border-navy-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
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
              placeholder="e.g. 01711000000"
              className="w-full text-xs p-2.5 rounded-lg border border-navy-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-navy-700 mb-1">Source Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as SourceChannel)}
              className="w-full text-xs p-2.5 rounded-lg border border-navy-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="Phone call note">Phone call note</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Facebook Messenger">Facebook Messenger</option>
              <option value="Facebook comment">Facebook comment</option>
              <option value="Website form">Website form</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-navy-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EnquiryCategory)}
              className="w-full text-xs p-2.5 rounded-lg border border-navy-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="sales_enquiry">Sales Enquiry</option>
              <option value="programme_info">Programme Info</option>
              <option value="corporate_training">Corporate Training</option>
              <option value="payment_support">Payment Support</option>
              <option value="refund_cancellation">Refund / Cancellation</option>
              <option value="general_support">General Support</option>
              <option value="job_application">Job Application</option>
              <option value="spam">Spam</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-navy-700 mb-1">
            Enquiry Content / Note <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type or paste the original customer message or call summary..."
            className="w-full text-xs p-2.5 rounded-lg border border-navy-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-navy-700 mb-1">Programme Interest</label>
            <select
              value={programmeInterest}
              onChange={(e) => setProgrammeInterest(e.target.value as ProgrammeInterest)}
              className="w-full text-xs p-2.5 rounded-lg border border-navy-200 bg-white focus:outline-none"
            >
              <option value="unknown">Unknown / Not specified</option>
              <option value="bootcamp">Bootcamp</option>
              <option value="fellowship">Fellowship</option>
              <option value="corporate_training">Corporate Training</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-navy-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityLevel)}
              className="w-full text-xs p-2.5 rounded-lg border border-navy-200 bg-white focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-navy-700 mb-1">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as DetectedLanguage)}
              className="w-full text-xs p-2.5 rounded-lg border border-navy-200 bg-white focus:outline-none"
            >
              <option value="banglish">Banglish</option>
              <option value="bangla">Bangla (বাংলা)</option>
              <option value="english">English</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-navy-700 mb-1">
            Internal Staff Notes <span className="text-navy-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="e.g. Caller mentioned they work at a textile firm..."
            className="w-full text-xs p-2.5 rounded-lg border border-navy-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div className="pt-3 border-t border-navy-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-navy-600 hover:text-navy-900 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Record Enquiry'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

