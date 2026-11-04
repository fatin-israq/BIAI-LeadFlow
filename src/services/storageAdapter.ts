import {
  Enquiry,
  Lead,
  FollowUpTask,
  ActivityLog,
  DashboardMetrics,
  PipelineStatus,
  EnquiryCategory,
  SourceChannel,
  PriorityLevel,
  DetectedLanguage,
  HandlingStatus,
} from '../types';
import { processSampleData, generateId } from './dataImportService';
import { isOverdue48Hours, isLeadEligibleCategory, normalizePhone } from '../lib/utils';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { realtimeService } from './realtimeService';

const STORAGE_KEYS = {
  ENQUIRIES: 'biai_enquiries_v1',
  LEADS: 'biai_leads_v1',
  TASKS: 'biai_tasks_v1',
  LOGS: 'biai_logs_v1',
  INITIALIZED: 'biai_initialized_v1',
};

// In-memory fallback for Node/testing/SSR environments where window.localStorage is unavailable
const memoryStore = new Map<string, string>();

function safeGetItem(key: string): string | null {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage.getItem(key);
  }
  return memoryStore.get(key) || null;
}

function safeSetItem(key: string, value: string): void {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    window.localStorage.setItem(key, value);
  } else {
    memoryStore.set(key, value);
  }
}

class StorageAdapter {
  private isDemoMode: boolean;

  constructor() {
    const isTest =
      (typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || process.env?.VITEST === 'true')) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test');

