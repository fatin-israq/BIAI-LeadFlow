import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Lead, PipelineStatus, Enquiry } from '../types';
import { storage } from '../services/storageAdapter';
import {
  formatTimeAgo,
  getPipelineStatusColor,
  getPriorityBadge,
  isOverdue48Hours,
} from '../lib/utils';
import {
  Phone,
  Building,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  MoreVertical,
  Plus,
} from 'lucide-react';
import { LeadDetailModal } from '../components/leads/LeadDetailModal';
import { useToast } from '../components/ui/Toast';

const PIPELINE_COLUMNS: { id: PipelineStatus; title: string; color: string }[] = [
  { id: 'New', title: 'New Leads', color: 'border-t-blue-500' },
  { id: 'Contacted', title: 'Contacted', color: 'border-t-amber-500' },
  { id: 'Interested', title: 'Interested', color: 'border-t-indigo-500' },
  { id: 'Paid', title: 'Paid / Enrolled', color: 'border-t-emerald-500' },
  { id: 'Lost', title: 'Lost / Closed', color: 'border-t-slate-400' },
];

export const PipelinePage: React.FC = () => {
  const { showToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const data = await storage.getLeads();
      setLeads(data);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as PipelineStatus;
    const targetLead = leads.find((l) => l.id === draggableId);

    if (!targetLead) return;

    // Optimistic UI update
    const previousStatus = targetLead.pipeline_status;
    const updatedList = leads.map((l) =>
      l.id === draggableId ? { ...l, pipeline_status: newStatus } : l
    );
    setLeads(updatedList);

    try {
      await storage.updateLeadStatus(draggableId, newStatus);
      showToast(
        `Moved ${targetLead.contact_name} to "${newStatus}"`,
        newStatus === 'Paid' ? 'success' : 'info'
      );
    } catch (err) {
      console.error('Status update failed:', err);
      showToast('Failed to update pipeline stage', 'error');
      // Revert
      loadLeads();
    }
  };

  const handleStatusDropdownChange = async (leadId: string, newStatus: PipelineStatus) => {
    try {
      await storage.updateLeadStatus(leadId, newStatus);
      showToast(`Lead moved to "${newStatus}"`, 'success');
      loadLeads();
    } catch {
      showToast('Failed to change status', 'error');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Pipeline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900 tracking-tight">
            Sales Pipeline Kanban
          </h2>
          <p className="text-xs text-navy-500 mt-0.5">
            Manage genuine qualified prospects across 5 sales stages. Drag cards or use the stage selector.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-navy-50 text-navy-700 border border-navy-200">
            Total Leads: <strong className="text-navy-900">{leads.length}</strong>
          </span>
        </div>
      </div>

      {/* Kanban Board Container */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {PIPELINE_COLUMNS.map((column) => {
            const columnLeads = leads.filter(
              (l) => l.pipeline_status === column.id
            );

            return (
              <div
                key={column.id}
                className="bg-navy-50/60 rounded-xl border border-navy-200 flex flex-col max-h-[calc(100vh-210px)]"
              >
                {/* Column Header */}
                <div
                  className={`p-3.5 border-b border-navy-200/80 bg-white rounded-t-xl border-t-4 ${column.color} flex items-center justify-between sticky top-0 z-10`}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-navy-800">
                      {column.title}
                    </h3>
                    <span className="w-5 h-5 rounded-full bg-navy-100 text-navy-700 text-[10px] font-bold flex items-center justify-center">
                      {columnLeads.length}
                    </span>
                  </div>
                </div>

                {/* Droppable Card Area */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-2.5 flex-1 overflow-y-auto space-y-2.5 min-h-[300px] transition-colors ${
                        snapshot.isDraggingOver ? 'bg-brand-50/50' : ''
                      }`}
                    >
                      {columnLeads.map((lead, index) => {
                        const priBadge = getPriorityBadge(lead.priority);
                        const isOverdue = isOverdue48Hours(
                          lead.last_interaction_at
                        );

                        return (
                          <Draggable
                            key={lead.id}
                            draggableId={lead.id}
                            index={index}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setIsDetailOpen(true);
                                }}
                                className={`p-3.5 bg-white rounded-lg border border-navy-200/90 shadow-2xs hover:shadow-xs hover:border-brand-300 transition-all cursor-pointer group ${
                                  dragSnapshot.isDragging ? 'shadow-lg rotate-1 ring-2 ring-brand-500' : ''
                                }`}
                              >
                                {/* Card Title & Badges */}
                                <div className="flex items-start justify-between gap-1.5">
                                  <h4 className="text-xs font-bold text-navy-900 group-hover:text-brand-700 transition-colors">
                                    {lead.contact_name}
                                  </h4>
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${priBadge.className}`}
                                  >
                                    {lead.priority.toUpperCase()}
                                  </span>
                                </div>

                                {/* Company Name if B2B */}
                                {lead.company_name && (
                                  <div className="flex items-center gap-1 text-[11px] text-purple-700 font-semibold mt-1">
                                    <Building className="w-3 h-3" />
                                    <span className="truncate">{lead.company_name}</span>
                                  </div>
                                )}

                                {/* Programme Interest */}
                                <div className="mt-2 flex items-center justify-between text-[11px]">
                                  <span className="px-2 py-0.5 rounded bg-navy-50 text-navy-700 font-semibold border border-navy-100 text-[10px]">
                                    {lead.programme_interest.toUpperCase()}
                                  </span>
                                  <span className="text-navy-400 text-[10px]">
                                    {lead.source_channel}
                                  </span>
                                </div>

                                {/* Multi-message indicator (e.g. Rafi Ahmed) */}
                                {lead.enquiry_ids.length > 1 && (
                                  <div className="mt-1.5 text-[10px] text-brand-600 bg-brand-50 px-2 py-0.5 rounded font-medium flex items-center justify-between">
                                    <span>{lead.enquiry_ids.length} messages linked</span>
                                    <span>Exact Phone Match</span>
                                  </div>
                                )}

                                {/* Card Footer: SLA & Stage Selector */}
                                <div className="mt-3 pt-2.5 border-t border-navy-100 flex items-center justify-between text-[10px]">
                                  <span
                                    className={`flex items-center gap-1 font-medium ${
                                      isOverdue
                                        ? 'text-rose-600 font-bold'
                                        : 'text-navy-500'
                                    }`}
                                  >
                                    <Clock className="w-3 h-3" />
                                    {formatTimeAgo(lead.last_interaction_at)}
                                    {isOverdue && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    )}
                                  </span>

                                  {/* Quick Stage Dropdown */}
                                  <select
                                    value={lead.pipeline_status}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                      handleStatusDropdownChange(
                                        lead.id,
                                        e.target.value as PipelineStatus
                                      )
                                    }
                                    className="text-[10px] bg-navy-50 border border-navy-200 rounded px-1.5 py-0.5 text-navy-700 font-semibold focus:outline-none"
                                  >
                                    <option value="New">New</option>
                                    <option value="Contacted">Contacted</option>
                                    <option value="Interested">Interested</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Lost">Lost</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                      {columnLeads.length === 0 && (
                        <div className="p-4 text-center text-xs text-navy-400 italic">
                          No leads in {column.title}
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Lead Detail Modal */}
      <LeadDetailModal
        lead={selectedLead}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onStatusChange={handleStatusDropdownChange}
        onUpdated={loadLeads}
      />
    </div>
  );
};
