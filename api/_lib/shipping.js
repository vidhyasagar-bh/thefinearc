import crypto from 'node:crypto';
import { sb } from './supabase.js';

const SHIPPO_URL = 'https://api.goshippo.com/shipments/';
const US_ZIP = /^\d{5}(-\d{4})?$/;

const positive = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export function shippingConfig() {
  const e = process.env;
  return {
    enabled: Boolean(e.SHIPPO_API_KEY && e.SHIP_FROM_STREET1 && e.SHIP_FROM_CITY && e.SHIP_FROM_STATE && e.SHIP_FROM_ZIP),
    countries: (e.SHIPPING_COUNTRIES || 'US').split(',').map(c => c.trim().toUpperCase()).filter(Boolean),
  };
}

export function validateAddress(raw, countries) {
  if (!raw || typeof raw !== 'object') return { error: 'Please enter your shipping address.' };
  const a = {
    name: String(raw?.name || '').trim().slice(0, 80),
    street1: String(raw?.street1 || '').trim().slice(0, 100),
    street2: String(raw?.street2 || '').trim().slice(0, 100),
    city: String(raw?.city || '').trim().slice(0, 60),
    state: String(raw?.state || '').trim().toUpperCase().slice(0, 40),
    zip: String(raw?.zip || '').trim().slice(0, 12),
    country: String(raw?.country || '').trim().toUpperCase(),
  };
  if (!countries.includes(a.country)) return { error: 'We do not ship to that country.' };
  if (!a.street1 || !a.city || !a.zip) return { error: 'Please enter your street address, city and ZIP / postal code.' };
  if (a.country === 'US') {
    if (!/^[A-Z]{2}$/.test(a.state)) return { error: 'Please choose your state.' };
    if (!US_ZIP.test(a.zip)) return { error: 'Please enter a valid 5-digit ZIP code.' };
  }
  return { address: a };
}

// Packs the cart into one box: weights add up, pieces stack (flat art), footprint is the biggest piece.
export async function buildParcel(lines) {
  const d = {
    weight: positive(process.env.SHIP_DEFAULT_WEIGHT_OZ, 16),
    length: positive(process.env.SHIP_DEFAULT_LENGTH_IN, 14),
    width: positive(process.env.SHIP_DEFAULT_WIDTH_IN, 14),
    height: positive(process.env.SHIP_DEFAULT_HEIGHT_IN, 2),
  };
  const ids = [...new Set(lines.map(l => l.artworkId))];
  const rows = await sb(`artworks?select=id,weight_oz,package_length,package_width,package_height&id=in.(${ids.join(',')})`);
  const byId = new Map((rows || []).map(r => [r.id, r]));
  let weight = 0, length = 0, width = 0, height = 0;
  for (const l of lines) {
    const r = byId.get(l.artworkId) || {};
    const qty = Math.max(1, Number(l.quantity) || 1);
    weight += qty * positive(r.weight_oz, d.weight);
    length = Math.max(length, positive(r.package_length, d.length));
    width = Math.max(width, positive(r.package_width, d.width));
    height += qty * positive(r.package_height, d.height);
  }
  const round = n => Math.ceil(n * 10) / 10;
  return { weight: round(weight), length: round(length), width: round(width), height: round(height) };
}

export async function quoteRates({ address, parcel }) {
  const e = process.env;
  const body = {
    address_from: {
      name: e.SHIP_FROM_NAME || 'The Fine Arc',
      street1: e.SHIP_FROM_STREET1,
      ...(e.SHIP_FROM_STREET2 ? { street2: e.SHIP_FROM_STREET2 } : {}),
      city: e.SHIP_FROM_CITY,
      state: e.SHIP_FROM_STATE,
      zip: e.SHIP_FROM_ZIP,
      country: e.SHIP_FROM_COUNTRY || 'US',
    },
    address_to: {
      name: address.name || 'Customer',
      street1: address.street1,
      ...(address.street2 ? { street2: address.street2 } : {}),
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country,
    },
    parcels: [{
      length: String(parcel.length), width: String(parcel.width), height: String(parcel.height),
      distance_unit: 'in', weight: String(parcel.weight), mass_unit: 'oz',
    }],
    async: false,
  };
  const res = await fetch(SHIPPO_URL, {
    method: 'POST',
    headers: { Authorization: `ShippoToken ${e.SHIPPO_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Shippo ${res.status}: ${text.slice(0, 300)}`);
  const data = JSON.parse(text);

  const seen = new Set();
  const rates = (data.rates || [])
    .filter(r => r.currency === 'USD' && Number(r.amount) > 0)
    .map(r => ({
      provider: String(r.provider || ''),
      service: String(r.servicelevel?.name || ''),
      token: String(r.servicelevel?.token || ''),
      amount: Number(r.amount),
      days: r.estimated_days != null ? Number(r.estimated_days) : null,
    }))
    .sort((a, b) => a.amount - b.amount)
    .filter(r => { const k = `${r.provider}|${r.token}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 4);
  return rates;
}

// ── Signed quotes ─────────────────────────────────────────────────────────────
// A quote is signed when it is shown, so checkout can trust the price the customer saw
// without asking Shippo again (a second call can return a different list or fail).
const QUOTE_TTL_MS = 30 * 60 * 1000;

const signingKey = () =>
  crypto.createHash('sha256').update(`shipping-quote:${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SHIPPO_API_KEY || ''}`).digest();

// Ties a quote to this exact cart and address so it can't be reused for something else
export function quoteFingerprint(lines, address) {
  const cart = lines
    .map(l => `${l.artworkId}:${l.variationId ?? ''}:${Math.max(1, Number(l.quantity) || 1)}`)
    .sort()
    .join('|');
  const to = [address.street1, address.street2, address.city, address.state, address.zip, address.country]
    .map(v => String(v ?? '').trim().toLowerCase()).join('|');
  return `${cart}#${to}`;
}

function quoteMac(rate, exp, fingerprint) {
  return crypto.createHmac('sha256', signingKey())
    .update([rate.provider, rate.token, rate.service, Number(rate.amount).toFixed(2), exp, fingerprint].join('\n'))
    .digest('base64url');
}

export function signRates(rates, fingerprint) {
  const exp = Date.now() + QUOTE_TTL_MS;
  return rates.map(r => ({ ...r, exp, sig: quoteMac(r, exp, fingerprint) }));
}

// Returns the rate as originally quoted, or null if it was altered, expired or belongs to a different cart/address
export function verifyRate(rate, fingerprint) {
  if (!rate || typeof rate.sig !== 'string' || !Number.isFinite(Number(rate.exp)) || Number(rate.exp) < Date.now()) return null;
  const expected = quoteMac(rate, Number(rate.exp), fingerprint);
  if (rate.sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(rate.sig), Buffer.from(expected))) return null;
  return { provider: String(rate.provider), service: String(rate.service), token: String(rate.token), amount: Number(rate.amount), days: rate.days != null ? Number(rate.days) : null };
}
