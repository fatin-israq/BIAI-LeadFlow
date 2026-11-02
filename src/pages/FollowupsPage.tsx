import React, { useState, useEffect } from 'react';
import { FollowUpTask, Lead } from '../types';
import { storage } from '../services/storageAdapter';
import {
  formatDateTime,
  formatTimeAgo,
  isOverdue48Hours,
} from '../lib/utils';
import {
  ClockAlert,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Plus,
  Clock,
  Check,
  User,
  ArrowRight,
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';

export const FollowupsPage: React.FC = () => {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'pending' | 'completed'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // New task modal state
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tList, lList] = await Promise.all([
        storage.getFollowUpTasks(),
        storage.getLeads(),
      ]);
      setTasks(tList);
      setLeads(lList);
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await storage.completeFollowUpTask(taskId);
      showToast('Follow-up task marked completed', 'success');
      loadData();
    } catch {
      showToast('Failed to complete task', 'error');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const due = newDueDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await storage.createFollowUpTask({
        lead_id: selectedLeadId || null,
        enquiry_id: null,
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        due_at: due,
        completed_at: null,
        status: 'pending',
      });

      showToast('Task scheduled successfully', 'success');
      setIsNewTaskOpen(false);
      setNewTitle('');
      setNewDescription('');
      loadData();
    } catch {
      showToast('Failed to create task', 'error');
    }
  };

  const overdueCount = tasks.filter((t) => t.status === 'pending' && t.is_overdue).length;
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'overdue') return t.status === 'pending' && t.is_overdue;
    if (filter === 'pending') return t.status === 'pending';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & KPI Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900 tracking-tight">
            Follow-Up & 48-Hour SLA Monitor
          </h2>
          <p className="text-xs text-navy-500 mt-0.5">
            Automated alerts for leads exceeding the 48-hour follow-up threshold in accordance with BIAI SLA.
          </p>
        </div>

        <button
          onClick={() => setIsNewTaskOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Task</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setFilter('overdue')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filter === 'overdue'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400'
              : 'bg-white border-navy-200/80 hover:border-rose-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wide">
              48h SLA Overdue
            </span>
            <ClockAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{overdueCount}</div>
          <p className="text-[11px] text-rose-600 mt-1">Requires immediate outreach</p>
        </div>

        <div
          onClick={() => setFilter('pending')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filter === 'pending'
              ? 'bg-brand-50 border-brand-300 ring-2 ring-brand-400'
              : 'bg-white border-navy-200/80 hover:border-brand-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-600 uppercase tracking-wide">
              Pending Outreach
            </span>
            <Clock className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-bold text-brand-700 mt-1">{pendingCount}</div>
          <p className="text-[11px] text-navy-500 mt-1">Active tasks in progress</p>
        </div>

        <div
          onClick={() => setFilter('completed')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filter === 'completed'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400'
              : 'bg-white border-navy-200/80 hover:border-emerald-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
              Resolved & Contacted
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{completedCount}</div>
          <p className="text-[11px] text-navy-500 mt-1">Tasks resolved successfully</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-navy-200 pb-2 text-xs font-semibold text-navy-600">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            filter === 'all'
              ? 'bg-navy-900 text-white'
              : 'hover:bg-navy-100 text-navy-700'
          }`}
        >
          All Tasks ({tasks.length})
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            filter === 'overdue'
              ? 'bg-rose-600 text-white'
              : 'hover:bg-rose-50 text-rose-700'
          }`}
        >
          Overdue ({overdueCount})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            filter === 'pending'
              ? 'bg-brand-600 text-white'
              : 'hover:bg-brand-50 text-brand-700'
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            filter === 'completed'
              ? 'bg-emerald-600 text-white'
              : 'hover:bg-emerald-50 text-emerald-700'
          }`}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-xl border border-navy-200/80 shadow-2xs divide-y divide-navy-100">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-xs text-navy-400">
            No follow-up tasks match the selected filter.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const linkedLead = leads.find((l) => l.id === task.lead_id);
            const isDone = task.status === 'completed';

            return (
              <div
                key={task.id}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-navy-50/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    disabled={isDone}
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                      isDone
                        ? 'bg-emerald-600 border-emerald-600 text-white cursor-default'
                        : 'border-navy-300 hover:border-brand-500 text-transparent hover:text-navy-400'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`text-xs font-bold ${
                          isDone ? 'line-through text-navy-400' : 'text-navy-900'
                        }`}
                      >
                        {task.title}
                      </h4>
                      {task.is_overdue && !isDone && (
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200">
                          SLA Breached (&gt;48h)
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs text-navy-600">{task.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-navy-500 pt-0.5">
                      {linkedLead && (
                        <span className="flex items-center gap-1 font-semibold text-navy-700">
                          <User className="w-3 h-3 text-brand-600" />
                          {linkedLead.contact_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-navy-400" />
                        Due: {formatDateTime(task.due_at)}
                      </span>
                      {isDone && task.completed_at && (
                        <span className="text-emerald-700 font-medium">
                          Completed: {formatTimeAgo(task.completed_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!isDone && (
                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    className="self-start md:self-center px-3 py-1.5 text-xs font-semibold text-navy-700 hover:text-navy-900 bg-white border border-navy-200 hover:bg-navy-50 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
                  >
                    Mark Done
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Schedule Custom Task Modal */}
      <Modal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        title="Schedule Follow-Up Task"
        subtitle="Create an internal task or callback reminder"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-navy-700 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Call regarding corporate discount quotation"
              className="w-full text-xs p-2.5 rounded-lg border border-navy-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy-700 mb-1">
              Associate with Lead <span className="text-navy-400 font-normal">(optional)</span>
            </label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-navy-200 bg-white"
            >
              <option value="">None / General Task</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.contact_name} ({lead.source_channel} • {lead.programme_interest})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy-700 mb-1">
              Due Date & Time
            </label>
            <input
              type="datetime-local"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-navy-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy-700 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Additional instructions..."
              className="w-full text-xs p-2.5 rounded-lg border border-navy-200"
            />
          </div>

          <div className="pt-3 border-t border-navy-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewTaskOpen(false)}
              className="px-4 py-2 text-xs font-medium text-navy-600 hover:text-navy-900 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg cursor-pointer"
            >
              Create Task
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