    const forceDemo =
      isTest ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEMO_MODE === 'true') ||
      !isSupabaseConfigured;

    this.isDemoMode = forceDemo;

    if (this.isDemoMode) {
      this.ensureDemoInitialized();
    }
  }

  public isUsingDemo(): boolean {
    return this.isDemoMode;
  }

  public ensureDemoInitialized(force = false): void {
    const initialized = safeGetItem(STORAGE_KEYS.INITIALIZED);
    if (!initialized || force) {
      const data = processSampleData();
      safeSetItem(STORAGE_KEYS.ENQUIRIES, JSON.stringify(data.enquiries));
      safeSetItem(STORAGE_KEYS.LEADS, JSON.stringify(data.leads));
      safeSetItem(STORAGE_KEYS.TASKS, JSON.stringify(data.tasks));
      safeSetItem(STORAGE_KEYS.LOGS, JSON.stringify(data.activityLogs));
      safeSetItem(STORAGE_KEYS.INITIALIZED, 'true');
    }
  }

  public resetDemoData(): void {
    this.ensureDemoInitialized(true);
    realtimeService.broadcastLocalChange('enquiries', 'RESET');
    realtimeService.broadcastLocalChange('leads', 'RESET');
    realtimeService.broadcastLocalChange('follow_up_tasks', 'RESET');
  }

  // --- ENQUIRIES ---

  public async getEnquiries(filters?: {
    search?: string;
    channel?: SourceChannel;
    language?: DetectedLanguage;
    category?: EnquiryCategory;
    priority?: PriorityLevel;
    handlingStatus?: HandlingStatus;
  }): Promise<Enquiry[]> {
    if (this.isDemoMode || !supabase) {
      const raw = safeGetItem(STORAGE_KEYS.ENQUIRIES);
      let list: Enquiry[] = raw ? JSON.parse(raw) : [];

      if (filters) {
        if (filters.search) {
          const q = filters.search.toLowerCase();
          list = list.filter(
            (e) =>
              e.sender_name?.toLowerCase().includes(q) ||
              e.phone?.includes(q) ||
              e.original_message.toLowerCase().includes(q)
          );
        }
        if (filters.channel) {
          list = list.filter((e) => e.source_channel === filters.channel);
        }
        if (filters.language) {
          list = list.filter((e) => e.detected_language === filters.language);
        }
        if (filters.category) {
          list = list.filter((e) => e.category === filters.category);
        }
        if (filters.priority) {
          list = list.filter((e) => e.priority === filters.priority);
        }
        if (filters.handlingStatus) {
          list = list.filter((e) => e.handling_status === filters.handlingStatus);
        }
      }

      // Sort by received_at descending
      return list.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
    }

    // Supabase Mode
    let query = supabase.from('enquiries').select('*').order('received_at', { ascending: false });

    if (filters?.channel) query = query.eq('source_channel', filters.channel);
    if (filters?.language) query = query.eq('detected_language', filters.language);
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.priority) query = query.eq('priority', filters.priority);
    if (filters?.handlingStatus) query = query.eq('handling_status', filters.handlingStatus);
    if (filters?.search) {
      query = query.or(
        `sender_name.ilike.%${filters.search}%,original_message.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  public async getEnquiryById(id: string): Promise<Enquiry | null> {
    if (this.isDemoMode || !supabase) {
      const enquiries = await this.getEnquiries();
      return enquiries.find((e) => e.id === id) || null;
    }

    const { data, error } = await supabase.from('enquiries').select('*').eq('id', id).single();
    if (error) return null;
    return data;
  }

  public async saveEnquiry(enquiry: Omit<Enquiry, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<Enquiry> {
    const now = new Date().toISOString();
    const id = enquiry.id || generateId('enq');
    const normPhone = normalizePhone(enquiry.phone);

    const fullEnquiry: Enquiry = {
      ...enquiry,
      id,
      normalized_phone: normPhone,
      created_at: now,
      updated_at: now,
    };

    if (this.isDemoMode || !supabase) {
      const raw = safeGetItem(STORAGE_KEYS.ENQUIRIES);
      const list: Enquiry[] = raw ? JSON.parse(raw) : [];
      const existingIdx = list.findIndex((e) => e.id === id);

      if (existingIdx >= 0) {
        list[existingIdx] = { ...list[existingIdx], ...fullEnquiry, updated_at: now };
      } else {
        list.unshift(fullEnquiry);
      }

      safeSetItem(STORAGE_KEYS.ENQUIRIES, JSON.stringify(list));

      // Check if lead creation/attachment is required
      if (isLeadEligibleCategory(fullEnquiry.category) && !fullEnquiry.lead_id) {
        await this.handleLeadAttachment(fullEnquiry);
      }

      // Add log
      await this.addActivityLog({
        id: generateId('log'),
        enquiry_id: id,
        event_type: 'enquiry_received',
        description: `Enquiry recorded from ${fullEnquiry.source_channel} (${fullEnquiry.category})`,
        metadata: { sender: fullEnquiry.sender_name, priority: fullEnquiry.priority },
        created_at: now,
        created_by: 'user',
      });

      realtimeService.broadcastLocalChange('enquiries', 'INSERT', fullEnquiry);
      return fullEnquiry;
    }

    // Supabase Mode
    const { data: savedEnquiry, error } = await supabase.from('enquiries').upsert(fullEnquiry).select().single();
    if (error) {
      console.error('Supabase save error:', error);
      throw error;
    }

    // Check if lead creation/attachment is required in Supabase (if trigger didn't handle it)
    if (isLeadEligibleCategory(savedEnquiry.category) && !savedEnquiry.lead_id) {
      try {
        await this.handleLeadAttachment(savedEnquiry);
      } catch (attachErr) {
        console.warn('Lead attachment warning:', attachErr);
      }
    }

    // Add activity log in Supabase
    try {
      await this.addActivityLog({
        id: generateId(),
        enquiry_id: savedEnquiry.id,
        lead_id: savedEnquiry.lead_id || null,
        event_type: 'enquiry_received',
        description: `Enquiry recorded from ${savedEnquiry.source_channel} (${savedEnquiry.category})`,
        metadata: { sender: savedEnquiry.sender_name, priority: savedEnquiry.priority },
        created_at: now,
        created_by: 'user',
      });
    } catch (logErr) {
      console.warn('Activity log warning:', logErr);
    }

    realtimeService.broadcastLocalChange('enquiries', 'INSERT', savedEnquiry);
    return savedEnquiry;
  }

  private async handleLeadAttachment(enquiry: Enquiry): Promise<void> {
    const leads = await this.getLeads();
    const normPhone = enquiry.normalized_phone;

    let targetLead: Lead | null = null;

    if (normPhone) {
      targetLead = leads.find((l) => l.normalized_phone === normPhone) || null;
    }

    const now = new Date().toISOString();

    if (targetLead) {
      // Attach to existing lead
      if (!targetLead.enquiry_ids.includes(enquiry.id)) {
        targetLead.enquiry_ids.push(enquiry.id);
      }
      targetLead.last_interaction_at = now;
      targetLead.updated_at = now;
      await this.updateLead(targetLead);

      enquiry.lead_id = targetLead.id;

      if (this.isDemoMode || !supabase) {
        const rawEnquiries = safeGetItem(STORAGE_KEYS.ENQUIRIES);
        if (rawEnquiries) {
          const list: Enquiry[] = JSON.parse(rawEnquiries);
          const idx = list.findIndex((e) => e.id === enquiry.id);
          if (idx >= 0) {
            list[idx].lead_id = targetLead.id;
            safeSetItem(STORAGE_KEYS.ENQUIRIES, JSON.stringify(list));
          }
        }
      } else {
        await supabase.from('enquiries').update({ lead_id: targetLead.id }).eq('id', enquiry.id);
      }

      await this.addActivityLog({
        id: generateId('log'),
        lead_id: targetLead.id,
        enquiry_id: enquiry.id,
        event_type: 'enquiry_attached',
        description: `New enquiry linked to existing lead ${targetLead.contact_name} via phone ${normPhone}`,
        created_at: now,
        created_by: 'system',
      });
    } else {
      // Create new Lead
      const newLeadId = generateId('lead');
      const newLead: Lead = {
        id: newLeadId,
        contact_name: enquiry.sender_name || 'Anonymous Contact',
        phone: enquiry.phone,
        normalized_phone: normPhone,
        company_name: null,
        source_channel: enquiry.source_channel,
        programme_interest: enquiry.programme_interest,
        pipeline_status: 'New',
        priority: enquiry.priority,
        notes: enquiry.internal_notes || null,
        estimated_value: enquiry.category === 'corporate_training' ? 150000 : 25000,
        enquiry_ids: [enquiry.id],
        last_interaction_at: enquiry.received_at,
        last_contacted_at: null,
        next_follow_up_at: null,
        created_at: now,
        updated_at: now,
      };

      await this.createLead(newLead);
      enquiry.lead_id = newLeadId;

      if (this.isDemoMode || !supabase) {
        const rawEnquiries = safeGetItem(STORAGE_KEYS.ENQUIRIES);
        if (rawEnquiries) {
          const list: Enquiry[] = JSON.parse(rawEnquiries);
          const idx = list.findIndex((e) => e.id === enquiry.id);
          if (idx >= 0) {
            list[idx].lead_id = newLeadId;
            safeSetItem(STORAGE_KEYS.ENQUIRIES, JSON.stringify(list));
          }
        }
      } else {
        await supabase.from('enquiries').update({ lead_id: newLeadId }).eq('id', enquiry.id);
      }

      // Automatically schedule a 48h SLA response follow-up task
      const dueAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      await this.createFollowUpTask({
        lead_id: newLeadId,
        enquiry_id: enquiry.id,
        title: `Initial response SLA follow-up: ${newLead.contact_name}`,
        description: `Auto-generated 48-hour SLA reminder for incoming enquiry via ${enquiry.source_channel}`,
        due_at: dueAt,
        status: 'pending',
        completed_at: null,
      });
    }
  }

  // --- LEADS ---

  public async getLeads(): Promise<Lead[]> {
    if (this.isDemoMode || !supabase) {
      const raw = safeGetItem(STORAGE_KEYS.LEADS);
      return raw ? JSON.parse(raw) : [];
    }

    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  public async getLeadById(id: string): Promise<Lead | null> {
    const leads = await this.getLeads();
    return leads.find((l) => l.id === id) || null;
  }

  public async createLead(lead: Lead): Promise<Lead> {
    if (this.isDemoMode || !supabase) {
      const leads = await this.getLeads();
      leads.unshift(lead);
      safeSetItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
      realtimeService.broadcastLocalChange('leads', 'INSERT', lead);
      return lead;
    }

    const { data, error } = await supabase.from('leads').insert(lead).select().single();
    if (error) throw error;
    realtimeService.broadcastLocalChange('leads', 'INSERT', data);
    return data;
  }

  public async updateLead(lead: Lead): Promise<Lead> {
    const now = new Date().toISOString();
    const updated = { ...lead, updated_at: now };

    if (this.isDemoMode || !supabase) {
      const leads = await this.getLeads();
      const idx = leads.findIndex((l) => l.id === lead.id);
      if (idx >= 0) {
        leads[idx] = updated;
        safeSetItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
      }
      realtimeService.broadcastLocalChange('leads', 'UPDATE', updated);
      return updated;
    }

    const { data, error } = await supabase.from('leads').update(updated).eq('id', lead.id).select().single();
    if (error) throw error;
    realtimeService.broadcastLocalChange('leads', 'UPDATE', data);
    return data;
  }

  public async updateLeadStatus(leadId: string, newStatus: PipelineStatus): Promise<Lead> {
    const lead = await this.getLeadById(leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    const oldStatus = lead.pipeline_status;
    lead.pipeline_status = newStatus;
    lead.last_contacted_at = new Date().toISOString();
    lead.updated_at = new Date().toISOString();

    const updated = await this.updateLead(lead);

    await this.addActivityLog({
      id: generateId('log'),
      lead_id: leadId,
      event_type: 'status_changed',
      description: `Stage changed from "${oldStatus}" to "${newStatus}"`,
      metadata: { oldStatus, newStatus },
      created_at: new Date().toISOString(),
      created_by: 'user',
    });

    realtimeService.broadcastLocalChange('leads', 'UPDATE', updated);
    return updated;
  }

  // --- FOLLOW-UP TASKS ---

  public async getFollowUpTasks(): Promise<FollowUpTask[]> {
    if (this.isDemoMode || !supabase) {
      const raw = safeGetItem(STORAGE_KEYS.TASKS);
      const tasks: FollowUpTask[] = raw ? JSON.parse(raw) : [];

      // Dynamic check for overdue status
      return tasks.map((t) => ({
        ...t,
        is_overdue: t.status === 'pending' && isOverdue48Hours(t.due_at),
      }));
    }

    const { data, error } = await supabase.from('follow_up_tasks').select('*').order('due_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  public async createFollowUpTask(task: Omit<FollowUpTask, 'id' | 'created_at'>): Promise<FollowUpTask> {
    const now = new Date().toISOString();
    const fullTask: FollowUpTask = {
      ...task,
      id: generateId('task'),
      created_at: now,
      is_overdue: isOverdue48Hours(task.due_at),
    };

    if (this.isDemoMode || !supabase) {
      const tasks = await this.getFollowUpTasks();
      tasks.unshift(fullTask);
      safeSetItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));

      await this.addActivityLog({
        id: generateId('log'),
        lead_id: fullTask.lead_id,
        event_type: 'followup_created',
        description: `Follow-up task scheduled: ${fullTask.title}`,
        created_at: now,
        created_by: 'user',
      });

      realtimeService.broadcastLocalChange('follow_up_tasks', 'INSERT', fullTask);
      return fullTask;
    }

    const { data, error } = await supabase.from('follow_up_tasks').insert(fullTask).select().single();
    if (error) throw error;
    realtimeService.broadcastLocalChange('follow_up_tasks', 'INSERT', data);
    return data;
  }

  public async completeFollowUpTask(taskId: string): Promise<void> {
    const now = new Date().toISOString();

    if (this.isDemoMode || !supabase) {
      const tasks = await this.getFollowUpTasks();
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        task.status = 'completed';
        task.completed_at = now;
        safeSetItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));

        await this.addActivityLog({
          id: generateId('log'),
          lead_id: task.lead_id,
          event_type: 'followup_completed',
          description: `Follow-up task completed: ${task.title}`,
          created_at: now,
          created_by: 'user',
        });
      }
      realtimeService.broadcastLocalChange('follow_up_tasks', 'UPDATE', { id: taskId, status: 'completed' });
      return;
    }

    await supabase
      .from('follow_up_tasks')
      .update({ status: 'completed', completed_at: now })
      .eq('id', taskId);
    realtimeService.broadcastLocalChange('follow_up_tasks', 'UPDATE', { id: taskId, status: 'completed' });
  }

  // --- ACTIVITY LOGS ---

  public async getActivityLogs(leadId?: string, enquiryId?: string): Promise<ActivityLog[]> {
    if (this.isDemoMode || !supabase) {
      const raw = safeGetItem(STORAGE_KEYS.LOGS);
      let logs: ActivityLog[] = raw ? JSON.parse(raw) : [];

      if (leadId) {
        logs = logs.filter((l) => l.lead_id === leadId);
      }
      if (enquiryId) {
        logs = logs.filter((l) => l.enquiry_id === enquiryId);
      }

      return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    let query = supabase.from('activity_logs').select('*').order('created_at', { ascending: false });
    if (leadId) query = query.eq('lead_id', leadId);
    if (enquiryId) query = query.eq('enquiry_id', enquiryId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  public async addActivityLog(log: ActivityLog): Promise<void> {
    if (this.isDemoMode || !supabase) {
      const raw = safeGetItem(STORAGE_KEYS.LOGS);
      const logs: ActivityLog[] = raw ? JSON.parse(raw) : [];
      logs.unshift(log);
      safeSetItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
      return;
    }

    await supabase.from('activity_logs').insert(log);
  }

  // --- DASHBOARD METRICS ---

  public async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [enquiries, leads, tasks] = await Promise.all([
      this.getEnquiries(),
      this.getLeads(),
      this.getFollowUpTasks(),
    ]);

    const leadsByStatus: Record<PipelineStatus, number> = {
      New: 0,
      Contacted: 0,
      Interested: 0,
      Paid: 0,
      Lost: 0,
    };

    leads.forEach((l) => {
      if (leadsByStatus[l.pipeline_status] !== undefined) {
        leadsByStatus[l.pipeline_status]++;
      }
    });

    // Enquiries by source
    const sourceCounts: Record<string, number> = {};
    enquiries.forEach((e) => {
      sourceCounts[e.source_channel] = (sourceCounts[e.source_channel] || 0) + 1;
    });

    const enquiriesBySource = Object.entries(sourceCounts).map(([name, count]) => ({
      name,
      count,
    }));

    // Enquiries by programme
    const programmeCounts: Record<string, number> = {};
    enquiries.forEach((e) => {
      const prog = e.programme_interest || 'unknown';
      programmeCounts[prog] = (programmeCounts[prog] || 0) + 1;
    });

    const enquiriesByProgramme = Object.entries(programmeCounts).map(([name, count]) => ({
      name:
        name === 'bootcamp'
          ? 'Bootcamp'
          : name === 'fellowship'
          ? 'Fellowship'
          : name === 'corporate_training'
          ? 'Corporate'
          : 'Unspecified',
      count,
    }));

    // Category breakdown
    const catCounts: Record<string, number> = {};
    enquiries.forEach((e) => {
      catCounts[e.category] = (catCounts[e.category] || 0) + 1;
    });
    const enquiriesByCategory = Object.entries(catCounts).map(([name, count]) => ({
      name,
      count,
    }));

    // Volume over time (grouped by date)
    const dateMap: Record<string, { enquiries: number; leads: number }> = {};
    enquiries.forEach((e) => {
      const dateKey = e.received_at.split('T')[0];
      if (!dateMap[dateKey]) dateMap[dateKey] = { enquiries: 0, leads: 0 };
      dateMap[dateKey].enquiries++;
    });

    leads.forEach((l) => {
      const dateKey = l.created_at.split('T')[0];
      if (!dateMap[dateKey]) dateMap[dateKey] = { enquiries: 0, leads: 0 };
      dateMap[dateKey].leads++;
    });

    const volumeOverTime = Object.entries(dateMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, counts]) => ({
        date,
        enquiries: counts.enquiries,
        leads: counts.leads,
      }));

    const followUpsOverdue = tasks.filter((t) => t.status === 'pending' && t.is_overdue).length;
    const followUpsPending = tasks.filter((t) => t.status === 'pending').length;
    const urgentSupportCount = enquiries.filter(
      (e) => (e.category === 'payment_support' || e.category === 'refund_cancellation') && e.handling_status !== 'resolved'
    ).length;

    return {
      totalEnquiries: enquiries.length,
      genuineSalesLeads: leads.length,
      leadsByStatus,
      followUpsOverdue,
      followUpsPending,
      enquiriesBySource,
      enquiriesByProgramme,
      enquiriesByCategory,
      volumeOverTime,
      urgentSupportCount,
    };
  }
}

export const storage = new StorageAdapter();
