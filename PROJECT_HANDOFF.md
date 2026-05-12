# PROJECT HANDOFF — The Fine Arc
**Generated:** 2026-05-12  
**Branch:** `claude/luxury-art-ecommerce-mvp-JqXx1`  
**Repo:** `vidhyasagar-bh/thefinearc`  
**Status:** MVP complete, content replacement in progress

---

## 1. Project Overview

### What It Is
**The Fine Arc** is a luxury art e-commerce website for a single artist selling original fine art (paintings, drawings, photography, prints, mixed media). It is designed to feel like a premium gallery — minimal, immersive, editorial — not a generic online shop.

### Business Goal
- Sell original artworks directly to collectors (no intermediary galleries)
- Accept commission inquiries for bespoke work
- Build a mailing list for new collection announcements
- Present the artist's story and practice with a high-end aesthetic

### Current Development Status
**MVP is feature-complete.** All pages exist, all flows work in demo mode. Real payment processing (Stripe backend) is not yet wired up. Content (images, artist text, artwork data) is still placeholder and is being replaced by the artist.

### Core Architecture
- **Frontend only** — React SPA served statically via Vercel
- **Backend-as-a-service** — Supabase handles database, authentication, file storage
- **Payments** — Stripe integration is stubbed (frontend key accepted, no server-side payment intent creation yet)
- **State** — Zustand with localStorage persistence for cart

### Tech Stack

| Layer | Technology | Version |
|---|---|---|
| UI Framework | React | 19.2.5 |
| Language | TypeScript | 6.0.2 |
| Build Tool | Vite | 8.0.10 |
| Styling | Tailwind CSS | 3.4.19 |
| Animation | Framer Motion | 12.38.0 |
| Routing | React Router DOM | 7.15.0 |
| State (cart) | Zustand | 5.0.13 |
| Database/Auth | Supabase JS | 2.105.4 |
| Payments | Stripe JS + React | 9.4.0 / 6.3.0 |
| Toast notifications | react-hot-toast | 2.6.0 |
| Icons | lucide-react | 1.14.0 |
| Hosting | Vercel | — |

### Important Dependencies / Gotchas

| Package | Issue |
|---|---|
| `@supabase/supabase-js` | `createClient('','')` throws "Invalid URL" at module load time if env vars are empty — crashes the whole app silently. Fixed with `supabaseConfigured` guard. |
| `framer-motion` v12 | Breaking change: `useScroll`/`useTransform` moved to `motion/react`. Removed from Hero to avoid crash. |
| `react-intersection-observer` v10 | API incompatibility — replaced entirely with native `IntersectionObserver` in `FadeIn.tsx`. Package is still in `package.json` but not used. |
| `lucide-react` v1.14.0 | No `Instagram` icon in this version. Custom `InstagramIcon` SVG created in `src/components/ui/Icons.tsx`. |
| TypeScript `verbatimModuleSyntax` | All type-only imports must use `import type { ... }` syntax — enforced by tsconfig. |

