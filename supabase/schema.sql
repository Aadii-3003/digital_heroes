-- =====================================================================
-- Digital Heroes — database schema (run once in Supabase SQL editor)
-- =====================================================================
create extension if not exists "pgcrypto";

-- ---------- Charities ----------
create table if not exists public.charities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  category text,
  tagline text,
  description text,
  image_url text,
  featured boolean not null default false,
  active boolean not null default true,
  events jsonb not null default '[]'::jsonb,   -- [{title,date,location}]
  created_at timestamptz not null default now()
);

-- ---------- Profiles (1:1 with auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text default '',
  role text not null default 'subscriber' check (role in ('subscriber','admin')),
  charity_id uuid references public.charities(id) on delete set null,
  charity_percent int not null default 10 check (charity_percent between 10 and 50),
  plan text check (plan in ('monthly','yearly')),
  subscription_status text not null default 'none' check (subscription_status in ('none','active','cancelled','lapsed')),
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);
create index if not exists profiles_status_idx on public.profiles(subscription_status);

-- ---------- Scores (rolling 5, one per date) ----------
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score int not null check (score between 1 and 45),
  played_on date not null,
  created_at timestamptz not null default now(),
  unique (user_id, played_on)
);
create index if not exists scores_user_idx on public.scores(user_id, played_on desc);

-- Keep only the latest 5 scores per user (oldest date is dropped automatically)
create or replace function public.enforce_latest_five() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.scores
  where id in (
    select id from public.scores
    where user_id = new.user_id
    order by played_on desc, created_at desc
    offset 5
  );
  return null;
end $$;
drop trigger if exists trg_latest_five on public.scores;
create trigger trg_latest_five after insert or update of played_on on public.scores
  for each row execute function public.enforce_latest_five();

-- ---------- Draws ----------
create table if not exists public.draws (
  id uuid primary key default gen_random_uuid(),
  draw_month date not null unique,                 -- always the 1st of the month
  mode text not null check (mode in ('random','algorithmic')),
  status text not null default 'simulated' check (status in ('simulated','published')),
  winning_numbers int[] not null,
  subscriber_count int not null default 0,
  participant_count int not null default 0,
  pool_total numeric(12,2) not null default 0,
  tier5_pool numeric(12,2) not null default 0,
  tier4_pool numeric(12,2) not null default 0,
  tier3_pool numeric(12,2) not null default 0,
  jackpot_carry_in numeric(12,2) not null default 0,
  jackpot_carry_out numeric(12,2) not null default 0,
  preview jsonb not null default '[]'::jsonb,      -- simulation output
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- Snapshot of who took part in a published draw
create table if not exists public.draw_entries (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scores int[] not null,
  match_count int not null default 0,
  unique (draw_id, user_id)
);

-- ---------- Winners ----------
create table if not exists public.winners (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_count int not null check (match_count in (3,4,5)),
  prize_amount numeric(12,2) not null,
  proof_path text,
  verification_status text not null default 'awaiting_proof'
    check (verification_status in ('awaiting_proof','submitted','approved','rejected')),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (draw_id, user_id)
);

-- ---------- Money movements ----------
create table if not exists public.payments (            -- subscription fees
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  charity_id uuid references public.charities(id) on delete set null,
  plan text,
  amount numeric(12,2) not null,
  charity_amount numeric(12,2) not null default 0,
  prize_amount numeric(12,2) not null default 0,
  source text not null default 'stripe',
  created_at timestamptz not null default now()
);
create table if not exists public.donations (           -- independent donations
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  charity_id uuid references public.charities(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  source text not null default 'stripe',
  created_at timestamptz not null default now()
);

-- ---------- New auth user -> profile ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, charity_id, charity_percent)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    nullif(new.raw_user_meta_data->>'charity_id','')::uuid,
    least(50, greatest(10, coalesce(nullif(new.raw_user_meta_data->>'charity_percent','')::int, 10)))
  )
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Row Level Security (defence in depth; server code uses the service
-- role for privileged writes after checking the caller's role)
-- =====================================================================
alter table public.charities enable row level security;
alter table public.profiles enable row level security;
alter table public.scores enable row level security;
alter table public.draws enable row level security;
alter table public.draw_entries enable row level security;
alter table public.winners enable row level security;
alter table public.payments enable row level security;
alter table public.donations enable row level security;

drop policy if exists "charities public read" on public.charities;
create policy "charities public read" on public.charities for select using (active);
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select using (auth.uid() = id);
drop policy if exists "own scores read" on public.scores;
create policy "own scores read" on public.scores for select using (auth.uid() = user_id);
drop policy if exists "published draws read" on public.draws;
create policy "published draws read" on public.draws for select using (status = 'published');
drop policy if exists "own entries read" on public.draw_entries;
create policy "own entries read" on public.draw_entries for select using (auth.uid() = user_id);
drop policy if exists "own winners read" on public.winners;
create policy "own winners read" on public.winners for select using (auth.uid() = user_id);
drop policy if exists "own payments read" on public.payments;
create policy "own payments read" on public.payments for select using (auth.uid() = user_id);
drop policy if exists "own donations read" on public.donations;
create policy "own donations read" on public.donations for select using (auth.uid() = user_id);

-- ---------- Private bucket for winner proof screenshots ----------
insert into storage.buckets (id, name, public) values ('proofs', 'proofs', false)
on conflict (id) do nothing;

-- ---------- Seed charities ----------
insert into public.charities (name, slug, category, tagline, description, featured, events) values
('Bright Start Foundation','bright-start','Education','Books, meals and mentors for first-generation students.',
 'Bright Start funds school supplies, midday meals and after-school mentoring for children who are the first in their family to stay in school. Every ₹1,500 keeps one child in class for a full term.',
 true, '[{"title":"Charity Golf Day","date":"2026-11-08","location":"Nagpur Golf Club"},{"title":"Back to School Drive","date":"2026-12-02","location":"Online"}]'),
('Clean Water Collective','clean-water','Environment','Safe drinking water for villages that still walk miles for it.',
 'The Collective builds and maintains community water points and trains local technicians so every well keeps running long after the ribbon is cut.',
 false, '[{"title":"Well Build Weekend","date":"2026-10-19","location":"Vidarbha region"}]'),
('Second Wind Health','second-wind','Health','Free check-ups and recovery support for people with no safety net.',
 'Mobile clinics, screening camps and recovery grants for families facing a medical emergency without insurance.',
 false, '[{"title":"Health Camp Fundraiser","date":"2026-11-23","location":"Nagpur"}]'),
('Paws & Second Chances','paws','Animals','Rescue, rehab and rehoming for street animals.',
 'A volunteer-run shelter network that vaccinates, treats and rehomes rescued animals and runs community sterilisation drives.',
 false, '[]'),
('Roots & Rooftops','roots-rooftops','Community','Urban gardens and safe housing repairs for older neighbours.',
 'Volunteers repair homes and grow shared rooftop gardens so older residents can stay independent and connected.',
 false, '[{"title":"Rooftop Garden Day","date":"2026-10-11","location":"Dharampeth"}]'),
('Ability Unlimited','ability-unlimited','Inclusion','Sport and skills programmes for people with disabilities.',
 'Adaptive sport, vocational training and job placement for people with disabilities, run by people with disabilities.',
 false, '[{"title":"Adaptive Golf Clinic","date":"2026-12-14","location":"Nagpur"}]')
on conflict (slug) do nothing;
