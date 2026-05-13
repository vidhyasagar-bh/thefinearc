import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type EmailType =
  | 'commission_inquiry'
  | 'commission_accepted'
  | 'commission_declined'
  | 'order_confirmation';

interface EmailRequest {
  type: EmailType;
  data: Record<string, unknown>;
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function wrap(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf9f7;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7;">
<tr><td align="center" style="padding:48px 20px;">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#ffffff;border:1px solid #ede9e1;">
<tr><td style="padding:44px 48px 40px;">
  <p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:300;color:#2c2c2c;letter-spacing:0.18em;margin:0 0 36px 0;padding-bottom:28px;border-bottom:1px solid #f0ece4;text-transform:uppercase;">
    The Fine Arc
  </p>
  ${content}
  <div style="border-top:1px solid #f0ece4;margin-top:44px;padding-top:24px;">
    <p style="font-family:system-ui,-apple-system,sans-serif;font-size:11px;color:#b0a898;margin:0 0 4px 0;">The Fine Arc</p>
    <p style="font-family:system-ui,-apple-system,sans-serif;font-size:11px;color:#b0a898;margin:0;">
      <a href="mailto:hello@thefinearc.com" style="color:#b0a898;text-decoration:none;">hello@thefinearc.com</a>
    </p>
  </div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function h1(text: string) {
  return `<h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:300;color:#2c2c2c;margin:0 0 20px 0;letter-spacing:0.02em;">${text}</h1>`;
}

function p(text: string) {
  return `<p style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#6b6055;line-height:1.7;margin:0 0 16px 0;">${text}</p>`;
}

function label(text: string) {
  return `<p style="font-family:system-ui,-apple-system,sans-serif;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#b0a898;margin:0 0 4px 0;">${text}</p>`;
}

function value(text: string) {
  return `<p style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#2c2c2c;margin:0 0 16px 0;">${text}</p>`;
}

function divider() {
  return `<div style="border-top:1px solid #f0ece4;margin:28px 0;"></div>`;
}

// ── Email builders ────────────────────────────────────────────────────────────

function commissionInquiryCustomer(name: string): string {
  return wrap(
    h1('We have received your enquiry.') +
    p(`Thank you, ${name}. Your commission enquiry has been received and I will review it carefully.`) +
    p('I will be in touch within a few days to discuss your vision.') +
    divider() +
    p('In the meantime, you are welcome to browse the current collection for reference or inspiration.') +
    `<p style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;margin:20px 0 0 0;">
      <a href="https://thefinearc.com/gallery" style="color:#2c2c2c;text-decoration:underline;text-underline-offset:3px;">View the gallery →</a>
    </p>`
  );
}

function commissionInquiryArtist(data: Record<string, unknown>, artistEmail: string): string {
  const { name, email, phone, project_description, size_preferences, color_preferences } = data;
  return wrap(
    h1('New commission enquiry.') +
    label('From') +
    value(`${name} &lt;${email}&gt;${phone ? ` · ${phone}` : ''}`) +
    label('Project description') +
    value(String(project_description || '').replace(/\n/g, '<br>')) +
    (size_preferences ? label('Size') + value(String(size_preferences)) : '') +
    (color_preferences ? label('Colour palette') + value(String(color_preferences)) : '') +
    divider() +
    `<p style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;margin:0;">
      <a href="mailto:${email}" style="color:#2c2c2c;text-decoration:underline;text-underline-offset:3px;">Reply to ${name} →</a>
    </p>`
  );
}

function commissionAccepted(name: string): string {
  return wrap(
    h1('Your commission has been accepted.') +
    p(`Wonderful news, ${name}. I would love to create this work for you.`) +
    p('I will be in touch very shortly to discuss the details — timeline, materials, and next steps.') +
    p('Thank you for entrusting me with this commission.')
  );
}

function commissionDeclined(name: string): string {
  return wrap(
    h1('Regarding your commission enquiry.') +
    p(`Thank you for your interest, ${name}.`) +
    p('After careful consideration, I am unfortunately unable to take on your commission at this time. This may be due to my current workload or the nature of the project.') +
    p('I hope you will continue to follow the work, and please do enquire again in the future.') +
    divider() +
    `<p style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;margin:0;">
      <a href="https://thefinearc.com/gallery" style="color:#2c2c2c;text-decoration:underline;text-underline-offset:3px;">Browse the current collection →</a>
    </p>`
  );
}

function orderConfirmationCustomer(data: Record<string, unknown>): string {
  const { name, email: _email, items, total } = data;
  const itemsList = Array.isArray(items)
    ? items.map((item: Record<string, unknown>) =>
        `<tr>
          <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#2c2c2c;padding:10px 0;border-bottom:1px solid #f0ece4;">${item.artwork_title}</td>
          <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#6b6055;padding:10px 0;border-bottom:1px solid #f0ece4;text-align:right;">£${Number(item.price).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</td>
        </tr>`
      ).join('')
    : '';

  return wrap(
    h1('Order confirmed.') +
    p(`Thank you for collecting, ${name}. Your work is in safe hands.`) +
    divider() +
    `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${itemsList}
      <tr>
        <td style="font-family:system-ui,-apple-system,sans-serif;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#b0a898;padding-top:16px;">Total</td>
        <td style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;color:#2c2c2c;padding-top:16px;text-align:right;">£${Number(total).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</td>
      </tr>
    </table>` +
    divider() +
    p('Your work will be carefully packed and dispatched within 5–7 working days. I will be in touch with tracking information once it has shipped.') +
    p('Thank you for supporting this work.')
  );
}

function orderNotificationArtist(data: Record<string, unknown>): string {
  const { name, email, customer_address, items, total } = data;
  const address = customer_address as Record<string, string> | null;
  const itemsList = Array.isArray(items)
    ? items.map((item: Record<string, unknown>) =>
        `${item.artwork_title} — £${Number(item.price).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
      ).join('<br>')
    : '';

  return wrap(
    h1('New order received.') +
    label('Customer') +
    value(`${name} &lt;${email}&gt;`) +
    (address ? label('Ship to') + value([address.line1, address.city, address.postal_code, address.country].filter(Boolean).join(', ')) : '') +
    label('Items') +
    value(itemsList) +
    label('Total') +
    value(`£${Number(total).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`) +
    divider() +
    `<p style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;margin:0;">
      <a href="mailto:${email}" style="color:#2c2c2c;text-decoration:underline;text-underline-offset:3px;">Email ${name} →</a>
    </p>`
  );
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, data } = (await req.json()) as EmailRequest;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const artistEmail = Deno.env.get('ARTIST_EMAIL') || 'hello@thefinearc.com';
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@thefinearc.com';

    if (!resendApiKey) {
      // Gracefully no-op when Resend isn't configured
      return new Response(JSON.stringify({ ok: true, note: 'RESEND_API_KEY not set' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    type EmailPayload = { to: string; subject: string; html: string };
    const emails: EmailPayload[] = [];

    if (type === 'commission_inquiry') {
      const name = String(data.name || '');
      const email = String(data.email || '');
      emails.push({ to: email, subject: 'Your commission enquiry — The Fine Arc', html: commissionInquiryCustomer(name) });
      emails.push({ to: artistEmail, subject: `New commission enquiry from ${name}`, html: commissionInquiryArtist(data, artistEmail) });
    } else if (type === 'commission_accepted') {
      const name = String(data.name || '');
      const email = String(data.email || '');
      emails.push({ to: email, subject: 'Your commission has been accepted — The Fine Arc', html: commissionAccepted(name) });
    } else if (type === 'commission_declined') {
      const name = String(data.name || '');
      const email = String(data.email || '');
      emails.push({ to: email, subject: 'Regarding your commission enquiry — The Fine Arc', html: commissionDeclined(name) });
    } else if (type === 'order_confirmation') {
      const name = String(data.name || '');
      const email = String(data.email || '');
      emails.push({ to: email, subject: 'Order confirmed — The Fine Arc', html: orderConfirmationCustomer(data) });
      emails.push({ to: artistEmail, subject: `New order from ${name}`, html: orderNotificationArtist(data) });
    }

    await Promise.all(
      emails.map(({ to, subject, html }) =>
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from: `The Fine Arc <${fromEmail}>`, to, subject, html }),
        })
      )
    );

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
