# Stripe integration — remaining steps

Checkout now uses Stripe's **embedded payment form** (`ui_mode: "form"`, API version `2026-03-25.dahlia`).
The customer enters shipping details on our checkout page, then pays in a Stripe form on the same page.

## Values to Replace

No placeholder values remain: `mode` is `"payment"` and `line_items` are built on the server from the artworks and
prices in your database, so there is nothing to swap in.

**You do need to set these environment variables (Vercel → Settings → Environment Variables, then redeploy):**

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` (later `pk_live_...`) | Public key. Dashboard → Developers → API keys. Needs the `VITE_` prefix so the browser can read it. |
| `STRIPE_SECRET_KEY` | `sk_test_...` (later `sk_live_...`) | Server only. Mark Sensitive. No `VITE_` prefix. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | From the webhook endpoint (below). Server only. |

## Configured Parameters

These came from Checkout Studio and are set in the session call.

**Files containing these parameters:**
- [api/create-checkout-session.js](api/create-checkout-session.js)

| Parameter | Value |
|-----------|-------|
| ui_mode | form |
| billing_address_collection | auto |
| phone_number_collection | { enabled: false } |
| submit_type | auto |
| integration_identifier | custom_embedded_web_0001 |
| payment_method_collection | not set (only used when `mode` is `subscription`) |
| API version | 2026-03-25.dahlia (set on the Stripe client) |

### Where this differs from the Studio configuration (on purpose)

You chose to keep your existing tax, shipping and order tracking, so these were **kept** even though the Studio config omits or changes them:

| Parameter | Kept as | Why |
|-----------|---------|-----|
| automatic_tax | `{ enabled: true }` (Studio says `false`) | You use Stripe Tax. |
| shipping_options | the shipping rate the customer chose | Shipping estimate charged at checkout. |
| shipping_address_collection | **not set** when shipping estimates are on; set (limited to your countries) when they are off | The address is entered on our checkout page, saved on a Stripe Customer (`customer`) and in `metadata`, so the payment form doesn't ask again and tax uses it. |
| metadata | item ids, quantities, shipping quote | The webhook uses it to create the order and reduce stock. **Do not remove.** |
| return_url | `/checkout/success?session_id={CHECKOUT_SESSION_ID}` | Replaces `success_url` / `cancel_url`, which embedded checkout does not use. |

> **Check this in test mode first.** If Stripe says `shipping_options` needs `shipping_address_collection`, put `shipping_address_collection` back in the session call (the payment form will then ask for the address again).
> I could not run `ui_mode: "form"` against Stripe from the build environment.
> If creating a session fails, the error will name the parameter (most likely `shipping_address_collection`,
> `shipping_options` or `automatic_tax`, which this mode may handle differently). Send the error message and the
> parameter can be adjusted. To use the Studio values exactly, set `automatic_tax` to `{ enabled: false }` and remove
> `shipping_options`, `shipping_address_collection` and `metadata` in
> [api/create-checkout-session.js](api/create-checkout-session.js) — but then orders, stock updates, shipping and tax stop working.

## Setup

1. Install dependencies: `npm install` (`stripe` 23.x is already in `package.json`).
2. Set the three environment variables above. Use **test** keys first.
3. Create the webhook: Stripe Dashboard → Developers → Webhooks → Add endpoint
   - URL: `https://www.thefinearcbyleela.com/api/stripe-webhook` (use the `www` address; Stripe does not follow redirects)
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Stripe Tax: Dashboard → Tax → enable, set your head-office address and registrations.
5. Make sure the earlier setup is done: `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, and (for shipping) the `SHIPPO_API_KEY` / `SHIP_FROM_*` variables. See `.env.example`.

## Project structure

| File | Purpose |
|------|---------|
| [index.html](index.html) | Loads Stripe.js from `https://js.stripe.com/dahlia/stripe.js` (never bundled or self-hosted). |
| [api/create-checkout-session.js](api/create-checkout-session.js) | Creates the Checkout Session and returns `{ client_secret }`. Prices and stock are read from the database. |
| [src/components/checkout/EmbeddedPaymentForm.tsx](src/components/checkout/EmbeddedPaymentForm.tsx) | Mounts the Stripe form into `#checkout-form` and wires the `confirm` event. |
| [src/pages/CheckoutPage.tsx](src/pages/CheckoutPage.tsx) | Address and shipping options, then the payment form. |
| [api/stripe-webhook.js](api/stripe-webhook.js) | Verifies the signature, creates the order, reduces stock, sends emails. |
| [src/pages/CheckoutSuccessPage.tsx](src/pages/CheckoutSuccessPage.tsx) | Where Stripe returns the customer after paying; clears the cart. |

## How it works

1. Customer enters their address and picks a shipping option (prices come from Shippo, re-checked on the server).
2. The page calls `POST /api/create-checkout-session`, which returns a `client_secret`.
3. The page initialises the form with `stripe.initCheckoutFormSdk({ clientSecret, appearance })`, mounts it, and calls `confirm` when the customer pays.
4. Stripe redirects to `return_url` (`/checkout/success`).
5. Stripe also calls the webhook, which creates the order and updates stock.

## Testing

Use **test mode** (test keys) with these cards, any future expiry, any CVC and any ZIP:

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0027 6000 3184` | Requires 3D Secure authentication |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0002` | Declined (generic) |

After a test payment, check: the order appears in Supabase and the admin, stock went down, the confirmation email arrived,
and the webhook shows a `200` under Developers → Webhooks.

## Next steps

- Go live: swap the three variables for live keys, create the webhook in **live** mode, and redo the test with a real card and a refund.
- Products and prices are managed in the admin (artworks and variations), not in the Stripe Dashboard.
- Fulfilment: update order status in the admin as you ship; the shipping note on an order warns you if the customer changed their ZIP after the quote.

## Resources

- Stripe support: https://support.stripe.com
- Stripe docs and MCP: https://docs.stripe.com/mcp
