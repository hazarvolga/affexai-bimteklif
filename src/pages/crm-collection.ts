import { useCallback, useEffect, useState } from 'react';
import { crmRequest } from './crm-view';

type CollectionState<T> = { scope: string | null; status: 'loading' | 'ready' | 'error'; data: T[] };

/** A response from an old company or an earlier retry must never populate the current view. */
export function useCrmCollection<T>(path: string, scope: string | null) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CollectionState<T>>({ scope, status: 'loading', data: [] });
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState({ scope, status: 'loading', data: [] });
    if (!scope) return () => { active = false; controller.abort(); };
    void crmRequest<T[]>(path, { signal: controller.signal }).then(data => {
      if (!Array.isArray(data)) throw new Error('Invalid collection response');
      if (active) setState({ scope, status: 'ready', data });
    }).catch(() => {
      if (active) setState({ scope, status: 'error', data: [] });
    });
    return () => { active = false; controller.abort(); };
  }, [path, scope, attempt]);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  const append = useCallback((item: T) => setState(current =>
    current.scope === scope && current.status === 'ready' ? { ...current, data: [item, ...current.data] } : current,
  ), [scope]);
  return { ...(state.scope === scope ? state : { scope, status: 'loading' as const, data: [] }), retry, append };
}
