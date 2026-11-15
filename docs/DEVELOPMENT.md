# Development and testing

## Architecture inspected

Fine Arc is a client-rendered React 19 / TypeScript 6 / Vite 8 application. Tailwind 3 styles the site; Framer Motion handles transitions; React Router 7 supplies history routing; Zustand persists the cart in `thefinearc-cart` localStorage. Supabase provides Postgres, public catalog reads and admin storage; React Query is installed but catalog hooks use React effects. Other dependencies include Stripe 23 (server), Nodemailer, Lucide, masonry and image helpers. No architecture or production component was changed by test setup.

`src/lib/mockData.ts` has eight USD artworks: Whisper of the Tide ($2400), Still Morning ($1850), Dusk Atlas ($3200, sold), Interior with Botanicals ($1600), Pale Geometry ($980), Threshold ($750), Earth Study No. 3 ($2100, reserved), Soft Architecture ($1750). Categories are painting, drawing, photography. Catalog hooks use Supabase when configured and demo data when unconfigured or empty. Actual production catalog contents were not queried. Listings support variations, inventory, images/video, framing and dimensions. Gallery sections derive from current listings and use `?section=` filters.

Routes in `src/App.tsx`: `/`, `/gallery`, `/artwork/:id`, `/about`, `/commissions`, `/contact`, `/cart`, `/checkout`, `/checkout/success`, `/admin`, and a 404 route. Coming-soon mode is hostname-gated for the public domain. Navbar has mobile overlay navigation. Cart supports stock bounds, variations, removal, price/stock synchronization, sales, coupon validation and persistence.

Contact, commission and newsletter forms insert directly through the public Supabase client; commission notifications also call the server email endpoint.

Vercel functions:

| Endpoint | Purpose |
|---|---|
| `/api/create-checkout-session` | Server-priced Checkout Session, tax, signed shipping quote |
| `/api/expire-checkout-session` | Expire obsolete payment form/session |
| `/api/stripe-webhook` | Signed payment events, orders, stock, coupons, emails |
| `/api/shipping-rates` | Public config GET, Shippo estimate POST |
| `/api/coupon` | Server coupon calculation |
| `/api/send-email` | Notifications tied to stored commission inquiries; accepted/declined require admin |
| `/api/admin` | Cookie/session login and authorized catalog, order, promotion and inquiry operations |
| `/api/etsy-listings` | Etsy listing import/read integration |
| `/api/etsy-oauth` | Etsy authorization/status/callback (callback rewrite in vercel.json) |

`supabase/schema.sql` and `supabase/migrations.sql` describe the database. Vite alone does not run these API functions. Default browser tests fulfill them with synthetic responses; API tests invoke actual handlers with transport mocks.

## Setup

