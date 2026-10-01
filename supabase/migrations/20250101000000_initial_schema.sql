-- StockAI — Initial Database Schema
-- ─────────────────────────────────────────────────────────────────────────────
-- Run this in your Supabase Dashboard → SQL Editor after creating a new project.
-- All tables match the TypeScript types in src/integrations/supabase/types.ts
-- ─────────────────────────────────────────────────────────────────────────────

-- ── profiles ──────────────────────────────────────────────────────────────────
-- Automatically populated when a user signs up via the trigger below.
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text,
  email       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger: create a profile row whenever a new auth user is created
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── stock_predictions ─────────────────────────────────────────────────────────
-- Caches AI predictions so the same symbol isn't re-predicted multiple times per day.
create table if not exists public.stock_predictions (
  id              uuid primary key default gen_random_uuid(),
  symbol          text not null,
  current_price   numeric,
  predicted_price numeric,
  confidence      numeric,
  prediction_date date not null,
  created_at      timestamptz not null default now(),
  unique (symbol, prediction_date)
);

alter table public.stock_predictions enable row level security;

-- Predictions are readable by any authenticated user
create policy "Authenticated users can read predictions"
  on public.stock_predictions for select
  to authenticated
  using (true);

-- Predictions can be inserted/updated by any authenticated user
create policy "Authenticated users can upsert predictions"
  on public.stock_predictions for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update predictions"
  on public.stock_predictions for update
  to authenticated
  using (true);

-- ── watchlists ────────────────────────────────────────────────────────────────
create table if not exists public.watchlists (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users on delete cascade,
  symbol   text not null,
  name     text not null,
  added_at timestamptz not null default now(),
  unique (user_id, symbol)
);

alter table public.watchlists enable row level security;

create policy "Users can manage their own watchlist"
  on public.watchlists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
