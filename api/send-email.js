import { sb, hasServiceRole } from './_lib/supabase.js';
import { deliver } from './_lib/mailer.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Only emails tied to a real stored commission enquiry can be sent, so this endpoint
// can't be used as an open mail relay. The content comes from the database, not the request.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!hasServiceRole()) return res.status(500).json({ error: 'Email is not configured.' });

  const { type, data } = req.body || {};
  const email = String(data?.email || '').trim();
  if (!['commission_inquiry', 'commission_accepted', 'commission_declined'].includes(type) || !EMAIL.test(email)) {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  try {
    const [row] = await sb(
      `commission_inquiries?select=*&email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=1`
    );
    if (!row) return res.status(404).json({ error: 'No matching enquiry.' });

    if (type === 'commission_inquiry') {
      if (Date.now() - new Date(row.created_at).getTime() > 15 * 60 * 1000) {
        return res.status(409).json({ error: 'Enquiry is too old to send a confirmation.' });
      }
    } else if (row.status !== type.replace('commission_', '')) {
      return res.status(409).json({ error: 'Enquiry status does not match.' });
    }

    const results = await deliver(type, row);
    const ok = results.every(r => r.ok);
    return res.status(ok ? 200 : 502).json({ ok, results });
  } catch (err) {
    console.error('[send-email] failed', err);
    return res.status(500).json({ error: 'Could not send email.' });
  }
}
