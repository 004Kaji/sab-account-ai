-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)

-- profiles: one row per auth user, tracks plan + billing state
create table if not exists public.profiles (
  id                    uuid references auth.users(id) on delete cascade primary key,
  email                 text,
  plan                  text not null default 'free',
  stripe_customer_id    text unique,
  stripe_subscription_id text unique,
  subscription_status   text default 'inactive',
  trial_ends_at         timestamptz,
  billing_cycle_end     timestamptz,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- stripe_events: idempotency log — prevents double-processing webhook events
create table if not exists public.stripe_events (
  id         text primary key,
  type       text not null,
  data       jsonb not null,
  processed  boolean not null default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.stripe_events enable row level security;

-- Users can only read/update their own profile
create policy "users_select_own_profile" on public.profiles
  for select using (auth.uid() = id);

create policy "users_update_own_profile" on public.profiles
  for update using (auth.uid() = id);

-- stripe_events is only accessed by the service role (bypasses RLS by default)

-- Auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
