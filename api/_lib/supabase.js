const url = () => process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const hasServiceRole = () => Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function sb(path, init = {}) {
  const res = await fetch(`${url()}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key(),
      // New-style sb_secret_/sb_publishable_ keys are not JWTs and must not be sent as a Bearer token
      ...(key()?.startsWith('sb_') ? {} : { Authorization: `Bearer ${key()}` }),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function sendOrderEmail(data) {
  try {
    await fetch(`${url()}/functions/v1/send-email`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'order_confirmation', data }),
    });
  } catch (err) {
    console.error('[email] order confirmation failed', err);
  }
}
