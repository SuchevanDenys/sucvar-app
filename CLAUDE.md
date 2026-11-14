# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is pnpm (`packageManager` in package.json; `pnpm-lock.yaml` is canonical — `package-lock.json` is untracked noise).

- `pnpm dev` — dev server on http://localhost:3000
- `pnpm build` / `pnpm start` — production build / serve
- `pnpm lint` — ESLint (flat config, `eslint.config.mjs`)

There is no test suite. `/env-check` is a dev-only page (404 in production) for verifying that environment variables are configured.

## Next.js version warning

This is Next.js 16 / React 19 with breaking changes versus older versions. `AGENTS.md` requires reading the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `03-architecture`, …) before writing Next-specific code. Path alias: `@/app/...` (imports are rooted at the repo, e.g. `@/app/lib/plan/tiers`).

## What this is

"Sucvar" — a Romanian-language AI interior/exterior/garden design studio (a bachelor's thesis project). Users upload a room photo, pick a space mode, style, layout, and budget, and get an AI-redesigned image. UI text and many code comments are in Romanian; API-route comments are in English.

## Architecture

**App Router, all under `app/`.** Pages: `/` (landing), `/generate` (the Studio), `/b2b` (agency/enterprise), `/checkout`, `/login`, `/env-check`. API routes: `api/generate`, `api/checkout`, `api/webhooks/stripe`.

**Generation pipeline** (`app/api/generate/route.ts`): validates untrusted input → `checkGenerationQuota` (`app/lib/server/quota.ts`) → builds a prompt from catalog data (`app/data/catalog.ts`, `app/lib/ai/prompt.ts`; kept under ~72 CLIP tokens because SD ignores anything past 77, so furniture/style go first) → calls an image provider → converts the result with `sharp` to a compressed permanent JPEG data URL (Replicate URLs expire) → `recordServerGeneration`. Without credentials it falls back to demo images.

**Providers** (`app/lib/ai/providers/`): `types.ts` interface, with `replicate`, `stable-diffusion` (A1111-style API + ControlNet), and `demo` implementations selected in `index.ts` via `AI_PROVIDER`. Limits and defaults live in `app/lib/ai/config.ts` (`AI_LIMITS`, `DEFAULT_AI_SETTINGS`, `PLAN_LIMITS`).

**Plans / quota — one tier definition, two enforcement layers:**
- Shared (`app/lib/plan/tiers.ts`, type `PlanTier` in `app/types/plan.ts`): `'starter' | 'pro' | 'agency'`, `normalizeTier`, `isUnlimitedTier`, `hasB2bAccess`, `PLAN_LIMITS`. `pro` and `agency` have unlimited Studio generations; only `agency` unlocks `/b2b`. Both layers import this — change plan rules here first.
- Client (`app/lib/plan/client.ts`, `usePlan.ts`, `useEnterpriseAccess.ts`; `components/ui/{UpgradeGate,PlanBadge}`): resolves tier from a Supabase session → `profiles.subscription_tier` (`lib/supabase/tier.ts`), or from a localStorage "demo mode" profile. Monthly usage is a localStorage counter combined with saved project count. UX only — not enforceable. Plan changes broadcast via the `sucvar-plan-change` window event.
- Server (`app/lib/server/quota.ts`): validates the Bearer token with the Supabase `service_role` client (`lib/supabase/admin.ts`, server only), reads the plan from `profiles`, counts usage from `projects` (+ `ai_generations` if present).

**Billing**: `app/lib/billing/stripe.ts`, `api/checkout` creates sessions, `api/webhooks/stripe` updates `profiles.subscription_tier`.

**Supabase** (`app/lib/supabase/`): `client.ts` (browser client), `auth.ts`, `projects.ts` (cloud with local fallback), `tier.ts`, `admin.ts` (service role, server only), `errors.ts`, `url.ts`.

**Browser state**: all `sucvar_*` localStorage keys live in `app/lib/storage.ts` (`STORAGE_KEYS` + safe read/write). Reactive reads use `app/lib/useStoredValue.ts` (`useSyncExternalStore`, no setState-in-effect). Language/theme come from `usePrefs()` (`app/lib/theme/usePrefs.ts`) — pages and `Navbar` no longer receive them as props.

**Theming**: `app/lib/theme/{tokens,skin,usePrefs}`, `components/ui/Editorial.tsx` (skin-based presentational parts), `globals.css`.

**Layout of `app/`**: `components/{layout,ui,studio,login,b2b,home}`, `lib/{ai,b2b,billing,plan,server,studio,supabase,theme}`, `data/` (`catalog.ts`, `home.ts`), `types/` (barrel `@/app/types`: `ai`, `auth`, `plan`, `project`, `studio`).

## Environment (`.env.local`)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `_PUBLISHABLE_KEY`), `SUPABASE_SERVICE_ROLE_KEY` (server only), `AI_PROVIDER`, `REPLICATE_API_TOKEN`, `SD_API_URL` / `SD_API_KEY` / `SD_CONTROLNET_MODEL` / `SD_CONTROLNET_MODULE` / `SD_SAMPLER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_ADMIN_EMAILS` (UX gate for `/b2b`), `ALLOW_ANON_GENERATION`.
