-- ============================================================
-- HotelBridge CRM — Supabase schema (Phase 2, matches current app)
-- Paste into: Supabase → SQL Editor → New query → Run.
-- Safe to re-run (idempotent: create if not exists / add column if not exists).
--
-- Auth: handled by Supabase Auth (auth.users). You create your own
-- login in the dashboard (Authentication → Add user) — no password
-- ever lives here or in the repo.
--
-- Access model:
--   • leads  → anyone may INSERT (public contact form); only
--              signed-in users may read/update/delete.
--   • everything else → signed-in users only (internal CRM).
-- ============================================================

-- ---------- HOTELS ----------
create table if not exists public.hotels (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  brand          text,                 -- Campanile, Kyriad, Golden Tulip …
  city           text,
  country        text,
  region         text,
  address        text,
  postal_code    text,
  contact_person text,
  email          text,
  manager_email  text,
  phone          text,
  website        text,
  rooms          integer,
  star_category  integer check (star_category between 0 and 5),  -- 0 = "No star"
  restaurant     boolean default false,
  contract_type  text,                 -- 'commission' | 'net'
  commission     numeric,
  vat            text,                  -- hotel VAT / GSTIN (shown on invoices)
  rates_low      numeric,
  rates_mid      numeric,
  rates_high     numeric,
  blackout_dates text[] default '{}',
  status         text default 'active',-- 'active' | 'inactive'
  source         text,                 -- 'manual' | 'France' | 'Europe' | import name
  notes          text default '',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
-- additive columns for projects created on the old schema
alter table public.hotels add column if not exists brand         text;
alter table public.hotels add column if not exists region        text;
alter table public.hotels add column if not exists address       text;
alter table public.hotels add column if not exists postal_code   text;
alter table public.hotels add column if not exists manager_email text;
alter table public.hotels add column if not exists website       text;
alter table public.hotels add column if not exists restaurant    boolean default false;
alter table public.hotels add column if not exists vat           text;
alter table public.hotels add column if not exists source        text;

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
  commission_percent numeric,          -- per-deal override (else hotel default)
  status         text default 'inquiry',-- inquiry | quoted | confirmed | cancelled
  notes          text default '',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
alter table public.bookings add column if not exists commission_percent numeric;

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

-- ---------- REQUIREMENTS (RFQ) ----------
create table if not exists public.requirements (
  id             uuid primary key default gen_random_uuid(),
  ref            text,                 -- RFQ-YYYY-####
  group_name     text,
  operator_id    uuid references public.operators(id) on delete set null,
  operator_name  text,
  destination    text,
  city           text,
  check_in       date,
  check_out      date,
  nights         integer,
  rooms          integer,
  pax            integer,
  budget         numeric,
  meal_plan      text,
  star           text,
  status         text default 'new',   -- new | sourcing | quoted | won | lost
  offers         jsonb default '[]',   -- [{hotelId,hotelName,rate,status,notes}]
  raw            text,                 -- original imported line
  notes          text default '',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ---------- INVOICES (commission invoices) ----------
create table if not exists public.invoices (
  id             uuid primary key default gen_random_uuid(),
  number         text unique not null, -- HB-COMM-YYYY-###
  booking_id     uuid references public.bookings(id) on delete set null,
  status         text default 'draft', -- draft | sent | paid | overdue
  currency       text default '€',
  issue_date     date,
  due_date       date,
  terms          text default 'receipt', -- receipt | net15 | net30 | custom
  show_operator  boolean default false,
  tax_percent    numeric default 0,
  bill_to        jsonb default '{}',   -- {name,company,email,address,vat,attn}
  refs           jsonb default '{}',   -- {bookingFile,voucher,hotelInvoiceRef,hotelInvoiceDate}
  items          jsonb default '[]',   -- [{description,qty,rate}]
  meta           jsonb,                -- booking summary + commissionable/grossValue/commissionPct
  subtotal       numeric default 0,
  tax            numeric default 0,
  total          numeric default 0,
  amount_paid    numeric default 0,
  notes          text default '',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
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

-- ---------- SETTINGS (bank details, company profile) ----------
-- Single-row-per-key store, e.g. id='bank' → your HDFC details.
-- Keeps sensitive bank data out of the repo; lives in your DB behind auth.
create table if not exists public.settings (
  id         text primary key,          -- 'bank' | 'company'
  data       jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- ============================================================
-- Sequential commission-invoice numbers — HB-COMM-YYYY-###
-- Atomic (safe under concurrency), resets each calendar year.
-- ============================================================
create table if not exists public.invoice_counters (
  year int primary key,
  seq  int not null default 0
);

create or replace function public.next_commission_number()
returns text
language plpgsql
security definer
as $$
declare y int := extract(year from now())::int; s int;
begin
  insert into public.invoice_counters(year, seq) values (y, 1)
    on conflict (year) do update set seq = public.invoice_counters.seq + 1
    returning seq into s;
  return 'HB-COMM-' || y::text || '-' || lpad(s::text, 3, '0');
end;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.hotels             enable row level security;
alter table public.operators          enable row level security;
alter table public.bookings           enable row level security;
alter table public.commissions        enable row level security;
alter table public.requirements       enable row level security;
alter table public.invoices           enable row level security;
alter table public.leads              enable row level security;
alter table public.tasks              enable row level security;
alter table public.settings           enable row level security;
alter table public.invoice_counters   enable row level security;

-- Internal CRM tables: signed-in users only, full access.
do $$
declare t text;
begin
  foreach t in array array[
    'hotels','operators','bookings','commissions','requirements',
    'invoices','tasks','settings','invoice_counters'
  ]
  loop
    execute format('drop policy if exists "auth full access" on public.%I;', t);
    execute format(
      'create policy "auth full access" on public.%I
         for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- Leads: anyone (anon) may submit; only signed-in users may read/manage.
drop policy if exists "public can submit leads" on public.leads;
create policy "public can submit leads"
  on public.leads for insert to anon, authenticated with check (true);
drop policy if exists "auth can read leads" on public.leads;
create policy "auth can read leads"
  on public.leads for select to authenticated using (true);
drop policy if exists "auth can update leads" on public.leads;
create policy "auth can update leads"
  on public.leads for update to authenticated using (true) with check (true);
drop policy if exists "auth can delete leads" on public.leads;
create policy "auth can delete leads"
  on public.leads for delete to authenticated using (true);

-- Helpful indexes
create index if not exists idx_hotels_city        on public.hotels(city);
create index if not exists idx_hotels_country      on public.hotels(country);
create index if not exists idx_bookings_hotel      on public.bookings(hotel_id);
create index if not exists idx_bookings_operator   on public.bookings(operator_id);
create index if not exists idx_commissions_booking on public.commissions(booking_id);
create index if not exists idx_invoices_number     on public.invoices(number);
create index if not exists idx_requirements_status on public.requirements(status);
create index if not exists idx_leads_created       on public.leads(created_at desc);
create index if not exists idx_tasks_due           on public.tasks(due_date);

-- Done. Next:
--   1) Authentication → Users → Add user  (email admin@hotelbridge.co + your password)
--   2) Project Settings → API → send Ronak the Project URL + anon public key
