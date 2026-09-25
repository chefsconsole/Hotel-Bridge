-- ============================================================
-- HotelBridge CRM — Supabase schema (Phase 1)
-- Paste into: Supabase → SQL Editor → New query → Run
--
-- Auth: handled by Supabase Auth (auth.users). You create your
-- own login in the dashboard (Authentication → Add user) — no
-- password ever lives here or in the repo.
--
-- Access model:
--   • leads  → anyone can INSERT (public contact form), only
--              signed-in users can read/update/delete.
--   • everything else → signed-in users only (internal CRM).
-- ============================================================

-- ---------- HOTELS ----------
create table if not exists public.hotels (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  city           text,
  country        text,
  contact_person text,
  email          text,
  phone          text,
  rooms          integer,
  star_category  integer check (star_category between 1 and 5),
  contract_type  text,                 -- 'commission' | 'net'
  commission     numeric,
  rates_low      numeric,
  rates_mid      numeric,
  rates_high     numeric,
  blackout_dates text[] default '{}',
  status         text default 'active',-- 'active' | 'inactive'
  notes          text default '',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ---------- OPERATORS / DMCs ----------
create table if not exists public.operators (
  id                 uuid primary key default gen_random_uuid(),
  company_name       text not null,
  contact_person     text,
  country            text,
  type               text,             -- 'DMC' | 'operator' | 'agent'
  email              text,
  phone              text,
  business_potential text,             -- 'high' | 'medium' | 'low'
  notes              text default '',
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- ---------- BOOKINGS ----------
create table if not exists public.bookings (
  id             uuid primary key default gen_random_uuid(),
  group_name     text not null,
  operator_id    uuid references public.operators(id) on delete set null,
  operator_name  text,
  destination    text,
  hotel_id       uuid references public.hotels(id) on delete set null,
  hotel_name     text,
  check_in       date,
  check_out      date,
  nights         integer,
  rooms          integer,
  rate_per_room  numeric,
  total_revenue  numeric,              -- rooms * nights * rate_per_room
  status         text default 'inquiry',-- inquiry | quoted | confirmed | cancelled
  notes          text default '',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ---------- COMMISSIONS ----------
create table if not exists public.commissions (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid references public.bookings(id) on delete cascade,
  group_name          text,
  total_booking_value numeric,
  margin_per_room     numeric,
  total_margin        numeric,
  commission_percent  numeric,
  commission_amount   numeric,
  payment_status      text default 'pending', -- pending | received
  payment_due_date    date,
  paid_date           date,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ---------- LEADS (public contact form) ----------
create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  email      text,
  company    text,
  phone      text,
  reason     text,
  message    text,
  source     text default 'contact-form',
  status     text default 'new',        -- new | contacted | qualified | closed | lost
  starred    boolean default false,
  notes      text default '',
  created_at timestamptz default now()
);

-- ---------- TASKS (follow-ups) ----------
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  related_to   text default '',
  priority     text default 'medium',   -- low | medium | high
  due_date     date,
  completed    boolean default false,
  completed_at timestamptz,
  created_at   timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.hotels      enable row level security;
alter table public.operators   enable row level security;
alter table public.bookings    enable row level security;
alter table public.commissions enable row level security;
alter table public.leads       enable row level security;
alter table public.tasks       enable row level security;

-- Internal CRM tables: signed-in users only, full access.
do $$
declare t text;
begin
  foreach t in array array['hotels','operators','bookings','commissions','tasks']
  loop
    execute format(
      'create policy "auth full access" on public.%I
         for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- Leads: anyone (anon) may submit; only signed-in users may read/manage.
create policy "public can submit leads"
  on public.leads for insert to anon, authenticated with check (true);

create policy "auth can read leads"
  on public.leads for select to authenticated using (true);

create policy "auth can update leads"
  on public.leads for update to authenticated using (true) with check (true);

create policy "auth can delete leads"
  on public.leads for delete to authenticated using (true);

-- Helpful indexes
create index if not exists idx_bookings_hotel    on public.bookings(hotel_id);
create index if not exists idx_bookings_operator on public.bookings(operator_id);
create index if not exists idx_commissions_booking on public.commissions(booking_id);
create index if not exists idx_leads_created     on public.leads(created_at desc);
create index if not exists idx_tasks_due         on public.tasks(due_date);

-- Done. Next: Authentication → Add user (create your login),
-- then send Ronak the Project URL + anon key to wire the frontend.
