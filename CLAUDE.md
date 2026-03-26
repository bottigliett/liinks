# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start Next.js dev server
- `npm run build` — Production build
- `npm run lint` — ESLint
- No test framework configured

## Architecture

**Liinks** — A multi-client personal branding page builder (like Linktree). Built on Next.js 14 App Router with TypeScript strict mode.

### Core flow
- **Admin panel** at `/mismo/` (protected by NextAuth) — manage clients, widgets, analytics, API keys
- **Public pages** at `/[slug]/` — each client gets a customizable bento-grid page with widgets
- **Templates** in `lib/brands.ts` — pre-built client configs for Tecnocasa, Tecnorete, Industriale agencies

### Data layer
- **MySQL 8+** via `mysql2/promise` (raw SQL, no ORM)
- Database name: `liinks` (via `DB_NAME` env var)
- `lib/db.ts` — connection pool + auto-creates tables on first query
- `lib/data.ts` — all data access functions (clients, widgets CRUD)
- `lib/analytics-db.ts` — analytics event queries
- `lib/api-keys.ts` — API key hashing/verification (bcryptjs)
- Tables: `admins`, `clients`, `widgets`, `events`, `api_keys`

### Auth
- NextAuth 4 with CredentialsProvider (email/password), JWT sessions (24h)
- Roles: `admin`, `superadmin` — superadmin can manage users at `/mismo/users`
- Config in `lib/auth.ts`

### Key directories
- `app/api/` — API routes (clients CRUD, analytics tracking, upload, CRM endpoints)
- `app/mismo/` — Admin panel pages
- `app/[slug]/` — Public client page with `bento-page.tsx` rendering the widget grid
- `components/admin/` — Admin UI components (interactive-preview, rich-bio-editor)
- `lib/` — Database, auth, types, utilities, brand templates
- `public/brands/` — Brand logos for widget icons
- `public/uploads/` — User-uploaded images

### Widget system
Four widget types: `link`, `social`, `text`, `map`. Each has a `size` (small/medium/wide/large) rendered in a CSS bento grid. Widgets are drag-drop reorderable via `@dnd-kit`.

### Styling
- Tailwind CSS 3.4 with class-based dark mode
- Each client has a `ClientStyle` object controlling colors, border radius, card style (flat/shadow/outline/brutal), grid gap, etc.
- UI language is Italian

## Environment Variables

Required in `.env.local`:
```
NEXTAUTH_SECRET, NEXTAUTH_URL
ADMIN_EMAIL, ADMIN_PASSWORD
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
```

## Key patterns

- Path alias: `@/*` maps to project root
- `lib/types.ts` defines `Client`, `Widget`, `ClientStyle` interfaces
- HTML bio content is sanitized with `sanitize-html` (allowed tags defined in the API route)
- Image uploads validated for type/size (max 5MB), stored in `public/uploads/`
- CRM API routes (`/api/crm/*`) use Bearer token auth via API keys
