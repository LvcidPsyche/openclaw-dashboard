const BASE = window.location.origin;

// Dashboard access token: from localStorage (set after a prompt) or a build-time
// env var. Empty when the backend runs token-less (loopback-only), in which case
// no header is sent and nothing changes.
export function getDashboardToken(): string {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('dashboard_token') : null;
  return stored || (import.meta.env.VITE_DASHBOARD_TOKEN as string | undefined) || '';
}

function authHeaders(): Record<string, string> {
  const token = getDashboardToken();
  return token ? { 'X-Dashboard-Token': token } : {};
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...init?.headers },
  });
  if (res.status === 401) {
    // Backend requires a token we don't have (or it's wrong): ask for it, store it,
    // and let the caller retry. Non-breaking when no token is required (no 401).
    const entered = typeof window !== 'undefined' ? window.prompt('Dashboard access token:') : null;
    if (entered && typeof localStorage !== 'undefined') {
      localStorage.setItem('dashboard_token', entered.trim());
    }
    throw new Error('401 Unauthorized — enter the dashboard token and retry');
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' });
}