### Environment Variables Required

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... (optional — app runs in demo mode without it)
```

Without Supabase vars: app runs in full demo mode using `mockData.ts`. No crash.  
Without Stripe key: checkout shows "Demo mode" warning, simulates a successful order after 1.5s.

---

## 2. Repository Structure

```
thefinearc/
├── public/                         # Static assets (favicon etc.)
├── src/
│   ├── App.tsx                     # Root component, router, ErrorBoundary, ScrollToTop
│   ├── main.tsx                    # React DOM render entry point
│   ├── index.css                   # Global styles, Tailwind directives, scrollbar, overflow-x fix
│   ├── App.css                     # Minimal app-level styles (largely unused)
│   │
│   ├── assets/                     # Bundled static assets
│   │   ├── hero.png                # (unused — hero now uses Supabase URL)
│   │   └── react.svg / vite.svg   # Default Vite scaffolding (unused)
│   │
│   ├── components/
│   │   ├── artwork/
│   │   │   ├── ArtworkCard.tsx     # Single artwork card (image + title + price + availability)
│   │   │   └── ArtworkGrid.tsx     # Responsive grid of ArtworkCards
│   │   ├── layout/
│   │   │   ├── Layout.tsx          # Page wrapper (Navbar + main + Footer)
│   │   │   ├── Navbar.tsx          # Sticky nav, transparent on home hero, frosted on scroll, mobile menu
│   │   │   └── Footer.tsx          # 3-col footer: brand, nav links, newsletter signup
│   │   ├── sections/               # Homepage-specific sections
│   │   │   ├── Hero.tsx            # Full-screen hero image with text overlay
│   │   │   ├── FeaturedCollection.tsx  # Carousel (mobile) / 3-col grid (desktop) of featured artworks
│   │   │   ├── ArtistIntro.tsx     # 2-col: artist image + short bio with link to About
│   │   │   ├── InstagramSection.tsx    # Placeholder Instagram feed grid
│   │   │   └── NewsletterSection.tsx   # Email capture section
│   │   └── ui/
│   │       ├── Button.tsx          # Reusable button (primary/secondary variants, sm/md/lg sizes)
│   │       ├── FadeIn.tsx          # Scroll-triggered fade-in wrapper (native IntersectionObserver)
│   │       ├── Icons.tsx           # Custom SVG icons (InstagramIcon)
│   │       ├── Input.tsx           # Input + Textarea components with label styling
│   │       ├── LoadingSpinner.tsx  # Spinner + PageLoader (full-screen)
│   │       └── ScrollToTop.tsx     # Fires window.scrollTo on every route change
│   │
│   ├── hooks/
│   │   └── useArtworks.ts          # useArtworks(category?) + useArtwork(id) — Supabase or mock fallback
│   │
│   ├── lib/
│   │   ├── mockData.ts             # 8 mock artworks + featuredArtworks export
│   │   ├── stripe.ts               # Stripe loadStripe() initialiser (lazy, checks env var)
│   │   └── supabase.ts             # Supabase client with supabaseConfigured guard
│   │
│   ├── pages/
│   │   ├── HomePage.tsx            # Assembles Hero + FeaturedCollection + ArtistIntro + Newsletter + Instagram
│   │   ├── GalleryPage.tsx         # Filterable artwork grid by category
│   │   ├── ArtworkDetailPage.tsx   # Full artwork detail: images, lightbox, specs, related works, add to cart
│   │   ├── AboutPage.tsx           # Artist statement, philosophy, process images, CTA
│   │   ├── CommissionsPage.tsx     # Commission enquiry form (name, email, phone, description, size, colour)
│   │   ├── ContactPage.tsx         # Contact form + email/Instagram links + studio image
│   │   ├── CartPage.tsx            # Cart with quantity controls, remove, order summary
│   │   ├── CheckoutPage.tsx        # Shipping form + Stripe/demo payment
│   │   └── AdminPage.tsx           # CRUD dashboard for artworks, orders, commissions, subscribers
│   │
│   ├── store/
│   │   └── cartStore.ts            # Zustand cart store with persist middleware
│   │
│   ├── types/
│   │   └── index.ts                # Artwork, CartItem, Order, CommissionInquiry TypeScript types
│   │
│   └── utils/
│       └── format.ts               # formatPrice(n) → "£2,400"
│
├── supabase/
│   └── schema.sql                  # Full DB schema with RLS policies + storage bucket setup
│
├── index.html                      # Vite HTML entry, Google Fonts, error overlay scripts
├── package.json
├── tailwind.config.js              # Custom colors, fonts, spacing, scrollbar-hide plugin
├── tsconfig.json                   # Strict TS, verbatimModuleSyntax, bundler module resolution
├── vite.config.ts                  # Vite + @vitejs/plugin-react
├── vercel.json                     # SPA rewrite: all routes → index.html
└── PROJECT_HANDOFF.md              # This file
```

---

## 3. Features Implemented

### 3.1 Homepage
**Files:** `src/pages/HomePage.tsx`, `src/components/sections/`

Assembles five sections in order:
1. **Hero** — full-screen image with gradient overlay, animated heading/subtext/CTAs, scroll indicator. Image: Supabase storage `hero.png`.
2. **Featured Collection** — desktop: 3-col grid of available artworks. Mobile: controlled single-slide carousel with overlaid arrows (positioned using `aspect-[3/4]` ghost layer), dot indicators, 5-second autoscroll via `setInterval`.
3. **Artist Intro** — 2-col layout: photo + short bio + "Read My Story" link.
4. **Newsletter** — standalone email capture that posts to Supabase `newsletter_subscribers`.
5. **Instagram** — placeholder grid of 6 images with `@handle` link (no real Instagram API).

### 3.2 Gallery
**Files:** `src/pages/GalleryPage.tsx`, `src/components/artwork/ArtworkGrid.tsx`, `src/components/artwork/ArtworkCard.tsx`

- Category filter tabs: All / Painting / Drawing / Photography / Print / Mixed Media
- On mobile: tabs scroll horizontally (`overflow-x-auto scrollbar-hide`) with `flex-none` chips
- Grid uses `ArtworkGrid` which renders `ArtworkCard` components
- Data comes from `useArtworks(category)` hook — Supabase if configured, otherwise filtered mock data
- Empty state shown when no results for a category

### 3.3 Artwork Detail Page
**Files:** `src/pages/ArtworkDetailPage.tsx`

- Breadcrumb back to gallery
- Primary image with zoom-on-hover + lightbox on click
- Thumbnail strip if multiple images
- Lightbox: fullscreen overlay with prev/next arrows via keyboard/click, `AnimatePresence` fade between images
- Specs table: Materials, Dimensions, Framing (if set)
- Story quote (italic serif)
- Price display or "Sold"/"Reserved" badge
- "Add to Collection" → Zustand cart + toast notification
- Sold/Reserved: shows commission enquiry CTA instead
- Related works: up to 3 artworks from same category below
- Sticky detail panel on `lg+`

### 3.4 About Page
**Files:** `src/pages/AboutPage.tsx`

- Full-bleed hero image with text overlay
- Artist statement (long-form copy)
- 3-col philosophy grid ("Originals only", "Slow practice", "Made to last")
- 2-up process photos
- Dark CTA strip linking to Gallery + Commissions
- Portrait: `lg:sticky` (only sticks on desktop)

### 3.5 Commissions Page
**Files:** `src/pages/CommissionsPage.tsx`

- 4-step process explanation (Enquire → Discuss → Create → Deliver)
- Form fields: Name*, Email*, Phone (optional), Vision description*, Preferred size*, Colour palette*
- On submit: inserts to Supabase `commission_inquiries` table if configured
- Success state replaces form after submission
- Budget and style preference fields were explicitly removed per artist request

### 3.6 Contact Page
**Files:** `src/pages/ContactPage.tsx`

- Left column: heading, intro copy, email link, Instagram link, studio photo (hidden on mobile)
- Right column: contact form (Name*, Email*, Subject, Message*)
- Posts to Supabase `contact_messages`
- Success state on submission

### 3.7 Cart
**Files:** `src/pages/CartPage.tsx`, `src/store/cartStore.ts`

- Lists cart items with thumbnail, title, materials, dimensions
- Quantity controls (+ / −) — removing an item when quantity reaches 0 via `updateQuantity`
- Animated add/remove with `AnimatePresence`
- Order summary sidebar (sticky on `lg+`, appears above form on mobile)
- Persisted in localStorage via Zustand persist middleware

### 3.8 Checkout
**Files:** `src/pages/CheckoutPage.tsx`, `src/lib/stripe.ts`

- Order summary appears first on mobile (CSS `order-1/order-2`)
- Form: email, full name, address, city, postal code, country
- Payment section: shows "Demo mode" warning if no Stripe key, otherwise "Secure payment via Stripe"
- Demo mode: 1.5s simulated delay → order confirmed state → cart cleared
- Real Stripe: shows error prompting backend setup (no server-side payment intent exists yet)
- Order confirmed state with email confirmation copy

### 3.9 Admin Dashboard
**Files:** `src/pages/AdminPage.tsx`

- No authentication — accessible at `/admin` by anyone who knows the URL (security risk — see §9)
- 4 tabs: Artworks, Orders, Commissions, Subscribers
- Artworks tab: lists all artworks (mock or Supabase), add/edit/delete with inline form
- Form fields: title, price, dimensions, materials, year, category (select), availability (select), framing, image URL, description, story
- Orders/Commissions/Subscribers tabs: show "Connect Supabase" or "No data yet" states
- Mobile: tabs show icon-only below `sm`, labels appear at `sm+`
- Mobile: price + availability badge shown inline under artwork title in list rows

### 3.10 Navigation
**Files:** `src/components/layout/Navbar.tsx`

- Transparent on homepage hero (detects scroll position)
- Frosted glass (`bg-white/80 backdrop-blur-md`) on scroll or on non-home pages
- Cart icon with item count badge
- Mobile: full-screen overlay menu with `AnimatePresence` slide-in
- Links: Gallery, About, Commissions, Contact, Cart

### 3.11 Footer
**Files:** `src/components/layout/Footer.tsx`

- 3 columns (stack on mobile): brand tagline + social icons, navigation links, newsletter form
- Newsletter: posts email to Supabase `newsletter_subscribers`, handles duplicate (error code `23505`) silently
- Admin link (very faint, `text-white/20`)

### 3.12 Scroll To Top
**Files:** `src/components/ui/ScrollToTop.tsx`, `src/App.tsx`

- `useLocation` hook watches pathname changes
- `window.scrollTo({ top: 0, behavior: 'instant' })` fires on every route change
- Mounted inside `<BrowserRouter>` in `App.tsx`

---

## 4. Work Completed Chronologically

| Date | Commit | Description |
|---|---|---|
| 2026-05-11 | `c4b0554` | Initial full MVP build — all pages, components, Supabase schema, Stripe stub, Zustand cart, Tailwind design system |
| 2026-05-11 | `679effc` | Replaced all Unsplash URLs with picsum.photos seeded placeholders (Unsplash requires API key) |
| 2026-05-11 | `cd48f54` | Removed lazy loading + AnimatePresence from App router (was causing blank page) |
| 2026-05-11 | `2867a56` | Root-cause fix for blank page: `supabase.ts` guard (`supabaseConfigured`), replaced `react-intersection-observer` with native API in `FadeIn.tsx`, removed `useScroll`/`useTransform` from Hero (Framer Motion v12 breaking change) |
| 2026-05-11 | `9921d6f` | Added mobile carousel to FeaturedCollection (CSS snap-scroll, first iteration) |
| 2026-05-11 | `3f922e2` | Fixed carousel left-alignment; removed budget + style_preferences fields from Commissions form |
| 2026-05-11 | `a73fc3c` | Large mobile audit: ScrollToTop component, controlled carousel with arrows/autoscroll/dots, Hero scroll indicator resize + mobile layout, Commissions size+colour made required, Gallery scrollable filter chips, About/ArtistIntro/ArtworkDetail spacing + aspect ratio fixes, Cart/Checkout/Contact mobile gaps + ordering |
| 2026-05-11 | `dfbfd5c` | Carousel arrows repositioned to overlay image using `aspect-[3/4]` ghost layer; `overflow-x: hidden` on body to fix mobile horizontal scroll gap |
| 2026-05-11 | `5a1a1d1` | Carousel arrows: removed white box backgrounds, changed to plain white icons with drop-shadow, used `absolute` positioning for true symmetry |
| 2026-05-11 | `2a9bd6f` | Admin dashboard full mobile pass: tabs icon-only on mobile, compact list rows with inline price/badge, reduced padding, stacked form buttons |
| 2026-05-11 | `df2c4ab` | Hero image replaced with real image from Supabase storage (`Hero.jpg`) |
| 2026-05-11 | `6e3c2d2` | Hero image URL updated to `hero.png` (artist replaced file) |

---

## 5. Current State of the Codebase

### Fully Working
- All page routing and navigation
- Scroll-to-top on route change
- Cart: add, remove, update quantity, persist to localStorage
- Checkout: demo mode (simulated order confirmation)
- Commission enquiry form (posts to Supabase if configured)
- Contact form (posts to Supabase if configured)
- Newsletter signup (posts to Supabase if configured)
- Gallery filtering by category
- Artwork detail page with lightbox
- Related works section
- Mobile carousel with autoscroll
- Admin artwork CRUD (with Supabase)
- Full responsive layout across all pages
- Toast notifications

### Partially Complete
- **Checkout / Stripe** — frontend-only. `loadStripe()` is initialised but no server-side payment intent is created. A Supabase Edge Function or separate API route is needed to create `PaymentIntent` and return `client_secret`.
- **Admin authentication** — dashboard is publicly accessible at `/admin`. No login gate exists.
- **Instagram section** — renders a static 6-image placeholder grid. No Instagram API integration.
- **Content** — artist text is placeholder copy. Only the hero image has been replaced so far.

### Mocked / Fake
- All 8 artworks in `src/lib/mockData.ts` are placeholder data (picsum images, invented titles/descriptions/prices)
- Artist bio, statement, and philosophy text on About page
- Artist intro text on homepage
- Hero headline "Art that stays with you." and subtext
- Studio and process photos on About + Contact pages
- Artist intro photo

### Still Needs Implementation
- Stripe backend (Edge Function or API route) for real payment processing
- Admin authentication (Supabase Auth login page)
- Real artwork data in Supabase (replacing mock data)
- Real artist content (images, bio, statement, artwork descriptions)
- Instagram feed integration (or remove the section)
- Order management in admin dashboard
- Commission management in admin dashboard
- Subscriber list view in admin dashboard
- Email notifications on new commission/contact/order (e.g. Resend or Supabase email)

### Technical Debt
- `react-intersection-observer` and `react-image-zoom` are in `package.json` but unused
- `src/assets/hero.png` exists but is not used (hero uses Supabase URL)
- `react.svg` and `vite.svg` in assets are default scaffolding, unused
- `App.css` is largely empty
- Cart allows quantity > 1 for artworks that are unique originals (conceptually wrong for fine art)
- No 404 page — unmatched routes render blank

---

## 6. Current Branch + Git State

```
Branch:     claude/luxury-art-ecommerce-mvp-JqXx1
Remote:     origin/claude/luxury-art-ecommerce-mvp-JqXx1 (up to date)
Status:     Clean — nothing to commit
```

No uncommitted changes. No staged files. No merge/rebase in progress.

---

## 7. Architecture Deep Dive

### Frontend Architecture
Single-page React application. All routing is client-side via React Router v7. The app is bootstrapped in `main.tsx` → `App.tsx`. `App.tsx` contains:
- An `ErrorBoundary` class component (displays error on screen instead of blank)
- `BrowserRouter` wrapping everything
- `ScrollToTop` (fires on route change)
- `Routes` with 9 routes
- `Toaster` from react-hot-toast

### Data Flow

```
Supabase configured?
├── YES → useArtworks() fetches from Supabase → React state → components
└── NO  → useArtworks() returns mockData → React state → components

