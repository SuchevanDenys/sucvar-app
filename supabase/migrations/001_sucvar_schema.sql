-- ════════════════════════════════════════════════════════════════════════════════
-- SUCVAR — schema PostgreSQL / Supabase (migrare 001)            IDEMPOTENT: se poate rula de mai multe ori
-- ════════════════════════════════════════════════════════════════════════════════
--
-- CUM SE RULEAZĂ: Supabase Dashboard → SQL Editor → New query → lipește tot fișierul → Run.
-- Scriptul NU șterge și NU rescrie date existente: folosește doar CREATE ... IF NOT EXISTS,
-- ADD COLUMN IF NOT EXISTS și CREATE OR REPLACE. Rulează într-o singură tranzacție
-- (BEGIN/COMMIT): dacă o instrucțiune eșuează, nu se aplică nimic.
--
-- ── 1. MODELUL RELAȚIONAL (documentație pentru lucrarea de licență) ────────────────
--
--   auth.users (gestionat de Supabase Auth)
--      │ 1
--      ├──── 1 ── public.profiles        (id = auth.users.id; plan Stripe + perioada abonamentului)
--      ├──── N ── public.projects        (proiectele salvate din Studio; imagini Base64 în coloane text)
--      │              │ 1
--      │              └── N ── public.b2b_estimates  (devizele B2B ale unui proiect; poziții în jsonb)
--      ├──── N ── public.b2b_estimates   (proprietarul devizului — denormalizat pentru RLS rapid)
--      └──── N ── public.ai_generations  (jurnal server: o linie per generare AI reușită)
--
--   Toate cheile străine către auth.users au ON DELETE CASCADE: ștergerea contului elimină
--   automat tot ce ține de el (conformitate GDPR — „dreptul de a fi uitat").
--   b2b_estimates.project_id (text, ca projects.id) are ON DELETE CASCADE: ștergerea proiectului șterge și devizele lui.
--
-- ── 2. MODELUL DE SECURITATE (Row Level Security) ──────────────────────────────────
--
--   • RLS este ACTIVAT pe toate tabelele. Fără politică, accesul este refuzat implicit.
--   • Utilizatorul autentificat (rolul `authenticated`, cheia ANON din browser) vede și modifică
--     DOAR rândurile proprii: auth.uid() = user_id.
--   • `profiles` este doar pentru CITIRE din browser. Planul (subscription_tier) îl scrie exclusiv
--     webhook-ul Stripe / ruta de verificare prin `service_role` (care ocolește RLS). Dacă
--     utilizatorul și-ar putea face UPDATE pe propriul profil, ar putea să-și acorde singur „agency".
--   • `ai_generations` este doar pentru CITIRE din browser; INSERT-ul îl face serverul (service_role),
--     altfel contorul de consum ar putea fi falsificat.
--   • `b2b_estimates`: citire/ștergere pentru proprietar; scriere doar dacă planul EFECTIV este
--     'agency' (funcția has_b2b_access()) — regula e impusă și în baza de date, nu doar în UI.
--   • `anon` (vizitator neautentificat) nu are acces la nicio tabelă.
--
-- ── 3. STRATEGIA DE INDEXARE ───────────────────────────────────────────────────────
--
--   Interogările „fierbinți" au toate forma  WHERE user_id = ? ORDER BY created_at DESC:
--   portofoliul de proiecte, lista de devize, contorul lunar de generări. Un index B-Tree
--   COMPUS (user_id, created_at DESC) servește simultan filtrul și sortarea, fără pas de sortare.
--   Webhook-ul Stripe caută profilul după stripe_subscription_id / stripe_customer_id
--   => indecși dedicați (parțiali: nu indexăm rândurile fără abonament).
--
-- ── 4. COMPATIBILITATE CU DATELE EXISTENTE ─────────────────────────────────────────
--
--   • `projects` era legat de utilizator doar prin `user_email`. Adăugăm `user_id` (uuid) și îl
--     completăm retroactiv din auth.users după email; rândurile noi îl primesc automat printr-un
--     trigger BEFORE INSERT. Coloana `user_email` rămâne (aplicația existentă o folosește).
--   • Constrângerile CHECK pe tabele existente se adaugă ca NOT VALID și apoi se încearcă
--     VALIDATE: dacă există rânduri vechi invalide, constrângerea rămâne activă doar pentru
--     scrierile noi (și se afișează un NOTICE), iar datele vechi NU se pierd.
-- ════════════════════════════════════════════════════════════════════════════════

begin;

-- ── 0. Utilitar temporar: adaugă un CHECK o singură dată (idempotent) ───────────────
create or replace function public.sucvar_add_check(p_table regclass, p_name text, p_expr text)
returns void
language plpgsql
as $$
begin
  if not exists (select 1 from pg_constraint where conrelid = p_table and conname = p_name) then
    execute format('alter table %s add constraint %I check (%s) not valid', p_table, p_name, p_expr);
    begin
      execute format('alter table %s validate constraint %I', p_table, p_name);
    exception when check_violation then
      raise notice 'Constrângerea % are rânduri vechi invalide: activă doar pentru scrieri noi.', p_name;
    end;
  end if;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════════
-- 1. TABELE
-- ════════════════════════════════════════════════════════════════════════════════

-- ── 1.1 profiles: 1 rând per utilizator (id = auth.users.id) ─────────────────────────
create table if not exists public.profiles (
  id                     uuid primary key references auth.users (id) on delete cascade,
  email                  text,
  full_name              text,
  subscription_tier      text        not null default 'starter',
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,                 -- sfârșitul perioadei plătite (din Stripe)
  billing_interval       text,                        -- 'month' | 'year'
  cancel_at_period_end   boolean     not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Tabelul poate exista deja (versiuni vechi): completăm coloanele lipsă.
alter table public.profiles
  add column if not exists email                  text,
  add column if not exists full_name              text,
  add column if not exists subscription_tier      text        default 'starter',
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text,
  add column if not exists current_period_end     timestamptz,
  add column if not exists billing_interval       text,
  add column if not exists cancel_at_period_end   boolean     not null default false,
  add column if not exists created_at             timestamptz not null default now(),
  add column if not exists updated_at             timestamptz not null default now();

-- Normalizăm valorile vechi (aceleași sinonime ca normalizeTier() din app/lib/plan/tiers.ts),
-- ca CHECK-ul de mai jos să poată fi validat complet.
update public.profiles
   set subscription_tier = case lower(trim(coalesce(subscription_tier, '')))
         when 'agency'       then 'agency'
         when 'enterprise'   then 'agency'
         when 'business'     then 'agency'
         when 'pro'          then 'pro'
         when 'professional' then 'pro'
         else 'starter'
       end
 where subscription_tier is null
    or subscription_tier not in ('starter', 'pro', 'agency');

alter table public.profiles alter column subscription_tier set default 'starter';
alter table public.profiles alter column subscription_tier set not null;

select public.sucvar_add_check('public.profiles', 'profiles_tier_check',
  $c$subscription_tier in ('starter', 'pro', 'agency')$c$);
select public.sucvar_add_check('public.profiles', 'profiles_interval_check',
  $c$billing_interval is null or billing_interval in ('month', 'year')$c$);

-- Profile lipsă pentru conturile create înainte de trigger (INSERT ... ON CONFLICT: nu atinge rândurile existente)
insert into public.profiles (id, email)
select u.id, lower(u.email)
  from auth.users u
 on conflict (id) do nothing;

-- ── 1.2 projects: proiectele salvate din Studio ──────────────────────────────────────
create table if not exists public.projects (
  id              text primary key default gen_random_uuid()::text,   -- text: așa există în baza reală (id generat de client)
  user_id         uuid references auth.users (id) on delete cascade,
  user_email      text          not null default '',
  title           text          not null default 'Proiect SUCVAR',
  mode            text          not null default 'interiors',     -- interiors | exteriors | gardens
  space_type      text          not null default 'kitchen',
  style_id        text          not null default 'scandinavian',
  dimensions      jsonb         not null default '{}'::jsonb,     -- RoomDimensions (lungime, lățime, înălțime…)
  original_image  text,                                           -- Data URL Base64 (fotografia încărcată)
  generated_image text,                                           -- Data URL Base64 (randarea AI)
  total_budget    numeric(12,2) not null default 0,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

alter table public.projects
  add column if not exists user_id    uuid references auth.users (id) on delete cascade,
  add column if not exists updated_at timestamptz not null default now();

-- Completare retroactivă: legăm proiectele vechi de utilizator prin email (o singură dată efectiv).
update public.projects p
   set user_id = u.id
  from auth.users u
 where p.user_id is null
   and p.user_email is not null
   and lower(u.email) = lower(p.user_email);

select public.sucvar_add_check('public.projects', 'projects_budget_check',  $c$total_budget >= 0$c$);
select public.sucvar_add_check('public.projects', 'projects_mode_check',
  $c$mode in ('interiors', 'exteriors', 'gardens')$c$);

-- ── 1.3 ai_generations: jurnalul serverului (o linie per generare reușită) ───────────
create table if not exists public.ai_generations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  provider   text,
  mode       text,
  created_at timestamptz not null default now()
);

alter table public.ai_generations
  add column if not exists provider text,
  add column if not exists mode     text;

-- ── 1.4 b2b_estimates: devizele B2B (înlocuiesc treptat localStorage `b2bWorkspaces`) ──
create table if not exists public.b2b_estimates (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid          not null references auth.users (id) on delete cascade,
  project_id     text          references public.projects (id) on delete cascade,  -- text = tipul real al projects.id
  doc_no         text          not null default '',
  status         text          not null default 'draft',          -- draft | sent | accepted | rejected
  client         jsonb         not null default '{}'::jsonb,      -- ClientMeta (nume, CUI, adrese…)
  region         text          not null default 'bucharest',
  finish_level   text          not null default 'standard',
  area_m2        numeric(12,2) not null default 0,
  crew           integer       not null default 1,
  contingency_pct numeric(5,2) not null default 0,
  margin_pct     numeric(5,2)  not null default 0,
  vat_pct        numeric(5,2)  not null default 19,
  scope          jsonb         not null default '{}'::jsonb,      -- ore/m² per meserie
  rate_override  jsonb         not null default '{}'::jsonb,      -- tarife €/h modificate manual
  line_items     jsonb         not null default '[]'::jsonb,      -- LineItem[] (material, unitate, cantitate, preț)
  subtotal       numeric(12,2) not null default 0,
  total          numeric(12,2) not null default 0,                -- total cu TVA, calculat de aplicație
  created_at     timestamptz   not null default now(),
  updated_at     timestamptz   not null default now()
);

-- Un singur deviz per proiect și utilizator (permite upsert pe (user_id, project_id)).
-- Index UNIC parțial: NULL în project_id (devize fără proiect) nu se ciocnesc între ele.
create unique index if not exists b2b_estimates_user_project_uidx
  on public.b2b_estimates (user_id, project_id) where project_id is not null;

select public.sucvar_add_check('public.b2b_estimates', 'b2b_estimates_status_check',
  $c$status in ('draft', 'sent', 'accepted', 'rejected')$c$);
select public.sucvar_add_check('public.b2b_estimates', 'b2b_estimates_area_check',     $c$area_m2 >= 0$c$);
select public.sucvar_add_check('public.b2b_estimates', 'b2b_estimates_crew_check',     $c$crew >= 1$c$);
select public.sucvar_add_check('public.b2b_estimates', 'b2b_estimates_pct_check',
  $c$contingency_pct >= 0 and margin_pct >= 0 and vat_pct >= 0 and vat_pct <= 100$c$);
select public.sucvar_add_check('public.b2b_estimates', 'b2b_estimates_totals_check',
  $c$subtotal >= 0 and total >= 0$c$);
select public.sucvar_add_check('public.b2b_estimates', 'b2b_estimates_items_check',
  $c$jsonb_typeof(line_items) = 'array'$c$);

-- ════════════════════════════════════════════════════════════════════════════════
-- 2. INDECȘI (B-Tree)
-- ════════════════════════════════════════════════════════════════════════════════
create index if not exists projects_user_created_idx        on public.projects       (user_id, created_at desc);
create index if not exists projects_email_created_idx       on public.projects       (user_email, created_at desc);
create index if not exists ai_generations_user_created_idx  on public.ai_generations (user_id, created_at desc);
create index if not exists b2b_estimates_user_created_idx   on public.b2b_estimates  (user_id, created_at desc);
create index if not exists b2b_estimates_user_updated_idx   on public.b2b_estimates  (user_id, updated_at desc);
create index if not exists profiles_stripe_customer_idx     on public.profiles       (stripe_customer_id)     where stripe_customer_id     is not null;
create index if not exists profiles_stripe_subscription_idx on public.profiles       (stripe_subscription_id) where stripe_subscription_id is not null;

-- ════════════════════════════════════════════════════════════════════════════════
-- 3. FUNCȚII ȘI TRIGGERE
-- ════════════════════════════════════════════════════════════════════════════════

-- ── 3.1 updated_at automat ─────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at      on public.profiles;
drop trigger if exists projects_set_updated_at      on public.projects;
drop trigger if exists b2b_estimates_set_updated_at on public.b2b_estimates;
create trigger profiles_set_updated_at      before update on public.profiles      for each row execute function public.set_updated_at();
create trigger projects_set_updated_at      before update on public.projects      for each row execute function public.set_updated_at();
create trigger b2b_estimates_set_updated_at before update on public.b2b_estimates for each row execute function public.set_updated_at();

-- ── 3.2 projects: proprietarul se stabilește pe server, nu din client ────────────────
-- Browserul trimite doar user_email (cod existent). Triggerul (rulează ÎNAINTE de verificarea RLS)
-- completează user_id = auth.uid() și aliniază user_email cu emailul din JWT, deci un client
-- nu poate „împrumuta" emailul altcuiva pentru contorizarea lunară.
create or replace function public.projects_set_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    if new.user_id is null then
      new.user_id := auth.uid();
    end if;
    if new.user_id = auth.uid() then
      new.user_email := coalesce(auth.jwt() ->> 'email', new.user_email, '');
    end if;
  end if;
  new.user_email := lower(coalesce(new.user_email, ''));
  return new;
end;
$$;

drop trigger if exists projects_set_owner on public.projects;
create trigger projects_set_owner before insert or update on public.projects
  for each row execute function public.projects_set_owner();

-- ── 3.3 handle_new_user: creează profilul la înregistrare ──────────────────────────
-- SECURITY DEFINER: rulează cu drepturile proprietarului funcției, fiindcă utilizatorul
-- proaspăt înregistrat nu are (și nu trebuie să aibă) drept de INSERT pe `profiles`.
-- search_path gol + nume calificate = protecție împotriva deturnării prin search_path.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 3.4 Plan efectiv + acces B2B (oglinda SQL a resolveEffectiveTier din tiers.ts) ───
-- Un plan plătit a cărui perioadă a expirat (current_period_end < now()) se tratează ca 'starter'.
-- Lipsa datei (conturi vechi) păstrează planul — aceeași regulă ca în aplicație.
create or replace function public.current_user_effective_tier()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select case
              when p.subscription_tier in ('pro', 'agency')
               and p.current_period_end is not null
               and p.current_period_end < now()
                then 'starter'
              else p.subscription_tier
            end
       from public.profiles p
      where p.id = (select auth.uid())),
    'starter'
  );
