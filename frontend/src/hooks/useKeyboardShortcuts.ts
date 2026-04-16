import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const ROUTES: Record<string, string> = {
  // Core
  h: '/',           // nerve center / home
  c: '/chat',
  o: '/overview',
  // Agents
  a: '/agents',
  e: '/sessions',
  n: '/nodes',
  // Automate
  j: '/jobs',
  p: '/pipelines',
  k: '/skills',
  // Observe
  m: '/metrics',
  l: '/logs',
  f: '/files',
  // Config
  x: '/config',
  t: '/settings',
  s: '/system',
  d: '/debug',
  r: '/docs',
};

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const pendingKey = useRef<string | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') {
        (document.activeElement as HTMLElement)?.blur();
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
        if (input) input.focus();
        return;
      }

      if (e.key === 'g' && !pendingKey.current) {
        pendingKey.current = 'g';
        if (timeout.current) clearTimeout(timeout.current);
        timeout.current = setTimeout(() => { pendingKey.current = null; }, 500);
        return;
      }

      if (pendingKey.current === 'g') {
        pendingKey.current = null;
        if (timeout.current) clearTimeout(timeout.current);
        const route = ROUTES[e.key];
        if (route) {
          e.preventDefault();
          navigate(route);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
}