User action (Add to Cart)
└── Zustand cartStore.addItem() → localStorage persist → cart badge updates

User action (Submit form)
├── supabaseConfigured = true  → supabase.from('table').insert(data)
└── supabaseConfigured = false → setSubmitted(true) (demo mode, no DB write)
```

### State Management
Only the cart uses persistent global state (Zustand + localStorage). All other state is local `useState` within components. No React Query or global server state — data fetching happens in `useArtworks` hook with `useState` + `useEffect`.

### Supabase Client (`src/lib/supabase.ts`)
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as never;
```
Every component that uses `supabase` checks `supabaseConfigured` first. This is the critical pattern — do not remove it.

### Data Fetching (`src/hooks/useArtworks.ts`)
```typescript
// useArtworks(category?) — returns { artworks, loading }
// useArtwork(id) — returns { artwork, loading }
```
If Supabase is configured: queries `artworks` table with optional category filter, ordered by `created_at DESC`.  
If not: filters `mockArtworks` from `lib/mockData.ts`.

### Database Schema (Supabase)
5 tables, all with RLS:

| Table | Purpose | Public access |
|---|---|---|
| `artworks` | Artwork catalogue | SELECT only |
| `orders` | Purchase records | INSERT only |
| `commission_inquiries` | Commission form submissions | INSERT only |
| `newsletter_subscribers` | Email list | INSERT only |
| `contact_messages` | Contact form submissions | INSERT only |

