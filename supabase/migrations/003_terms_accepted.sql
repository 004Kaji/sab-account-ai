-- Add terms_accepted_at to profiles so we can gate access until accepted
alter table profiles
  add column if not exists terms_accepted_at timestamptz default null;
