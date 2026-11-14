# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is pnpm (`packageManager` in package.json; `pnpm-lock.yaml` is canonical — `package-lock.json` is untracked noise).

- `pnpm dev` — dev server on http://localhost:3000
- `pnpm build` / `pnpm start` — production build / serve
- `pnpm lint` — ESLint (flat config, `eslint.config.mjs`)

There is no test suite. `/env-check` is a page for verifying that environment variables are configured.

## Next.js version warning

This is Next.js 16 / React 19 with breaking changes versus older versions. `AGENTS.md` requires reading the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `03-architecture`, …) before writing Next-specific code. Path alias: `@/app/...` (imports are rooted at the repo, e.g. `@/app/lib/plan`).

## What this is

"Sucvar" — a Romanian-language AI interior/exterior/garden design studio (a bachelor's thesis project). Users upload a room photo, pick a space mode, style, layout, and budget, and get an AI-redesigned image. UI text and many code comments are in Romanian; API-route comments are in English.

`sucvar-app/` at the root is a separate leftover directory, not part of this app.

## Architecture

**App Router, all under `app/`.** Pages: `/` (landing), `/generate` (the Studio), `/b2b` (agency/enterprise), `/checkout`, `/login`, `/env-check`. API routes: `api/generate`, `api/checkout`, `api/webhooks/stripe`.

**Generation pipeline** (`app/api/generate/route.ts`): validates untrusted input → `checkGenerationQuota` (`app/lib/quota.ts`) → builds a prompt from catalog data (`app/data/catalog.ts`, `app/lib/ai/prompt.ts`; kept under ~72 CLIP tokens because SD ignores anything past 77, so furniture/style go first) → calls an image provider → converts the result with `sharp` to a compressed permanent JPEG data URL (Replicate URLs expire) → `recordServerGeneration`. Without credentials it falls back to demo images.

**Providers** (`app/lib/ai/providers/`): `types.ts` interface, with `replicate`, `stable-diffusion` (A1111-style API + ControlNet), and `demo` implementations selected in `index.ts` via `AI_PROVIDER`. Limits and defaults live in `app/lib/ai/config.ts` (`AI_LIMITS`, `DEFAULT_AI_SETTINGS`, `PLAN_LIMITS`).

**Plans / quota — two layers that must stay consistent:**
- Client (`app/lib/plan.ts`, `usePlan.ts`, `UpgradeGate`, `PlanBadge`): resolves tier (`starter` | `pro` | `agency`) from a Supabase session → `profiles.subscription_tier`, or from a localStorage "demo mode" profile (`sucvar_demo_*` keys). Monthly usage is a localStorage counter combined with saved project count. UX only — not enforceable. Plan changes broadcast via the `sucvar-plan-change` window event.
- Server (`app/lib/quota.ts`): validates the Bearer token with the Supabase `service_role` key, reads the plan from `profiles`, counts usage from `projects` (+ `ai_generations` if present). `pro` and `agency` are unlimited; only `starter` is capped. Any plan rule change must be made in both layers.

**Billing**: `app/lib/stripe.ts`, `api/checkout` creates sessions, `api/webhooks/stripe` updates `profiles.subscription_tier`.

**Supabase** (`app/lib/supabase.ts`): browser client + helpers for auth, profiles, and projects (cloud with local fallback).

**Theming**: `app/lib/theme.ts`, `app/lib/skin.tsx`, `globals.css` (plus `globals-ios-additions.css` at root).

## Environment (`.env.local`)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `_PUBLISHABLE_KEY`), `SUPABASE_SERVICE_ROLE_KEY` (server only), `AI_PROVIDER`, `REPLICATE_API_TOKEN`, `SD_API_URL` / `SD_API_KEY` / `SD_CONTROLNET_MODEL` / `SD_CONTROLNET_MODULE` / `SD_SAMPLER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_ADMIN_EMAILS` (UX gate for `/b2b`), `ALLOW_ANON_GENERATION`.