Storage bucket `artwork-images` is public (read) — authenticated upload only.

### Authentication
- Supabase Auth is available but **not implemented** in the UI
- RLS policies grant `authenticated` role full CRUD on artworks/orders/commissions/subscribers
- The `/admin` route has no auth gate — it relies on obscurity only

### Deployment
- **Vercel** — static SPA hosting
- `vercel.json` rewrites all routes to `index.html` (required for client-side routing)
- Build command: `tsc -b && vite build` → outputs to `dist/`
- Environment variables set in Vercel dashboard (not `.env` file in production)

---

## 8. UI/UX System

### Design Tokens (Tailwind)

**Colors:**
```
art-charcoal: #2C2825  (primary text, dark elements)
art-warm:     #6B5E4E  (secondary text, warm accents)
art-muted:    #9B8E82  (muted text, labels)
art-light:    #C4B8AC  (dividers, subtle borders)
art-pale:     #EDE8E3  (very subtle borders, backgrounds)
art-white:    #FDFCFA  (off-white page background)

cream-50:  #FDFBF7
cream-100: #FAF6EE
cream-200: #F5EDD9
cream-300: #EDE0C4
```

**Typography:**
- Serif: Cormorant Garamond (headings, titles, editorial quotes) — loaded from Google Fonts
- Sans: Inter (body, labels, UI text) — loaded from Google Fonts

