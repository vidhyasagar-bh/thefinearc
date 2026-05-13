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
