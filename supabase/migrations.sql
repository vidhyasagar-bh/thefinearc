-- ================================================
-- The Fine Arc — Migration: run in Supabase SQL Editor
-- ================================================

-- 1. Remove 'reviewed' from commission status (migrate existing rows first)
UPDATE public.commission_inquiries SET status = 'pending' WHERE status = 'reviewed';
ALTER TABLE public.commission_inquiries DROP CONSTRAINT IF EXISTS commission_inquiries_status_check;
ALTER TABLE public.commission_inquiries ADD CONSTRAINT commission_inquiries_status_check
  CHECK (status IN ('pending', 'accepted', 'declined'));

-- 2. Add fulfillment tracking to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'processing';
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_fulfillment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_fulfillment_status_check
  CHECK (fulfillment_status IN ('processing', 'confirmed', 'preparing', 'shipped', 'delivered'));

-- 3. Allow authenticated users to update orders and commissions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Authenticated can update orders'
  ) THEN
    CREATE POLICY "Authenticated can update orders" ON public.orders
      FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'commission_inquiries' AND policyname = 'Authenticated can update commission inquiries'
  ) THEN
    CREATE POLICY "Authenticated can update commission inquiries" ON public.commission_inquiries
      FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- 4. Drop newsletter subscribers table (optional — uncomment to remove)
-- DROP TABLE IF EXISTS public.newsletter_subscribers;

-- 5. Video support for artworks (admin uploader writes video_url)
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS video_url text;

-- 6. Etsy listing data: inventory, variations, tags, video, extra metadata
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS quantity integer;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS variations jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS etsy_url text;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS etsy_listing_id bigint;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS etsy_data jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS artworks_etsy_listing_id_key ON public.artworks (etsy_listing_id) WHERE etsy_listing_id IS NOT NULL;

-- 7. Stripe: store Checkout session + tax breakdown on orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal numeric(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_amount numeric(10,2);
CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_session_key ON public.orders (stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
-- Orders are now created server-side by the Stripe webhook (service role). Remove public inserts:
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;

-- 8. Free-text sections: allow any category slug (mandalas, hearts, ornaments, ...)
ALTER TABLE public.artworks DROP CONSTRAINT IF EXISTS artworks_category_check;

-- 9. Etsy OAuth tokens (read by the server with the service role only — no policies on purpose)
CREATE TABLE IF NOT EXISTS public.etsy_auth (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  client_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.etsy_auth ENABLE ROW LEVEL SECURITY;

-- 10. LOCK DOWN THE DATABASE.
-- Run this ONLY after the admin works through the server (ADMIN_PASSWORD + SUPABASE_SERVICE_ROLE_KEY set in Vercel).
-- From now on the public browser key can only: read artworks, and submit the commission, contact and newsletter forms.
-- Everything else (artwork edits, orders, enquiries, uploads) goes through the server with the service role.
DO $$
DECLARE
  r record;
  t text;
BEGIN
  -- Remove every existing policy on these tables (including any loosened by hand), then recreate the safe ones
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('artworks', 'orders', 'commission_inquiries', 'contact_messages', 'newsletter_subscribers', 'etsy_auth')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['artworks', 'orders', 'commission_inquiries', 'contact_messages', 'newsletter_subscribers', 'etsy_auth']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;

  CREATE POLICY "Public can read artworks" ON public.artworks FOR SELECT USING (true);
  CREATE POLICY "Public can submit commission inquiries" ON public.commission_inquiries FOR INSERT WITH CHECK (true);
  CREATE POLICY "Public can submit contact messages" ON public.contact_messages FOR INSERT WITH CHECK (true);
  IF to_regclass('public.newsletter_subscribers') IS NOT NULL THEN
    CREATE POLICY "Public can subscribe to the newsletter" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
  END IF;

  -- Storage: nobody can write with the public key; the two artwork buckets stay publicly readable
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', r.policyname);
  END LOOP;
  DROP POLICY IF EXISTS "Public can view artwork media" ON storage.objects;
  CREATE POLICY "Public can view artwork media" ON storage.objects
    FOR SELECT USING (bucket_id IN ('artwork-images', 'artwork-videos'));
END $$;

-- 11. Shipping estimates: package size per artwork, and shipping details on orders
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS weight_oz numeric;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS package_length numeric;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS package_width numeric;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS package_height numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_amount numeric(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_service text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_note text;

-- 12. Sales and coupon codes
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'amount')),
  discount_value numeric(10,2) NOT NULL CHECK (discount_value > 0),
  applies_to text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'sections', 'items')),
  sections text[] NOT NULL DEFAULT '{}',
  artwork_ids uuid[] NOT NULL DEFAULT '{}',
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read live sales" ON public.sales;
-- Visitors can only see sales that are running right now (so the site can show sale prices)
CREATE POLICY "Public can read live sales" ON public.sales FOR SELECT
  USING (active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now()));

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'amount')),
  discount_value numeric(10,2) NOT NULL CHECK (discount_value > 0),
  applies_to text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'sections', 'items')),
  sections text[] NOT NULL DEFAULT '{}',
  artwork_ids uuid[] NOT NULL DEFAULT '{}',
  min_subtotal numeric(10,2) NOT NULL DEFAULT 0,
  exclude_sale_items boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  max_redemptions integer CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  redemptions integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_key ON public.coupons (upper(code));
-- Coupon codes are private: no public policies. Only the server (service role) can read them.
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2);

-- 13. One size entry per artwork (length x width x depth + unit) and Etsy sync tracking
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS dim_length numeric;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS dim_width numeric;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS dim_depth numeric;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS dim_unit text NOT NULL DEFAULT 'in';
ALTER TABLE public.artworks DROP CONSTRAINT IF EXISTS artworks_dim_unit_check;
ALTER TABLE public.artworks ADD CONSTRAINT artworks_dim_unit_check CHECK (dim_unit IN ('in', 'cm'));
-- Which listings came from Etsy: etsy_listing_id (already saved on import) marks them. These two control refreshing.
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS etsy_sync boolean NOT NULL DEFAULT true;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS etsy_synced_at timestamptz;

-- Fill the new size columns from sizes already typed as text, e.g. "80 × 100 cm" or "12 x 12 x 1 in"
UPDATE public.artworks a SET
  dim_length = (s.m)[1]::numeric,
  dim_width  = (s.m)[2]::numeric,
  dim_depth  = (s.m)[3]::numeric,
  dim_unit   = CASE WHEN lower(coalesce((s.m)[4], '')) LIKE 'cm%' THEN 'cm' ELSE 'in' END
FROM (
  SELECT id, regexp_match(
    dimensions,
    '(\d+(?:\.\d+)?)\s*(?:"|”|in(?:ch(?:es)?)?|cm)?\s*(?:x|×|by)\s*(\d+(?:\.\d+)?)(?:\s*(?:"|”|in(?:ch(?:es)?)?|cm)?\s*(?:x|×|by)\s*(\d+(?:\.\d+)?))?\s*(cm|in(?:ch(?:es)?)?|"|”)?',
    'i'
  ) AS m
  FROM public.artworks
  WHERE dim_length IS NULL AND dimensions IS NOT NULL
) s
WHERE a.id = s.id AND s.m IS NOT NULL;
-- The old package_length/width/height columns are no longer used: the shipping box is worked out from the size above.