```sh
npm ci --cache /workspace/.npm-cache
npm run build
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

No credentials needed for demo mode. Do not copy placeholder values from .env.example into .env.local. For real development services enter only the intended nonproduction bindings securely. Node 24.22.1 / npm 11.9.0 were used.

```sh
# Preferred: install Playwright's matching Chromium in a writable cache.
PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright npm test
# If downloads are restricted and a system browser exists:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test
npm run test:typecheck
npm run lint
```

The browser download host `cdn.playwright.dev` is blocked in the current environment; no verification was disabled. The config automatically falls back to /usr/bin/chromium if Playwright’s matching browser is absent; the explicit override is also supported. The system-browser option is a fallback and must be validated for compatibility. Browser plugin not available; regular Playwright was used as requested. Additional browser engines are not configured.

The Playwright config starts its own credential-free Vite server on 127.0.0.1:4175 with strict port ownership, no env-file loading, and explicit VITE overrides. It does not reuse an arbitrary server. Browser contexts block service workers; all API calls and third-party scripts are synthetic. Local assets load normally; external images use a neutral SVG fixture for deterministic layout. `E2E_REAL_IMAGES=1` permits external image GETs only, to audit actual image availability; this can fail under restricted network access. Screenshots, traces and JSON reports go to /tmp, not Git. Tests assert rendered content, errors, navigation, gallery filtering, product/cart persistence/removal, API failure recovery, image decoding, horizontal overflow, offscreen controls and header occlusion at all three sizes. Screenshot review is still needed for aesthetic or arbitrary overlap issues.

## Payments and findings

The implementation uses Checkout Sessions (`mode: payment`, `ui_mode: form`, API version 2026-03-25.dahlia) with Stripe.js from `/dahlia/stripe.js`, `initCheckoutFormSdk`, `createForm`, `loadActions`, and `actions.confirm`. It is not a legacy Card Element or a redirect-only hosted Checkout integration. Preserve this flow.

Verified in offline handler tests: client prices/amounts are ignored; database price and stock determine line items, server promotion calculations determine cents, and the server builds return URLs from the preview request host unless SITE_URL is configured. Invalid carts are rejected. Shipping rates carry signed fingerprints checked again at session creation. Secret keys stay in server files; the browser uses only VITE_STRIPE_PUBLISHABLE_KEY. No secret values were inspected.

Webhook handling disables body parsing, reconstructs the raw body and calls Stripe `constructEvent`. It retrieves the session and requires `payment_status === paid` before creating an order. A sequential duplicate lookup and Postgres unique index `orders_stripe_session_key` prevent duplicate orders; the handler treats SQLSTATE 23505 as an already-owned delivery. Tests cover valid/invalid signatures, unpaid completion, async failure/success, sequential duplicates and simulated concurrent constraint failure. The real database constraint and applied migrations have NOT been verified against a deployed database.

Issues left for a separate application change:

1. `CheckoutSuccessPage.tsx` trusts navigation, always claims confirmation and clears the cart; no session-status endpoint exists. An expected-failure browser test records this defect. Webhook order creation is server-verified, but the success UI is not.
2. Stock, coupon redemption and email happen after order insertion without a transactional outbox. Stock errors are caught; later deliveries return early on existing orders, so failed side effects may never retry. Concurrent different orders also read/patch stock without atomic reservation.
3. `buildEntries` clamps individual quantities but does not aggregate duplicate artwork/variation lines. Multiple repeated lines can exceed stock; fractional quantities are not rejected explicitly (Stripe may reject them).
4. Running only schema.sql leaves permissive public order insertion policy; migrations.sql removes it and adds uniqueness. Deployment state is unknown; do not apply migrations to production during testing.
5. `expire-checkout-session` parses a client-secret-shaped string but only sends the extracted session ID to Stripe; it does not compare the supplied secret with the real session secret. Its comment claims stronger authorization than it implements.
6. Tablet checkout summary at 768px gives the artwork title too little space, so it overlaps its price. A focused expected-failure test records this, with screenshot evidence.
7. Existing lint failures and bundle-size/Browserslist warnings remain.

## Stripe test-mode integration steps (not executed)

Browser payment tests simulate successful confirmation, declined confirmation and an authentication challenge at the SDK boundary. These validate our adapter behavior only, with a fake `pk_test_` key. API tests use fake `sk_test_` credentials and an actual locally signed fixture webhook. Neither creates real Stripe sessions, charges, orders, emails or database rows.

Real Stripe card/3DS tests require a dedicated Stripe test account, test-only Supabase database with migrations applied, preview-only server/public keys, test webhook secret, and email/shipping/fulfillment disabled or isolated. No such bindings were supplied, so real successful/declined/authenticated payments are unexecuted. Do not enable them by adding credentials to the default test suite.

In an explicitly authorized isolated preview: verify both keys are test mode, session `livemode` is false, and backend destinations belong to the test environment. Use future expiry and any valid CVC/ZIP: success `4242 4242 4242 4242`; decline `4000 0000 0000 0002`; 3DS `4000 0025 0000 3155` (Stripe's authentication-required test card). Complete/cancel the challenge, verify server payment status and signed webhook order creation, replay the same event and confirm one order/stock decrement. Verify declined and canceled authentication never create orders. Never send raw card data through the server. Do not use real cards even with test keys.

## Vercel previews

`vercel.json` keeps API routes outside the SPA rewrite and provides history-route fallback and preview noindex headers. Default build remains `npm run build`; Playwright is a dev dependency and no deployment settings were changed. Test config is separate from production Vite config.

For mocked smoke tests only: `E2E_PREVIEW_URL=https://<deployment>.vercel.app npm run test:e2e -- tests/e2e/storefront.spec.ts`. All APIs and Supabase REST requests remain mocked; production secrets are never sent to their services. Use an actual deployment preview (not a production alias) built without production frontend integrations. Payment-form fixture tests intentionally require the local fixture key; do not run those against an arbitrary preview build. Preview auth protection must be handled securely; never paste bypass secrets into commands or commit them. An actual preview deployment was not supplied or tested. Check that preview SITE_URL does not point back to production before authorizing real integration work.

## CI

`.github/workflows/test.yml` runs on pushes and pull requests with Node 24, a matching Playwright Chromium, build, test type checking, API/browser tests and lint, and retains screenshots/traces as artifacts. It uses no secrets and never deploys. Lint runs after tests and keeps its failure visible: CI remains red until the existing 25 source errors are resolved separately. The workflow has been reviewed locally but not run on GitHub Actions.

## Current validation evidence

Validated on branch `codex/development-e2e-safety` in Codex Cloud:

| Check | Outcome |
|---|---|
| Frozen npm installation | Passed |
| Production build | Passed; advisory 735 kB JS bundle and old Browserslist data |
| Test TypeScript / new test-file lint | Passed |
| Offline API tests | 9 passed |
| Chromium browser matrix | 50 passed, 4 expected failures, 0 unexpected failures, 0 skipped |
| Existing repository lint | 25 existing source errors |
| Real external gallery-image audit | Failed: eight images unavailable; picsum.photos returns HTTP 403 from environment egress |
| Real Stripe transactions/3DS, deployed database uniqueness, real Vercel preview, GitHub Actions | Not executed; require isolated services or a supplied deployment |

The four expected browser failures are the unverified confirmation route at all three sizes, plus overlapping checkout title/price on tablet. These remain application defects, not passing behavior. Current tests do not certify all possible text/element overlaps; screenshots of desktop gallery, tablet checkout and mobile checkout were reviewed. External fonts/scripts are blocked or mocked, so screenshots are deterministic layout evidence rather than full production-fidelity rendering.

Evidence is in `/tmp/finearc-e2e-results`, JSON in `/tmp/finearc-e2e-results.json`; the separate real-image audit is under `/tmp/finearc-real-images` and its log at `/tmp/finearc-real-images.log`. Rerunning replaces the configured output directory. To repeat the real-image check without replacing the main evidence: `E2E_REAL_IMAGES=1 npm run test:e2e -- --project desktop --grep 'layout /gallery$' --output /tmp/finearc-real-images --reporter=list`.

Manual environment actions, if needed: allow `cdn.playwright.dev` for matching-browser downloads and the artwork image host/redirect CDN (`picsum.photos`, `fastly.picsum.photos`) for real-image auditing. Preserve existing network rules and TLS verification. These are environment test requirements, not changes to production settings. Resolve the documented application issues in a separate reviewed change before treating payment confirmation/fulfillment as fully verified.
