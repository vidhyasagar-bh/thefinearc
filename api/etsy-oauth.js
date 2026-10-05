import crypto from 'node:crypto';
import { hasServiceRole } from './_lib/supabase.js';
import { exchangeCode, isConnected } from './_lib/etsyAuth.js';

const SCOPES = 'listings_r shops_r';
const COOKIE = 'etsy_pkce';
const b64url = buf => Buffer.from(buf).toString('base64url');

function origin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${req.headers.host}`;
}

function readCookie(req, name) {
  const match = (req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}

// One endpoint, three actions: start (redirect to Etsy), callback (Etsy redirects back here), status.
export default async function handler(req, res) {
  const action = req.query.action;
  const redirectUri = `${origin(req)}/api/etsy-oauth-callback`;

  if (!hasServiceRole()) {
    if (action === 'status') return res.status(200).json({ connected: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not set' });
    return res.status(500).send('SUPABASE_SERVICE_ROLE_KEY is not set on the server.');
  }

  if (action === 'status') {
    try { return res.status(200).json({ connected: await isConnected() }); }
    catch (err) { return res.status(200).json({ connected: false, error: String(err.message).slice(0, 200) }); }
  }

  if (action === 'start') {
    // Accept the bare keystring, or "keystring:shared_secret" — OAuth only needs the keystring part
    const raw = String(req.query.key || '').trim().replace(/^["']|["']$/g, '');
    const clientId = raw.split(':')[0].trim();
    if (!/^[\w-]{8,128}$/.test(clientId)) {
      return res.status(400).send(
        `Missing or invalid Etsy API key (received ${raw.length} characters). Paste the Keystring from developers.etsy.com, not the shared secret.`
      );
    }
    const verifier = b64url(crypto.randomBytes(32));
    const state = b64url(crypto.randomBytes(16));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    res.setHeader('Set-Cookie',
      `${COOKIE}=${encodeURIComponent([state, verifier, clientId].join('.'))}; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=600`);
    const url = new URL('https://www.etsy.com/oauth/connect');
    url.search = new URLSearchParams({
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: SCOPES,
      client_id: clientId,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString();
    return res.redirect(302, url.toString());
  }

  if (action === 'callback') {
    const clear = `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=0`;
    const fail = msg => {
      res.setHeader('Set-Cookie', clear);
      return res.redirect(302, `/admin?etsy=error&msg=${encodeURIComponent(String(msg).slice(0, 200))}`);
    };
    if (req.query.error) return fail(req.query.error_description || req.query.error);
    const [state, verifier, clientId] = readCookie(req, COOKIE).split('.');
    if (!state || !verifier || !clientId || req.query.state !== state || !req.query.code) {
      return fail('Sign-in session expired or did not match. Please try Connect Etsy again.');
    }
    try {
      await exchangeCode({ clientId, code: String(req.query.code), verifier, redirectUri });
      res.setHeader('Set-Cookie', clear);
      return res.redirect(302, '/admin?etsy=connected');
    } catch (err) {
      console.error('[etsy-oauth] token exchange failed', err);
      return fail(err.message);
    }
  }

  return res.status(400).send('Unknown action.');
}
