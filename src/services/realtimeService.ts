import { supabase } from '../lib/supabase';
import { Enquiry, Lead, FollowUpTask, ActivityLog } from '../types';

export type TableName = 'enquiries' | 'leads' | 'follow_up_tasks' | 'activity_logs';
export type RealtimeAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'RESET';

export interface RealtimeEvent<T = any> {
  table: TableName;
  action: RealtimeAction;
  record?: T;
  oldRecord?: T;
  source: 'supabase' | 'local';
  timestamp: string;
}

type RealtimeListener = (event: RealtimeEvent) => void;

class RealtimeService {
  private listeners: Set<RealtimeListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private isSubscribedToSupabase = false;

  constructor() {
    this.initBroadcastChannel();
    this.initSupabaseRealtime();
  }

  /**
   * Cross-tab local broadcast channel for instant multi-window sync in demo/local mode
   */
  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('biai_leadflow_realtime');
        this.broadcastChannel.onmessage = (event: MessageEvent<RealtimeEvent>) => {
          if (event.data && event.data.table) {
            this.notifyListeners(event.data);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel initialization warning:', err);
      }
    }
  }

  /**
   * Initializes Supabase PostgreSQL Realtime subscription if client is configured
   */
  public initSupabaseRealtime() {
    if (this.isSubscribedToSupabase || !supabase) {
      return;
    }

    try {
      const channel = supabase
        .channel('leadflow_public_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'enquiries' },
          (payload) => {
            this.handleSupabaseChange('enquiries', payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'leads' },
          (payload) => {
            this.handleSupabaseChange('leads', payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'follow_up_tasks' },
          (payload) => {
            this.handleSupabaseChange('follow_up_tasks', payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'activity_logs' },
          (payload) => {
            this.handleSupabaseChange('activity_logs', payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.isSubscribedToSupabase = true;
            console.info('⚡ Supabase Realtime connected for tables: enquiries, leads, tasks, logs');
          }
        });
    } catch (err) {
      console.warn('Could not subscribe to Supabase Realtime:', err);
    }
  }

  private handleSupabaseChange(table: TableName, payload: any) {
    const event: RealtimeEvent = {
      table,
      action: payload.eventType as RealtimeAction,
      record: payload.new,
      oldRecord: payload.old,
      source: 'supabase',
      timestamp: new Date().toISOString(),
    };
    this.notifyListeners(event);
  }

  private notifyListeners(event: RealtimeEvent) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in realtime listener:', err);
      }
    });
  }

  /**
   * Subscribe to realtime database changes
   * Returns an unsubscribe function for React useEffect cleanup
   */
  public subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Broadcasts a local mutation to all open tabs and components
   */
  public broadcastLocalChange(
    table: TableName,
    action: RealtimeAction,
    record?: any,
    oldRecord?: any
  ): void {
    const event: RealtimeEvent = {
      table,
      action,
      record,
      oldRecord,
      source: 'local',
      timestamp: new Date().toISOString(),
    };

    // Notify local listeners in current window
    this.notifyListeners(event);

    // Broadcast to other open browser tabs
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(event);
      } catch (err) {
        console.warn('Failed to post to BroadcastChannel:', err);
      }
    }
  }
}

export const realtimeService = new RealtimeService();

