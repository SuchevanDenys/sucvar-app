-- Coloane pentru sincronizarea perioadei de abonament Stripe în `profiles`.
-- Rulează o singură dată în Supabase SQL Editor ÎNAINTE de a porni noul flux de plată.
alter table public.profiles
  add column if not exists current_period_end   timestamptz,
  add column if not exists billing_interval     text check (billing_interval in ('month', 'year')),
  add column if not exists cancel_at_period_end boolean not null default false;
