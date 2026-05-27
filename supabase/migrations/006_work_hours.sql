-- Migration 006: Work Hours Tracker
-- Tables for student visa work-hour tracking (48hr/fortnight limit)

-- ── work_hours: individual work shift entries ─────────────────────────
create table if not exists public.work_hours (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  work_date     date not null,
  hours_worked  numeric(4,2) not null,
  employer_name text,
  notes         text,
  created_at    timestamptz default now()
);

alter table public.work_hours enable row level security;

create policy "users_manage_own_work_hours" on public.work_hours
  for all using (auth.uid() = user_id);

-- ── work_hours_settings: per-user mode (semester vs holiday) ──────────
-- numeric(5,2) for fortnightly_limit to accommodate 999.00 (holiday mode)
create table if not exists public.work_hours_settings (
  id                uuid default gen_random_uuid() primary key,
  user_id           uuid references auth.users(id) on delete cascade unique not null,
  mode              text not null default 'semester'
                      check (mode in ('semester', 'holiday')),
  fortnightly_limit numeric(5,2) generated always as (
                      case when mode = 'holiday' then 999 else 48 end
                    ) stored,
  created_at        timestamptz default now()
);

alter table public.work_hours_settings enable row level security;

create policy "users_manage_own_work_hours_settings" on public.work_hours_settings
  for all using (auth.uid() = user_id);

-- ── Indexes for query performance ─────────────────────────────────────
create index if not exists work_hours_user_date_idx
  on public.work_hours (user_id, work_date desc);

create index if not exists work_hours_settings_user_idx
  on public.work_hours_settings (user_id);
