import { useCallback, useEffect, useState } from 'react';

import { onUpdate } from '@/core/realtime';
import { fetchWorkstations } from './workstationClient';
import type { Workstation } from './types';

export function useWorkstations(pollMs = 15_000): {
  workstations: Workstation[];
  loading: boolean;
  reload: () => Promise<void>;
} {
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const list = await fetchWorkstations();
      setWorkstations(list);
    } catch {
      /* API offline */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const poll = setInterval(() => void reload(), pollMs);
    const unsub = onUpdate((u) => {
      if (u.type.startsWith('workstation.') || u.type === 'event') void reload();
    });
    return () => {
      clearInterval(poll);
      unsub();
    };
  }, [reload, pollMs]);

  return { workstations, loading, reload };
}
