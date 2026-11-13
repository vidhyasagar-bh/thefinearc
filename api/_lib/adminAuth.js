import crypto from 'node:crypto';

const COOKIE = 'admin_session';
const TTL_SECONDS = 8 * 60 * 60;

const sha256 = v => crypto.createHash('sha256').update(String(v)).digest();
const b64url = v => Buffer.from(v).toString('base64url');

// Changing ADMIN_PASSWORD (or ADMIN_SESSION_SECRET) signs every admin out.
function secret() {
  return process.env.ADMIN_SESSION_SECRET || sha256(`admin-session:${process.env.ADMIN_PASSWORD || ''}`).toString('hex');
}

const sign = body => crypto.createHmac('sha256', secret()).update(body).digest('base64url');

export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function passwordOk(input) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof input !== 'string') return false;
  return crypto.timingSafeEqual(sha256(input), sha256(expected));
}

export function issueSession(res) {
  const body = b64url(JSON.stringify({ exp: Date.now() + TTL_SECONDS * 1000 }));
  res.setHeader('Set-Cookie',
    `${COOKIE}=${body}.${sign(body)}; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=${TTL_SECONDS}`);
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=0`);
}

export function isAdmin(req) {
  if (!adminConfigured()) return false;
  const raw = (req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith(`${COOKIE}=`));
  if (!raw) return false;
  const [body, sig] = decodeURIComponent(raw.slice(COOKIE.length + 1)).split('.');
  if (!body || !sig) return false;
  const expected = sign(body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString()).exp > Date.now();
  } catch {
    return false;
  }
}

export function requireAdmin(req, res) {
  if (isAdmin(req)) return true;
  res.status(401).json({ error: 'Not signed in.' });
  return false;
}