$$;

create or replace function public.has_b2b_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_effective_tier() = 'agency';
$$;

revoke all on function public.current_user_effective_tier() from public, anon;
revoke all on function public.has_b2b_access()              from public, anon;
grant execute on function public.current_user_effective_tier() to authenticated, service_role;
grant execute on function public.has_b2b_access()              to authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════════════════
-- 4. ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════════════
alter table public.profiles       enable row level security;
alter table public.projects       enable row level security;
alter table public.ai_generations enable row level security;
alter table public.b2b_estimates  enable row level security;

-- Defense in depth: vizitatorii anonimi nu ating tabelele; utilizatorii autentificați nu pot
-- scrie în tabelele gestionate de server (chiar dacă o politică ar fi adăugată din greșeală).
revoke all on public.profiles, public.projects, public.ai_generations, public.b2b_estimates from anon;
revoke insert, update, delete on public.profiles       from authenticated;
revoke insert, update, delete on public.ai_generations from authenticated;

-- (select auth.uid()) în loc de auth.uid(): Postgres îl evaluează o singură dată per interogare (initPlan),
-- nu per rând — diferență mare pe tabele cu multe rânduri.

-- profiles: doar citire proprie
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

-- projects: CRUD complet, strict pe rândurile proprii
drop policy if exists "projects_select_own" on public.projects;
drop policy if exists "projects_insert_own" on public.projects;
drop policy if exists "projects_update_own" on public.projects;
drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_select_own" on public.projects
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "projects_insert_own" on public.projects
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "projects_update_own" on public.projects
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "projects_delete_own" on public.projects
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ai_generations: doar citire proprie (scrie serverul cu service_role)
drop policy if exists "ai_generations_select_own" on public.ai_generations;
create policy "ai_generations_select_own" on public.ai_generations
  for select to authenticated using ((select auth.uid()) = user_id);

-- b2b_estimates: citire/ștergere proprii; scriere doar pentru planul 'agency' efectiv
drop policy if exists "b2b_estimates_select_own" on public.b2b_estimates;
drop policy if exists "b2b_estimates_insert_own" on public.b2b_estimates;
drop policy if exists "b2b_estimates_update_own" on public.b2b_estimates;
drop policy if exists "b2b_estimates_delete_own" on public.b2b_estimates;
create policy "b2b_estimates_select_own" on public.b2b_estimates
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "b2b_estimates_insert_own" on public.b2b_estimates
  for insert to authenticated with check ((select auth.uid()) = user_id and public.has_b2b_access());
create policy "b2b_estimates_update_own" on public.b2b_estimates
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and public.has_b2b_access());
create policy "b2b_estimates_delete_own" on public.b2b_estimates
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ── Curățenie: utilitarul temporar nu mai e necesar ─────────────────────────────────
drop function if exists public.sucvar_add_check(regclass, text, text);

commit;

-- Reîncarcă cache-ul de schemă PostgREST (altfel API-ul poate raporta „column not found" câteva minute)
notify pgrst, 'reload schema';
