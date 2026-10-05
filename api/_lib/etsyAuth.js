import { sb } from './supabase.js';

const TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';

async function tokenRequest(params) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* non-JSON */ }
  if (!res.ok || !data?.access_token) {
    throw new Error(`Etsy token ${res.status}: ${text.slice(0, 300)}`);
  }
  return data;
}

async function save(clientId, data) {
  await sb('etsy_auth?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      id: 1,
      client_id: clientId,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(Date.now() + (Number(data.expires_in) || 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function exchangeCode({ clientId, code, verifier, redirectUri }) {
  const data = await tokenRequest({
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code,
    code_verifier: verifier,
  });
  await save(clientId, data);
}

export async function isConnected() {
  const rows = await sb('etsy_auth?select=id,expires_at&id=eq.1');
  return Boolean(rows && rows.length > 0);
}

// Returns a valid access token (refreshing it when close to expiry), or null if Etsy was never connected.
export async function getAccessToken() {
  const rows = await sb('etsy_auth?select=*&id=eq.1');
  const row = rows?.[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() - Date.now() > 60_000) return row.access_token;
  const data = await tokenRequest({
    grant_type: 'refresh_token',
    client_id: row.client_id,
    refresh_token: row.refresh_token,
  });
  await save(row.client_id, data);
  return data.access_token;
}
