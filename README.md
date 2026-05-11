# The Fine Arc — Luxury Art E-Commerce

A premium, gallery-inspired art e-commerce platform built with React, TypeScript, Tailwind CSS, Framer Motion, Supabase, and Stripe.

## Getting Started

```bash
npm install
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

Without environment variables, the site runs in **demo mode** with mock data — fully functional for development and preview.

## Project Structure

```
src/
├── components/
│   ├── ui/           # FadeIn, Button, Input, Icons, LoadingSpinner
│   ├── layout/       # Navbar, Footer, Layout
│   ├── sections/     # Hero, FeaturedCollection, ArtistIntro, Newsletter, Instagram
│   └── artwork/      # ArtworkCard, ArtworkGrid
├── pages/            # All 9 pages
├── hooks/            # useArtworks, useArtwork
├── lib/              # supabase.ts, stripe.ts, mockData.ts
├── store/            # cartStore (Zustand + localStorage persistence)
├── types/            # TypeScript interfaces
└── utils/            # format.ts helpers
supabase/
└── schema.sql        # Full database schema with RLS policies
```

## Supabase Setup

1. Create a new Supabase project at supabase.com
2. Run `supabase/schema.sql` in the SQL Editor
3. Set your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`

## Stripe Setup

1. Add your `VITE_STRIPE_PUBLISHABLE_KEY`
2. Implement a backend endpoint (Vercel serverless function or Supabase Edge Function) to create PaymentIntents
3. The checkout form is pre-wired and ready to connect to your backend

## Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

Add environment variables in the Vercel dashboard under Project > Settings > Environment Variables.

The `vercel.json` handles client-side routing rewrites automatically.

## Pages

| Route | Page |
|-------|------|
| `/` | Home — hero, featured collection, artist intro, newsletter |
| `/gallery` | Gallery with category filtering and masonry grid |
| `/artwork/:id` | Artwork detail with lightbox, story, specs, add to cart |
| `/about` | Artist statement, philosophy, process imagery |
| `/commissions` | Commission inquiry form stored in Supabase |
| `/contact` | Contact form stored in Supabase |
| `/cart` | Shopping cart with quantity controls |
| `/checkout` | Stripe-ready checkout with order confirmation |
| `/admin` | Admin dashboard — manage artworks, view orders and inquiries |

## Design System

- **Typography:** Cormorant Garamond (headings) + Inter (body)
- **Colors:** warm whites, cream, charcoal, muted earth tones
- **Motion:** Framer Motion — slow, elegant fade/slide reveals
- **Spacing:** generous whitespace, editorial composition