**Spacing:** Custom `max-w-8xl` (88rem) as page container max-width. Consistent `px-6 md:px-12 lg:px-20` horizontal padding.

### Component Patterns

**Button** (`src/components/ui/Button.tsx`):
- `variant`: `primary` (dark fill) | `secondary` (outline)
- `size`: `sm` | `md` | `lg`
- Always uppercase tracking-widest serif-adjacent feel

**FadeIn** (`src/components/ui/FadeIn.tsx`):
- Wraps any content, triggers opacity + translateY animation on scroll into view
- Props: `direction` (`up`|`left`|`right`), `delay` (seconds)
- Uses native `IntersectionObserver` (threshold 0.15, triggerOnce)

**Input/Textarea** (`src/components/ui/Input.tsx`):
- Underline-only border style (no box)
- Label floats above as tracking-widest uppercase text
- Consistent focus state

### Responsive Behaviour
- Mobile-first throughout
- Key breakpoints: `md` (768px) and `lg` (1024px)
- Navigation: hamburger below `md`
- Grids: single column → 2 col → 3 col
- Featured collection: carousel on mobile, grid on `md+`
- Sticky elements only apply from `lg` (avoids mobile viewport issues)
- Contact studio image: `hidden lg:block` (mobile shows just form + contact info)

### Animation System (Framer Motion)
- Page section entrances: `FadeIn` wrapper (scroll-triggered)
- Hero text: staggered `motion.p`/`motion.h1` with `initial/animate` delays
- Carousel: `AnimatePresence` with custom `x` direction variants + `popLayout` mode
- Cart item add/remove: `AnimatePresence` with height animation
- Lightbox: opacity fade with scale
- Navbar mobile menu: slide-in from top with `AnimatePresence`
- Scroll indicator: infinite `y` bounce loop

