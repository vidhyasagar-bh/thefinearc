# Fine Arc development

Use the existing isolated checkout. Do not create worktrees unless requested. Work on a separate branch and preserve user changes. Node 24 and npm 11 are validated; use `npm ci` with package-lock.json. Keep React/Vite, Tailwind, Zustand, Supabase, Vercel functions, and the existing Stripe Checkout Form SDK architecture. Avoid redesigns or incidental dependency upgrades.

## Validate changes

- `npm run build`: TypeScript and production Vite bundle.
- `npm run lint`: currently has 25 pre-existing errors; report them, never disable rules to obtain a pass.
- `npm run test:typecheck`: validates Playwright config and test TypeScript.
- `npm run test:api`: offline Node handler tests, including actual webhook signature verification with fixture credentials. Requires Node 24 and experimental module mocks.
- `npm run test:e2e`: Playwright Chromium at desktop 1440×900, tablet 768×1024, mobile 390×844. See docs/DEVELOPMENT.md for browser setup and isolation.
- Screenshot and trace artifacts are under /tmp/finearc-e2e-results, with JSON results at /tmp/finearc-e2e-results.json. Inspect important screenshots as well as assertions. Synthetic remote images are not proof of real asset availability.
- Keep expected failures separate from passes. Do not expand expected failures to hide regressions. A payment SDK simulation is not a real Stripe transaction or 3DS validation.

## Safety

Never use production Stripe keys, real cards, production Supabase, live SMTP, Shippo purchases, or Etsy mutations in tests. Never print secrets, inspect credential file contents, or commit .env files. All browser API requests and third-party scripts are intercepted by the shared fixture; never remove that guard to make tests pass. The test Vite config ignores env files and overrides frontend credentials. API tests replace all transport dependencies before loading handlers and forbid fetch.

Never deploy, alter Vercel live settings, apply SQL migrations, or change production credentials as part of testing. A Vercel preview URL alone is not evidence of isolated backend data. Real integration validation needs a dedicated test Stripe account, test-only database and webhook destination, disabled email/fulfillment, and explicit authorization. No automatic real-integration runner is provided.

Current issues and payment architecture are recorded in docs/DEVELOPMENT.md. Do not silently treat `/checkout/success` as payment verification. Orders must originate from verified server-side Stripe events, not a browser redirect. Preserve raw webhook bodies and the unique Checkout session database constraint.
