# Sucvar

Romanian-language AI interior / exterior / garden design studio (bachelor's thesis project).
Next.js 16 · React 19 · Supabase · Stripe · Replicate / Stable Diffusion.

## Development

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build && pnpm start
pnpm lint
```

Configure `.env.local` (see `CLAUDE.md` for the variable list) and verify it at `/env-check` (dev only).

## Layout

- `app/` pages and API routes (`generate`, `checkout`, `webhooks/stripe`)
- `app/components/{layout,ui,studio,login,b2b}` UI components
- `app/lib/{ai,billing,plan,supabase,theme}` domain modules
- `app/types/` domain types (barrel: `@/app/types`)
