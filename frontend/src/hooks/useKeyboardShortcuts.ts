import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const pendingKey = useRef<string | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      // Don't intercept when typing in inputs
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Esc: close modals (bubble up via native events, but also blur)
      if (e.key === 'Escape') {
        (document.activeElement as HTMLElement)?.blur();
        return;
      }

      // "/" to focus search (if any)
      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
        if (searchInput) searchInput.focus();
        return;
      }

      // "g" key combos for navigation
      if (e.key === 'g' && !pendingKey.current) {
        pendingKey.current = 'g';
        if (timeout.current) clearTimeout(timeout.current);
        timeout.current = setTimeout(() => { pendingKey.current = null; }, 500);
        return;
      }

      if (pendingKey.current === 'g') {
        pendingKey.current = null;
        if (timeout.current) clearTimeout(timeout.current);

        const routes: Record<string, string> = {
          o: '/',
          j: '/jobs',
          p: '/pipelines',
          a: '/agents',
          k: '/skills',
          c: '/config',
          n: '/nodes',
          m: '/metrics',
          s: '/system',
          l: '/logs',
          d: '/debug',
          h: '/docs',
          t: '/chat',
          e: '/sessions',
          i: '/settings',
        };

        if (routes[e.key]) {
          e.preventDefault();
          navigate(routes[e.key]);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
}
