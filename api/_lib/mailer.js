import nodemailer from 'nodemailer';
import * as t from './emailTemplates.js';

// Gmail by default. To switch to a domain mailbox later, change only the env vars:
// SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / EMAIL_FROM — no code changes needed.
let transport;
function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

export const artistEmail = () => process.env.ARTIST_EMAIL || 'thefinearc@gmail.com';

export async function sendMail({ to, subject, html, replyTo }) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const info = await getTransport().sendMail({
    from: `"The Fine Arc" <${from}>`,
    to,
    subject,
    html,
    ...(replyTo ? { replyTo } : {}),
  });
  console.log('[mail] sent', subject, '->', to, info.messageId);
}

// Builds and sends the emails for one event. Never throws — returns per-email results.
export async function deliver(type, data) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('[mail] SMTP_USER / SMTP_PASS are not set — no email sent');
    return [{ ok: false, error: 'SMTP not configured' }];
  }
  const emails = [];
  const name = String(data.name || '');
  const email = String(data.email || '');
  if (type === 'commission_inquiry') {
    emails.push({ to: email, subject: 'Your commission enquiry — The Fine Arc', html: t.commissionInquiryCustomer(name) });
    emails.push({ to: artistEmail(), subject: `New commission enquiry from ${name}`, html: t.commissionInquiryArtist(data), replyTo: email });
  } else if (type === 'commission_accepted') {
    emails.push({ to: email, subject: 'Your commission has been accepted — The Fine Arc', html: t.commissionAccepted(name) });
  } else if (type === 'commission_declined') {
    emails.push({ to: email, subject: 'Regarding your commission enquiry — The Fine Arc', html: t.commissionDeclined(name) });
  } else if (type === 'order_confirmation') {
    emails.push({ to: email, subject: 'Order confirmed — The Fine Arc', html: t.orderConfirmationCustomer(data), replyTo: artistEmail() });
    emails.push({ to: artistEmail(), subject: `New order from ${name}`, html: t.orderNotificationArtist(data), replyTo: email });
  }
  return Promise.all(emails.map(async e => {
    try {
      await sendMail(e);
      return { to: e.to, ok: true };
    } catch (err) {
      console.error('[mail] FAILED', e.subject, '->', e.to, err.message);
      return { to: e.to, ok: false, error: err.message };
    }
  }));
}
