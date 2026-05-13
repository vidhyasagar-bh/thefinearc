-- ================================================
-- The Fine Arc — Supabase Database Schema
-- ================================================

-- Artworks
create table if not exists public.artworks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null default '',
  story text,
  price numeric(10,2) not null,
  dimensions text not null default '',
  materials text not null default '',
  category text not null check (category in ('painting','drawing','print','photography','mixed-media','sculpture','commission')),
  images text[] not null default '{}',
  availability text not null default 'available' check (availability in ('available','sold','reserved')),
  framing text,
  year int,
  created_at timestamptz default now() not null,
  updated_at timestamptz
);

alter table public.artworks enable row level security;

create policy "Public can read artworks" on public.artworks
  for select using (true);

create policy "Authenticated can manage artworks" on public.artworks
  for all using (auth.role() = 'authenticated');

-- Orders
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  customer_name text not null,
  customer_email text not null,
  customer_address jsonb not null default '{}',
  items jsonb not null default '[]',
  total numeric(10,2) not null,
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  fulfillment_status text not null default 'processing' check (fulfillment_status in ('processing','confirmed','preparing','shipped','delivered')),
  stripe_payment_intent_id text,
  created_at timestamptz default now() not null
);

alter table public.orders enable row level security;

create policy "Authenticated can view orders" on public.orders
  for select using (auth.role() = 'authenticated');

create policy "Authenticated can update orders" on public.orders
  for update using (auth.role() = 'authenticated');

create policy "Public can insert orders" on public.orders
  for insert with check (true);

-- Commission inquiries
create table if not exists public.commission_inquiries (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  phone text,
  project_description text not null,
  budget text not null default '',
  size_preferences text,
  style_preferences text,
  color_preferences text,
  reference_image_url text,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz default now() not null
);

alter table public.commission_inquiries enable row level security;

create policy "Public can insert commission inquiries" on public.commission_inquiries
  for insert with check (true);

create policy "Authenticated can view commission inquiries" on public.commission_inquiries
  for select using (auth.role() = 'authenticated');

create policy "Authenticated can update commission inquiries" on public.commission_inquiries
  for update using (auth.role() = 'authenticated');

-- Contact messages
create table if not exists public.contact_messages (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  subject text,
  message text not null,
  created_at timestamptz default now() not null
);

alter table public.contact_messages enable row level security;

create policy "Public can insert contact messages" on public.contact_messages
  for insert with check (true);

create policy "Authenticated can view contact messages" on public.contact_messages
  for select using (auth.role() = 'authenticated');

-- Storage bucket for artwork images
insert into storage.buckets (id, name, public) values ('artwork-images', 'artwork-images', true)
  on conflict do nothing;

create policy "Public can view artwork images" on storage.objects
  for select using (bucket_id = 'artwork-images');

create policy "Authenticated can upload artwork images" on storage.objects
  for insert with check (bucket_id = 'artwork-images' and auth.role() = 'authenticated');
