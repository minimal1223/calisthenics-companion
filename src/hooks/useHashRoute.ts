import { useCallback, useEffect, useState } from 'react';
import type { PageId } from '../types';

export const PAGES: PageId[] = ['overview', 'workouts', 'timer', 'mobility', 'progress', 'settings'];

export interface Route {
  page: PageId;
  /** Optional sub-view, e.g. `#/workouts/minimum` or `#/mobility/recovery`. */
  sub: string | null;
}

export function parseHash(hash: string): Route {
  const [page, sub] = hash.replace(/^#\/?/, '').split('/');
  if (PAGES.includes(page as PageId)) return { page: page as PageId, sub: sub || null };
  return { page: 'overview', sub: null };
}

/** Minimal hash router: refresh keeps the screen, and browser back/forward work. */
export function useHashRoute(): [Route, (page: PageId, sub?: string | null) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((page: PageId, sub: string | null = null) => {
    const next = `#/${page}${sub ? `/${sub}` : ''}`;
    if (window.location.hash !== next) window.location.hash = next;
    else setRoute(parseHash(next));
  }, []);

  return [route, navigate];
}
