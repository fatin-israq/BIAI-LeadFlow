import { describe, it, expect, beforeEach } from 'vitest';
import { isOverdue48Hours, getHoursElapsed } from '../lib/utils';
import { processSampleData } from '../services/dataImportService';
import { storage } from '../services/storageAdapter';

describe('Follow-up 48h SLA & Pipeline Transitions', () => {
  beforeEach(() => {
    // Reset test storage environment
    storage.resetDemoData();
  });

  it('correctly calculates 48-hour SLA threshold', () => {
    const reference = new Date('2026-10-29T12:00:00+06:00');

    // 24 hours elapsed -> NOT overdue
    const recentDate = new Date('2026-10-28T12:00:00+06:00').toISOString();
    expect(isOverdue48Hours(recentDate, reference)).toBe(false);

    // 49 hours elapsed -> OVERDUE
    const overdueDate = new Date('2026-10-27T10:00:00+06:00').toISOString();
    expect(isOverdue48Hours(overdueDate, reference)).toBe(true);
  });

  it('generates overdue follow-up tasks for unattended sample sales leads', () => {
    const processed = processSampleData();
    const overdueTasks = processed.tasks.filter((t) => t.is_overdue);

    // Sample data from Oct 26-27 is older than 48 hours relative to current date
    expect(overdueTasks.length).toBeGreaterThan(0);
    expect(overdueTasks[0].status).toBe('pending');
  });

  it('persists pipeline status changes and creates an activity audit log', async () => {
    const leads = await storage.getLeads();
    expect(leads.length).toBeGreaterThan(0);

    const targetLead = leads[0];
    const initialStatus = targetLead.pipeline_status;

    // Transition to Contacted
    const updated = await storage.updateLeadStatus(targetLead.id, 'Contacted');
    expect(updated.pipeline_status).toBe('Contacted');

    // Verify persistence
    const reloaded = await storage.getLeadById(targetLead.id);
    expect(reloaded?.pipeline_status).toBe('Contacted');

    // Verify activity log was added
    const logs = await storage.getActivityLogs(targetLead.id);
    const statusLog = logs.find((l) => l.event_type === 'status_changed');
    expect(statusLog).toBeDefined();
    expect(statusLog?.description).toContain('Contacted');
  });

  it('allows completing follow-up tasks', async () => {
    const tasks = await storage.getFollowUpTasks();
    expect(tasks.length).toBeGreaterThan(0);

    const task = tasks[0];
    await storage.completeFollowUpTask(task.id);

    const reloadedTasks = await storage.getFollowUpTasks();
    const updatedTask = reloadedTasks.find((t) => t.id === task.id);
    expect(updatedTask?.status).toBe('completed');
    expect(updatedTask?.completed_at).not.toBeNull();
  });
});
