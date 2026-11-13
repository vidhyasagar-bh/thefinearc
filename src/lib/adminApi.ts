export class AdminApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Every admin read/write goes through the server, which checks the signed-in admin session.
export async function adminApi<T = any>(action: string, body?: unknown): Promise<T> {
  const isGet = action === 'session';
  const res = await fetch(`/api/admin?action=${encodeURIComponent(action)}`, {
    method: isGet ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: isGet ? undefined : JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && action !== 'login') window.dispatchEvent(new Event('admin-unauthorized'));
    throw new AdminApiError(data.error || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}
