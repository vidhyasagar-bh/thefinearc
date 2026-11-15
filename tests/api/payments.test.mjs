import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import RealStripe from 'stripe';

// All transports are replaced BEFORE handlers load; no credentials or network are used.
for (const name of Object.keys(process.env)) {
  if (/^(STRIPE_|SUPABASE_|VITE_|SMTP_|SHIPPO_|SHIP_FROM_)/.test(name)) delete process.env[name];
}
process.env.STRIPE_SECRET_KEY = 'sk_test_local_fixture';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_local_fixture';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'local_fixture';
globalThis.fetch = () => { throw new Error('Network forbidden in API tests'); };
const real = new RealStripe('sk_test_local_fixture');
let orders, stockWrites, sends, captured, paid, collision;
const art = { id: 'art-1', title: 'Test art', price: 24, quantity: 3, availability: 'available', images: [], category: 'painting' };
const session = () => ({ id: 'cs_test_fixture', payment_status: paid ? 'paid' : 'unpaid',
  metadata: { item_0: 'art-1||1' }, payment_intent: { id: 'pi_test_fixture' },
  customer_details: { name: 'Test', email: 'test@example.invalid' }, amount_total: 2400, amount_subtotal: 2400 });
class Stripe {
  webhooks = real.webhooks;
  checkout = { sessions: {
    create: async input => { captured = input; return { client_secret: 'cs_test_fixture_secret_fake' }; },
    retrieve: async () => session(),
    listLineItems: async () => ({ data: [{ description: 'Test art', quantity: 1, amount_subtotal: 2400 }] }),
  } };
}
mock.module('stripe', { defaultExport: Stripe });
mock.module('../../api/_lib/supabase.js', { namedExports: {
  hasServiceRole: () => true,
  sb: async (path, init = {}) => {
    if (path.startsWith('orders?')) return orders ? [{ id: 'order-fixture' }] : [];
    if (path === 'orders' && init.method === 'POST') {
      if (collision) throw Object.assign(new Error('duplicate'), { body: { code: '23505' } });
      orders++; return [];
    }
    if (path.startsWith('artworks?') && init.method === 'PATCH') { stockWrites++; return []; }
    if (path.startsWith('artworks?')) return [structuredClone(art)];
    if (path.startsWith('sales?') || path.startsWith('coupons?')) return [];
    throw new Error(`Unexpected database call ${path}`);
  },
} });
mock.module('../../api/_lib/mailer.js', { namedExports: { deliver: async () => { sends++; return []; } } });
const { default: checkout } = await import('../../api/create-checkout-session.js');
const { default: webhook } = await import('../../api/stripe-webhook.js');
function response() {
  return { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, send(b) { this.body = b; return this; }, end() { return this; } };
}
async function event(type = 'checkout.session.completed', bad = false) {
  const body = JSON.stringify({ id: 'evt_test_fixture', type, data: { object: { id: 'cs_test_fixture' } } });
  const req = Readable.from([Buffer.from(body)]);
  req.method = 'POST'; req.headers = { 'stripe-signature': bad ? 'bad' : real.webhooks.generateTestHeaderString({ payload: body, secret: process.env.STRIPE_WEBHOOK_SECRET }) };
  const res = response(); await webhook(req, res); return res;
}
beforeEach(() => { orders = 0; stockWrites = 0; sends = 0; captured = null; paid = true; collision = false; });
test('checkout uses server price, ignores supplied amounts and clamps quantity', async () => {
  const res = response();
  await checkout({ method: 'POST', headers: { host: 'preview.vercel.app' }, body: { items: [{ artworkId: 'art-1', quantity: 99, price: 0.01 }], amount: 1 } }, res);
  assert.equal(res.code, 200); assert.equal(res.body.items_total, 7200);
  assert.equal(captured.line_items[0].price_data.unit_amount, 2400);
  assert.equal(captured.line_items[0].quantity, 3);
  assert.equal(captured.ui_mode, 'form');
  assert.equal(captured.return_url, 'https://preview.vercel.app/checkout/success?session_id={CHECKOUT_SESSION_ID}');
});
test('invalid cart rejected before Stripe creation', async () => {
  const res = response(); await checkout({ method: 'POST', body: { items: [] } }, res);
  assert.equal(res.code, 400); assert.equal(captured, null);
});
test('signed paid webhook creates one order; duplicate delivery has no side effects', async () => {
  assert.equal((await event()).code, 200); assert.equal((await event()).code, 200);
  assert.equal(orders, 1); assert.equal(stockWrites, 1); assert.equal(sends, 1);
});
test('concurrent unique constraint violation does not repeat fulfillment', async () => {
  collision = true; assert.equal((await event()).code, 200);
  assert.equal(orders, 0); assert.equal(stockWrites, 0); assert.equal(sends, 0);
});
test('invalid signature rejected without writes', async () => {
  assert.equal((await event(undefined, true)).code, 400); assert.equal(orders, 0); assert.equal(stockWrites, 0);
});
test('unpaid completed session cannot fulfill', async () => {
  paid = false; assert.equal((await event()).code, 200); assert.equal(orders, 0);
});
test('async payment failure cannot fulfill', async () => {
  assert.equal((await event('checkout.session.async_payment_failed')).code, 200); assert.equal(orders, 0);
});
test('async payment success checks server status and fulfills once', async () => {
  assert.equal((await event('checkout.session.async_payment_succeeded')).code, 200); assert.equal(orders, 1);
});

test('shipping quote rejects amount tampering, expiry and changed fingerprint', async () => {
  const { signRates, verifyRate } = await import('../../api/_lib/shipping.js');
  const [rate] = signRates([{ provider: 'Test', token: 'test', service: 'Ground', amount: 12, days: 3 }], 'cart/address');
  assert.equal(verifyRate(rate, 'cart/address').amount, 12);
  assert.equal(verifyRate({ ...rate, amount: 0.01 }, 'cart/address'), null);
  assert.equal(verifyRate({ ...rate, exp: 1 }, 'cart/address'), null);
  assert.equal(verifyRate(rate, 'other-cart/address'), null);
});