### Accessibility
- All images have `alt` attributes
- Form inputs have labels
- Buttons have `aria-label` where icon-only
- Focus outlines preserved (not suppressed globally)
- Semantic HTML (`<main>`, `<nav>`, `<footer>`, `<section>`, `<h1>`-`<h3>`)

---

## 9. Known Bugs and Risks

### Bugs
| Issue | Severity | Location |
|---|---|---|
| Cart allows quantity > 1 for unique original artworks | Medium | `CartPage.tsx` — no max quantity of 1 enforced |
| No 404 page — unmatched routes render blank layout | Low | `App.tsx` — no catch-all route |
| `state` field collected in checkout form but never used | Low | `CheckoutPage.tsx` |
| `commission_inquiries` schema has `budget NOT NULL DEFAULT ''` but UI removed budget field | Low | `supabase/schema.sql` |

### Security Risks
| Risk | Severity | Detail |
|---|---|---|
| Admin dashboard has no authentication | **Critical** | `/admin` is publicly accessible. Anyone can add/edit/delete artworks. Needs Supabase Auth login gate before launch. |
| Supabase anon key is exposed in client bundle | Medium | Expected for Supabase architecture, mitigated by RLS policies. Ensure RLS is enabled on all tables. |
| No CSRF protection on forms | Low | Supabase JS handles this internally for its own endpoints |

### Performance Concerns
- Bundle is ~641KB minified (warned by Vite). No code splitting. Add `React.lazy()` for page-level splits.
- No image optimisation — all images served as-is from Supabase storage. Consider using Supabase's image transformation API or Cloudinary.
- `mockData.ts` loads all 8 artworks into memory even in production with Supabase configured

### Missing Validations
- Email format validation on commission/contact forms relies on HTML `type="email"` only — no JS validation
- No max file size or type checking for admin image URL input
- Checkout form: no phone number validation, no postcode format validation

### Edge Cases
- If Supabase `artworks` table is empty, gallery shows "No works found" — correct behaviour
- If an artwork ID in the URL doesn't exist, shows "Artwork not found" — correct
- Cart persists between sessions — if an artwork is sold after being carted, no staleness check exists
- Duplicate newsletter subscription: handled via Supabase unique constraint (error code `23505`) — silently succeeds

---

## 10. Pending Tasks

### Immediate (Before Launch)
1. **Add admin authentication** — Supabase Auth login page at `/admin/login`, redirect unauthenticated users
2. **Replace all placeholder content** — artist name, bio, statement, artworks, all images
3. **Remove unused packages** — `react-intersection-observer`, `react-image-zoom`, `react-masonry-css`

