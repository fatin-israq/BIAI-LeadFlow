import React, { useState, useEffect } from 'react';
import { Lead, Enquiry, ActivityLog, PipelineStatus, FollowUpTask } from '../../types';
import { Modal } from '../ui/Modal';
import {
  formatDateTime,
  formatTimeAgo,
  getPipelineStatusColor,
  getPriorityBadge,
  isOverdue48Hours,
} from '../../lib/utils';
import {
  Phone,
  Building,
  Calendar,
  Clock,
  Sparkles,
  History,
  MessageSquare,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { storage } from '../../services/storageAdapter';
import { useToast } from '../ui/Toast';

interface LeadDetailModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (leadId: string, newStatus: PipelineStatus) => void;
  onUpdated?: () => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  isOpen,
  onClose,
  onStatusChange,
  onUpdated,
}) => {
  const { showToast } = useToast();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [notes, setNotes] = useState(lead?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  useEffect(() => {
    if (lead) {
      setNotes(lead.notes || '');
      loadLeadDetails(lead);
    }
  }, [lead]);

  const loadLeadDetails = async (targetLead: Lead) => {
    try {
      const allEnquiries = await storage.getEnquiries();
      const linked = allEnquiries.filter((e) => targetLead.enquiry_ids.includes(e.id));
      setEnquiries(linked);

      const logs = await storage.getActivityLogs(targetLead.id);
      setActivityLogs(logs);
    } catch (err) {
      console.error('Failed to load lead details:', err);
    }
  };

  if (!lead) return null;

  const statusColor = getPipelineStatusColor(lead.pipeline_status);
  const priBadge = getPriorityBadge(lead.priority);
  const isOverdue = isOverdue48Hours(lead.last_interaction_at);

  const handleStatusSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as PipelineStatus;
    if (onStatusChange) {
      onStatusChange(lead.id, newStatus);
    }
  };

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      await storage.updateLead({
        ...lead,
        notes,
      });
      showToast('Lead notes saved successfully', 'success');
      if (onUpdated) onUpdated();
    } catch {
      showToast('Failed to save notes', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      const due = taskDueDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await storage.createFollowUpTask({
        lead_id: lead.id,
        enquiry_id: lead.enquiry_ids[0] || null,
        title: taskTitle.trim(),
        description: `Follow-up created for ${lead.contact_name}`,
        due_at: due,
        completed_at: null,
        status: 'pending',
      });
      showToast('Follow-up task created', 'success');
      setShowTaskForm(false);
      setTaskTitle('');
      loadLeadDetails(lead);
      if (onUpdated) onUpdated();
    } catch {
      showToast('Failed to create task', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lead.contact_name}
      subtitle={`Sales Pipeline Lead • ID: ${lead.id.substring(0, 8)}`}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Top summary grid */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-navy-50 rounded-xl border border-navy-100">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-navy-500 uppercase tracking-wider block">
              Current Stage
            </span>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${statusColor.dot}`} />
              <select
                value={lead.pipeline_status}
                onChange={handleStatusSelect}
                className="text-xs font-bold rounded-md bg-white border border-navy-200 py-1 px-2.5 text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Interested">Interested</option>
                <option value="Paid">Paid</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-navy-500 uppercase tracking-wider block">
              Programme Interest
            </span>
            <span className="text-xs font-semibold text-navy-800 bg-white border border-navy-200 px-2.5 py-1 rounded-md block">
              {lead.programme_interest.toUpperCase()}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-navy-500 uppercase tracking-wider block">
              Priority
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${priBadge.className} block`}>
              {priBadge.label}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-navy-500 uppercase tracking-wider block">
              Last Interaction
            </span>
            <span className={`text-xs font-semibold flex items-center gap-1 ${isOverdue ? 'text-rose-600' : 'text-navy-700'}`}>
              <Clock className="w-3.5 h-3.5" />
              {formatTimeAgo(lead.last_interaction_at)}
              {isOverdue && <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">48h SLA Overdue</span>}
            </span>
          </div>
        </div>

        {/* Contact info details */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white border border-navy-200 rounded-lg">
            <span className="text-navy-500 font-medium block">Phone Number</span>
            <span className="font-semibold text-navy-900 flex items-center gap-1.5 mt-1">
              <Phone className="w-3.5 h-3.5 text-navy-400" />
              {lead.phone || <em className="text-navy-400 font-normal">None provided</em>}
            </span>
          </div>
          <div className="p-3 bg-white border border-navy-200 rounded-lg">
            <span className="text-navy-500 font-medium block">Organization / Company</span>
            <span className="font-semibold text-navy-900 flex items-center gap-1.5 mt-1">
              <Building className="w-3.5 h-3.5 text-navy-400" />
              {lead.company_name || 'Individual Learner'}
            </span>
          </div>
        </div>

        {/* Linked enquiries timeline (Rafi Ahmed deduplication test) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-navy-800 uppercase tracking-wide flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-brand-600" />
              Linked Enquiries ({enquiries.length})
            </label>
            {enquiries.length > 1 && (
              <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                Multi-enquiry contact (Deduplicated)
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            {enquiries.map((enq, index) => (
              <div
                key={enq.id}
                className="p-3.5 bg-navy-50/60 border border-navy-200/80 rounded-lg text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-navy-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-[10px]">
                      #{index + 1}
                    </span>
                    via {enq.source_channel}
                  </span>
                  <span className="text-navy-500 text-[11px]">
                    {formatDateTime(enq.received_at)}
                  </span>
                </div>
                <p className="text-navy-800 font-mono bg-white p-2.5 rounded border border-navy-100 leading-relaxed">
                  "{enq.original_message}"
                </p>
                {enq.ai_suggested_reply && (
                  <p className="text-navy-600 text-[11px] italic">
                    AI reply draft: "{enq.ai_suggested_reply.substring(0, 100)}..."
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Lead notes */}
        <div>
          <label className="block text-xs font-bold text-navy-800 mb-1.5 uppercase tracking-wide">
            Internal Lead Notes & Strategy
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add context, qualification remarks, or next steps..."
            className="w-full text-xs p-3 bg-white border border-navy-200 rounded-lg text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
          <div className="flex justify-end mt-1.5">
            <button
              onClick={handleSaveNotes}
              disabled={isSaving}
              className="text-xs font-semibold px-3 py-1.5 bg-navy-100 hover:bg-navy-200 text-navy-800 rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>

        {/* Follow-up task creation quick toggle */}
        <div className="p-3.5 bg-brand-50/50 border border-brand-100 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-bold text-navy-800">
                Actionable Follow-up
              </span>
            </div>
            {!showTaskForm && (
              <button
                onClick={() => setShowTaskForm(true)}
                className="text-xs font-semibold text-brand-700 hover:text-brand-900 flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Schedule Task
              </button>
            )}
          </div>

          {showTaskForm && (
            <form onSubmit={handleCreateTask} className="mt-3 space-y-2.5">
              <input
                type="text"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Call regarding corporate cohort curriculum..."
                className="w-full text-xs p-2 bg-white border border-navy-200 rounded-md"
              />
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="text-xs p-1.5 bg-white border border-navy-200 rounded-md text-navy-700"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-brand-600 text-white font-semibold text-xs rounded-md hover:bg-brand-700 cursor-pointer"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowTaskForm(false)}
                  className="px-2 py-1.5 text-navy-500 hover:text-navy-800 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Activity audit log history */}
        <div>
          <label className="text-xs font-bold text-navy-800 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <History className="w-3.5 h-3.5 text-navy-500" />
            Activity History & Audit Trail
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {activityLogs.length === 0 ? (
              <p className="text-xs text-navy-400 italic">No activity recorded yet.</p>
            ) : (
              activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-2.5 text-xs p-2.5 rounded bg-white border border-navy-100"
                >
                  <span className="w-2 h-2 rounded-full bg-brand-500 mt-1 shrink-0" />
                  <div className="flex-1">
                    <p className="text-navy-800 font-medium">{log.description}</p>
                    <span className="text-[10px] text-navy-400">
                      {formatDateTime(log.created_at)} • by {log.created_by || 'system'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-navy-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-navy-600 hover:text-navy-900 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

