import { useEffect, useRef } from 'react';
import { realtimeService, RealtimeEvent, TableName } from '../services/realtimeService';

interface UseRealtimeSyncOptions {
  tables?: TableName[];
  onDataChange: (event: RealtimeEvent) => void;
  debounceMs?: number;
}

/**
 * React hook to synchronize component data with Realtime database & cross-tab events.
 */
export function useRealtimeSync({
  tables,
  onDataChange,
  debounceMs = 150,
}: UseRealtimeSyncOptions) {
  const callbackRef = useRef(onDataChange);
  callbackRef.current = onDataChange;

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = realtimeService.subscribe((event) => {
      // If tables filter is provided, check if event matches
      if (tables && tables.length > 0 && !tables.includes(event.table)) {
        return;
      }

      // Debounce rapid bursts of events (e.g., bulk import or multiple changes)
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        callbackRef.current(event);
      }, debounceMs);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [tables?.join(','), debounceMs]);
}

