// Thin REST helper. Auth routes need the admin JWT (stored in localStorage).
export function useApi() {
  const config = useRuntimeConfig();
  const base = config.public.apiBase as string;

  function token() {
    if (import.meta.client) return localStorage.getItem('aofa_token') || '';
    return '';
  }

  async function request<T>(path: string, opts: any = {}): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    const t = token();
    if (t) headers.Authorization = `Bearer ${t}`;
    return await $fetch<T>(`${base}/api${path}`, { ...opts, headers });
  }

  return {
    get: <T>(p: string) => request<T>(p),
    post: <T>(p: string, body?: any) => request<T>(p, { method: 'POST', body }),
    patch: <T>(p: string, body?: any) => request<T>(p, { method: 'PATCH', body }),
    del: <T>(p: string) => request<T>(p, { method: 'DELETE' }),
  };
}
