
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const money = n => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

function wrap(content) {
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
      <a href="mailto:thefinearc@gmail.com" style="color:#b0a898;text-decoration:none;">thefinearc@gmail.com</a>
    </p>
  </div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function h1(text) {
  return `<h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:300;color:#2c2c2c;margin:0 0 20px 0;letter-spacing:0.02em;">${text}</h1>`;
}

function p(text) {
  return `<p style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#6b6055;line-height:1.7;margin:0 0 16px 0;">${text}</p>`;
}

function label(text) {
  return `<p style="font-family:system-ui,-apple-system,sans-serif;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#b0a898;margin:0 0 4px 0;">${text}</p>`;
}

function value(text) {
  return `<p style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#2c2c2c;margin:0 0 16px 0;">${text}</p>`;
}

function divider() {
  return `<div style="border-top:1px solid #f0ece4;margin:28px 0;"></div>`;
}

// ── Email builders (all dynamic values are HTML-escaped) ──────────────────────

export function commissionInquiryCustomer(name) {
  return wrap(
    h1('We have received your enquiry.') +
    p(`Thank you, ${esc(name)}. Your commission enquiry has been received and I will review it carefully.`) +
    p('I will be in touch within a few days to discuss your vision.') +
    divider() +
    p('In the meantime, you are welcome to browse the current collection for reference or inspiration.') +
    `<p style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;margin:20px 0 0 0;">
      <a href="https://thefinearcbyleela.com/gallery" style="color:#2c2c2c;text-decoration:underline;text-underline-offset:3px;">View the gallery →</a>
    </p>`
  );
}

export function commissionInquiryArtist(data) {
  const { name, email, phone, project_description, size_preferences, color_preferences } = data;
  return wrap(
    h1('New commission enquiry.') +
    label('From') +
    value(`${esc(name)} &lt;${esc(email)}&gt;${phone ? ` · ${esc(phone)}` : ''}`) +
    label('Project description') +
    value(esc(project_description).replace(/\n/g, '<br>')) +
    (size_preferences ? label('Size') + value(esc(size_preferences)) : '') +
    (color_preferences ? label('Colour palette') + value(esc(color_preferences)) : '') +
    divider() +
    `<p style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;margin:0;">
      <a href="mailto:${esc(email)}" style="color:#2c2c2c;text-decoration:underline;text-underline-offset:3px;">Reply to ${esc(name)} →</a>
    </p>`
  );
}

export function commissionAccepted(name) {
  return wrap(
    h1('Your commission has been accepted.') +
    p(`Wonderful news, ${esc(name)}. I would love to create this work for you.`) +
    p('I will be in touch very shortly to discuss the details — timeline, materials, and next steps.') +
    p('Thank you for entrusting me with this commission.')
  );
}

export function commissionDeclined(name) {
  return wrap(
    h1('Regarding your commission enquiry.') +
    p(`Thank you for your interest, ${esc(name)}.`) +
    p('After careful consideration, I am unfortunately unable to take on your commission at this time. This may be due to my current workload or the nature of the project.') +
    p('I hope you will continue to follow the work, and please do enquire again in the future.') +
    divider() +
    `<p style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;margin:0;">
      <a href="https://thefinearcbyleela.com/gallery" style="color:#2c2c2c;text-decoration:underline;text-underline-offset:3px;">Browse the current collection →</a>
    </p>`
  );
}

const cell = 'font-family:system-ui,-apple-system,sans-serif;font-size:13px;padding:10px 0;border-bottom:1px solid #f0ece4;';
const totalLabel = 'font-family:system-ui,-apple-system,sans-serif;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#b0a898;padding-top:12px;';
const totalValue = 'font-family:system-ui,-apple-system,sans-serif;color:#2c2c2c;padding-top:12px;text-align:right;';

export function orderConfirmationCustomer(data) {
  const { name, items, total, subtotal, tax } = data;
  const rows = (Array.isArray(items) ? items : []).map(item =>
    `<tr>
      <td style="${cell}color:#2c2c2c;">${esc(item.artwork_title)}</td>
      <td style="${cell}color:#6b6055;text-align:right;">${money(item.price)}</td>
    </tr>`
  ).join('');
  const taxRows = Number(tax) > 0
    ? `<tr><td style="${totalLabel}">Subtotal</td><td style="${totalValue}font-size:13px;">${money(subtotal)}</td></tr>
       <tr><td style="${totalLabel}">Tax</td><td style="${totalValue}font-size:13px;">${money(tax)}</td></tr>`
    : '';

  return wrap(
    h1('Order confirmed.') +
    p(`Thank you for collecting, ${esc(name)}. Your work is in safe hands.`) +
    divider() +
    `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${rows}
      ${taxRows}
      <tr>
        <td style="${totalLabel}">Total</td>
        <td style="${totalValue}font-size:15px;">${money(total)}</td>
      </tr>
    </table>` +
    divider() +
    p('Your work will be carefully packed and dispatched within 5–7 working days. I will be in touch with tracking information once it has shipped.') +
    p('Thank you for supporting this work.')
  );
}

export function orderNotificationArtist(data) {
  const { name, email, customer_address: address, items, total } = data;
  const itemsList = (Array.isArray(items) ? items : [])
    .map(item => `${esc(item.artwork_title)} — ${money(item.price)}`).join('<br>');

  return wrap(
    h1('New order received.') +
    label('Customer') +
    value(`${esc(name)} &lt;${esc(email)}&gt;`) +
    (address ? label('Ship to') + value(esc([address.line1, address.city, address.postal_code, address.country].filter(Boolean).join(', '))) : '') +
    label('Items') +
    value(itemsList) +
    label('Total') +
    value(money(total)) +
    divider() +
    `<p style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;margin:0;">
      <a href="mailto:${esc(email)}" style="color:#2c2c2c;text-decoration:underline;text-underline-offset:3px;">Email ${esc(name)} →</a>
    </p>`
  );
}
