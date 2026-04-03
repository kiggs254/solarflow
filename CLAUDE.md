# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
# Development
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint (v9 flat config)

# Database (Prisma)
npm run db:generate  # Regenerate Prisma Client after schema changes
npm run db:push      # Sync schema to DB (no migration files)
npm run db:seed      # Seed database from prisma/seed.ts
npm run db:studio    # Open Prisma Studio
npm run db:reset     # Force-reset DB and reseed
```

There are no automated tests in this project.

## Stack Versions (all have breaking changes vs. common training data)

| Package | Version | Notable change |
|---|---|---|
| Next.js | 16.x | App Router only; read `node_modules/next/dist/docs/` before touching routing or server APIs |
| React | 19.x | New async patterns, `use()` hook |
| Tailwind CSS | 4.x | No `tailwind.config.js`; configured via CSS variables in `globals.css`; uses `@import "tailwindcss"` not `@tailwind` directives |
| next-auth | 5.0 beta | `auth()` replaces `getServerSession()`; exports `{ handlers, signIn, signOut, auth }` from `src/lib/auth.ts` |
| Zod | 4.x | Some schema/inference APIs changed |

## Architecture

### Route Groups
```
src/app/
  (auth)/          # Public auth pages — no session required
  (dashboard)/     # All protected routes — layout.tsx does server-side auth guard via `await auth()`
  api/             # Route handlers (REST, authenticated via `await auth()`)
  f/[slug]/        # Public lead-capture forms (embeddable)
  p/[token]/       # Public proposal sharing
```

### Data Flow
- **Server→Client:** React Server Components in layouts/pages fetch initial data or guard access
- **Client fetching:** SWR hooks in `src/hooks/` (e.g. `useLeads`, `useProposals`) call `/api/*` endpoints
- **Mutations:** Hooks expose imperative functions (`createLead`, `updateProposal`, etc.) that call `fetch()` then call SWR's `mutate()` to revalidate

### API Route Convention
Every route handler in `src/app/api/` follows this pattern:
1. `const session = await auth()` — return 401 if null
2. Parse/validate request body with a Zod schema
3. Prisma query
4. Return `NextResponse.json({ data, total, page, pageSize })` for lists, or the object directly for singles

### Auth
`src/lib/auth.ts` exports the Next-Auth v5 instance. Session strategy is JWT. User roles are `ADMIN` or `SALES_REP` (stored on the JWT and `session.user.role`). The dashboard layout (`src/app/(dashboard)/layout.tsx`) is the sole server-side auth gate — it redirects unauthenticated requests to `/login`.

### Database
PostgreSQL via Prisma. Schema at `prisma/schema.prisma`. Run `db:generate` after any schema change before using the client. JSON columns (`customFields`, `solarData`, `panelConfigs`, `yearlyBreakdown`) are used on several models for flexible data.

### External APIs
- **Google Solar API** (`src/lib/solar-api.ts`): server-side only, key `GOOGLE_SOLAR_API_KEY`. Raises typed `SolarApiError` with codes `NOT_CONFIGURED | NO_DATA | UPSTREAM_ERROR | NETWORK`.
- **Google Maps**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` for client-side map rendering; `GOOGLE_MAPS_API_KEY` for server-side static snapshots.
- **Email**: Nodemailer via SMTP env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_FROM_NAME`).

### PDF Generation
`@react-pdf/renderer` is listed in `serverExternalPackages` in `next.config.ts` so it runs server-side only and is never bundled for the client.

### Styling
Tailwind 4: all theme tokens are CSS custom properties in `src/app/globals.css`. Brand color is amber (`--brand-color: #f59e0b`). Dark mode toggled via the `class` attribute on `<html>` (next-themes). Do not add a `tailwind.config.js` — it is not used.