### Short-Term
4. **Stripe backend** — Supabase Edge Function to create `PaymentIntent`, wire to checkout
5. **404 page** — add catch-all route in `App.tsx`
6. **Limit cart quantity to 1** for original artworks (fine art isn't sold in multiples)
7. **Email notifications** — send artist an email on new commission/contact/order (Resend or Supabase + sendgrid)
8. **Real artwork data** — populate Supabase `artworks` table via admin dashboard

### Long-Term
9. **Instagram integration** — connect to Instagram Basic Display API or use a feed embed service
10. **Image optimisation** — Supabase image transformation (`?width=800&quality=80`) on all artwork images
11. **Code splitting** — `React.lazy()` on all page components to reduce initial bundle size
12. **SEO** — `react-helmet-async` for per-page `<title>` and meta tags
13. **Analytics** — Vercel Analytics or Plausible
14. **Wishlist** — save artworks for later (Zustand + localStorage, similar to cart)
15. **Artist updates blog** — simple news/journal section

---

## 11. Developer Workflow

### Running Locally
```bash
cd /home/user/thefinearc
npm install
# Create .env.local with Supabase vars (optional — works without them in demo mode)
npm run dev        # Starts Vite dev server (defaults to port 5173)
```

### Build
```bash
npm run build      # tsc -b && vite build → dist/
npm run preview    # Serve dist/ locally to test production build
```

### Type Check
```bash
npx tsc --noEmit   # Type check without building
```

### Lint
```bash
npm run lint       # ESLint across all src files
```

### Deploy
Push to any branch connected to Vercel — auto-deploys on push.  
Or manually: `vercel --prod` from project root (requires Vercel CLI).

### Database Setup (first time)
1. Create a Supabase project
2. Run `supabase/schema.sql` in the Supabase SQL editor
3. Add env vars to Vercel dashboard
4. The `artwork-images` storage bucket is created by the schema SQL

---

## 12. Important Context

### Critical Patterns — Do Not Break
1. **`supabaseConfigured` guard** — always check before calling `supabase.from(...)`. If you add any new Supabase usage, follow the existing pattern.
2. **`import type { ... }`** — TypeScript `verbatimModuleSyntax` is enabled. Type-only imports must use `import type`. Failing this breaks the build.
3. **`overflow-x: hidden` on body** — required to prevent Framer Motion slide animations from creating horizontal scroll on mobile. Do not remove.
4. **`aspect-[3/4]` ghost layer for carousel arrows** — the arrow container uses the same aspect ratio as the artwork image to position arrows exactly over the image. If the ArtworkCard image aspect ratio changes, this must change too.

### Design Decisions
- **No Instagram icon in lucide-react v1.14** → custom SVG in `Icons.tsx`. Do not try to import `Instagram` from `lucide-react`.
- **No `useScroll`/`useTransform`** from Framer Motion v12 — these were removed from Hero to avoid a breaking change crash. If parallax is needed, import from `motion/react` not `framer-motion`.
- **`lg:sticky` not `sticky`** — sticky sidebars only on large screens. On mobile, `position: sticky` inside flex/grid columns causes layout bugs.
- **Carousel `mode="popLayout"`** — required in AnimatePresence to prevent the exiting slide from collapsing the container height during animation.

### Rejected Approaches
- **`react-intersection-observer`** — removed due to v10 API incompatibility. Native `IntersectionObserver` used instead.
- **`React.lazy()` + `Suspense`** — removed because it was causing blank page renders in production. Can be reintroduced carefully with proper error boundaries.
- **CSS snap-scroll carousel** — first implementation; replaced with controlled state carousel for better UX and autoscroll support.
- **`createClient('', '')`** — calling Supabase client with empty strings throws at module load time, crashing the entire app. The `supabaseConfigured` guard is the fix.

### Conventions
- Page components: `export function PageNamePage()` (no default exports)
- Sections: `export function SectionName()` 
- All CSS via Tailwind utility classes — no CSS modules, no styled-components
- No comments in code unless the WHY is non-obvious
- Framer Motion animations use `ease: [0.22, 1, 0.36, 1]` (custom cubic bezier) for elegant deceleration

### Hidden Gotchas
- `cream-50` is used in some components but verify it exists in `tailwind.config.js` — it does, but the palette only goes 50–500.
- The `Art` in "The Fine Arc" is intentional — it is not a typo of "Fine Art". The brand name is "The Fine Arc".
- `formatPrice()` formats in **GBP (£)** — `new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })`. If the artist wants USD, this needs changing in `src/utils/format.ts`.
- The admin link in the footer is intentionally invisible (`text-white/20`) — it is not broken.

---

## 13. Session Memory Export

For an AI agent picking this up:

**Project:** Luxury fine art e-commerce site for a single artist. React 19 + TypeScript + Vite 8 + Tailwind 3 + Framer Motion 12 + Supabase + Stripe (stub). Hosted on Vercel.

**Branch to work on:** `claude/luxury-art-ecommerce-mvp-JqXx1`  
**Push target:** `origin/claude/luxury-art-ecommerce-mvp-JqXx1`

**Current priorities:**
1. Artist is replacing placeholder images one by one — they upload to Supabase storage bucket `artwork-images` at `https://mvmuqynhqfzwvrfcwcwf.supabase.co/storage/v1/object/public/artwork-images/` and provide URLs
2. Admin auth needs adding before site goes live
3. Stripe backend not yet implemented

**Active patterns to follow:**
```typescript
// Always guard Supabase calls
if (supabaseConfigured) { await supabase.from('table').insert(...) }

// Always use import type for types
import type { Artwork } from '../types';

// Currency is GBP — formatPrice() in src/utils/format.ts

// Tailwind breakpoints used: md (768px) and lg (1024px)
// Page padding: px-6 md:px-12 lg:px-20
// Max width container: max-w-8xl (88rem)
```

**Files most likely to change next:**
- `src/lib/mockData.ts` — when replacing artwork data
- `src/components/sections/Hero.tsx` — hero image already replaced
- `src/components/sections/ArtistIntro.tsx` — artist photo + bio
- `src/pages/AboutPage.tsx` — artist statement + photos
- `src/pages/AdminPage.tsx` — when adding auth gate

**Do not change:**
- `src/lib/supabase.ts` — the `supabaseConfigured` guard is critical
- `src/index.css` — `overflow-x: hidden` on body is required
- `src/components/ui/FadeIn.tsx` — uses native IntersectionObserver intentionally
- The `aspect-[3/4]` ghost layer in `FeaturedCollection.tsx` carousel arrows

**Design system quick reference:**
- Primary font: `font-serif` (Cormorant Garamond)
- UI font: `font-sans` (Inter)  
- Labels: `font-sans text-[10px] tracking-widest uppercase text-art-muted`
- Body text: `font-sans text-sm text-art-warm leading-relaxed`
- Headings: `font-serif text-4xl md:text-5xl font-light text-art-charcoal`
- Primary button: `bg-art-charcoal text-white`
- Accent hover: `text-art-warm`

---

## 14. Final Evaluation

### Overall Maturity: **7/10 — Production-near MVP**
The site is well-built, visually polished, and fully responsive. It works end-to-end in demo mode. The main gaps before real launch are admin authentication and Stripe backend.

### Biggest Strengths
1. **Visual quality** — the design system is cohesive, luxury, and editorial. Tailwind tokens are well-chosen and consistent throughout.
2. **Resilient architecture** — the `supabaseConfigured` guard means the app never crashes from missing env vars. Demo mode works perfectly.
3. **Mobile-first** — every page has been audited and adjusted for mobile, including the admin dashboard.
4. **Clean component structure** — clear separation between layout, sections, UI primitives, and pages.
5. **Framer Motion usage** — animations are tasteful and performant (no layout thrashing, proper `AnimatePresence` usage).

### Biggest Weaknesses
1. **No admin auth** — critical security gap. The admin can delete artworks from any browser.
2. **No Stripe backend** — checkout cannot actually process payments. Needs a server-side component.
3. **Bundle size** — 641KB uncompressed. No code splitting applied. Will impact mobile load time on slow connections.
4. **Content is all placeholder** — the site cannot launch until artist replaces all copy and images.
5. **No SEO** — no dynamic `<title>` tags, no Open Graph, no sitemap. Every page has the same generic title.

### Highest-Priority Next Improvements
1. Add Supabase Auth login gate to `/admin`
2. Replace all placeholder content (artist is actively doing this)
3. Create Supabase Edge Function for Stripe payment intent
4. Add `React.lazy()` code splitting on all page routes
5. Add `react-helmet-async` for per-page SEO titles/meta
