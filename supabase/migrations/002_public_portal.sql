-- ════════════════════════════════════════════════════════════════════════════════
-- SUCVAR — Portalul public de prezentare și aprobare (migrare 002)   IDEMPOTENT
-- ════════════════════════════════════════════════════════════════════════════════
--
-- CUM SE RULEAZĂ: după 001_sucvar_schema.sql, în Supabase Dashboard → SQL Editor → Run.
-- Doar ADD COLUMN IF NOT EXISTS / CREATE ... IF NOT EXISTS: nu șterge și nu rescrie date.
--
-- MODELUL DE SECURITATE AL PORTALULUI (/p/[id]):
--   • Clientul final (vizitator FĂRĂ cont) nu primește NICIUN drept nou în baza de date:
--     rolul `anon` rămâne fără acces la `projects` (vezi 001). Pagina publică citește prin
--     server, cu `service_role`, și doar dacă `is_public = true`.
--   • Serverul face o PROIECȚIE STRICTĂ (app/lib/server/db.ts → getPublicProject): selectează
--     explicit coloanele publice și construiește un obiect nou. user_id, user_email, marja,
--     contingența, tarifele orare, prețurile unitare și notele interne nu părăsesc serverul.
--   • Recenzia clientului (aprobare / modificări) se scrie tot prin server, limitat ca rată,
--     doar pe proiecte publice și doar în cele 3 coloane client_*.
--   • `is_public` îl schimbă doar proprietarul (RLS projects_update_own din 001 sau ruta
--     autentificată /api/projects/sharing). Implicit FALSE: nimic nu devine public din greșeală.
-- ════════════════════════════════════════════════════════════════════════════════

begin;

alter table public.projects
  add column if not exists is_public          boolean     not null default false,
  add column if not exists client_status      text        not null default 'pending',
  add column if not exists client_feedback    text,
  add column if not exists client_reviewed_at timestamptz;

-- CHECK-uri adăugate o singură dată (NOT VALID + VALIDATE: rândurile vechi nu blochează migrarea)
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.projects'::regclass and conname = 'projects_client_status_check') then
    alter table public.projects add constraint projects_client_status_check
      check (client_status in ('pending', 'approved', 'changes_requested')) not valid;
    alter table public.projects validate constraint projects_client_status_check;
  end if;

  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.projects'::regclass and conname = 'projects_client_feedback_len_check') then
    alter table public.projects add constraint projects_client_feedback_len_check
      check (client_feedback is null or char_length(client_feedback) <= 500) not valid;
    begin
      alter table public.projects validate constraint projects_client_feedback_len_check;
    exception when check_violation then
      raise notice 'projects_client_feedback_len_check: rânduri vechi prea lungi, activă doar pentru scrieri noi.';
    end;
  end if;
end;
$$;

-- Index parțial: doar proiectele publicate (puține) — portalul caută după id ȘI is_public.
create index if not exists projects_public_idx on public.projects (id) where is_public;

-- Antreprenorul își vede rapid proiectele cu feedback recent (lista din /b2b).
create index if not exists projects_user_reviewed_idx
  on public.projects (user_id, client_reviewed_at desc) where client_reviewed_at is not null;

commit;

notify pgrst, 'reload schema';
