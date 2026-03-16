# GHL Dashboard — Build Progress

## Current Status
- **Phase:** PHASE 3 DEPLOYED — GHL Live Sync
- **Step:** Phase 1 (25/25) + Phase 2 (6/6) + Phase 3 (10/10) — All complete & deployed
- **Live URL:** https://crm-dash-prod.up.railway.app
- **Last deployed commit:** f78b7f9 (2026-03-16)
- **Next:** Connect real GHL sub-account via OAuth flow and test end-to-end live sync
- **Date:** 2026-03-16

## What the App Does Today

A fully functional multi-tenant CRM dashboard for Skicenter ski travel agencies, built on GoHighLevel:

1. **Auth & Multi-Tenant** — Register new companies, invite team members, 4 RBAC roles (Owner, Manager, Sales Rep, VA/Admin)
2. **Dashboard** — Stats cards (contacts, pipeline value, conversations), recent activity feed. Shows live GHL data when in live mode.
3. **Contacts** — Searchable table with source/tag filters, detail page with notes. Live mode reads from synced cache.
4. **Communications** — 3-panel chat (conversation list, message thread, contact sidebar). Live mode fetches messages from GHL.
5. **Pipeline** — Kanban board with drag-and-drop, pipeline selector, value totals. Live mode reads from synced cache.
6. **Reservations** — Form + list with Groupon voucher integration (AI image reader via Claude API), voucher tracking stats.
7. **Presupuestos** — Quotes module with line items and email preview.
8. **Catálogo** — Product catalog CRUD.
9. **Settings** — Mock/live toggle, GHL connection, team management, Groupon product mappings, sync status.
10. **GHL Sync** — Full sync, incremental sync, webhook real-time sync, write-through with retry queue.

## Completed Phases

### Phase A: Foundation (Steps 1-8) ✅
1. ✅ Scaffold — Next.js 16, TypeScript, Tailwind v4, App Router
2. ✅ Dependencies — shadcn/ui with 13 components (sonner for toasts)
3. ✅ Environment validation — `src/lib/env.ts` with Zod schema
4. ✅ Logger — pino + child loggers
5. ✅ Prisma setup — v7 with `@prisma/adapter-pg`
6. ✅ Encryption — AES-256-GCM for token storage
7. ✅ Redis client — cache-aside pattern
8. ✅ Testing setup — vitest, 17 tests

### Phase B: Auth & GHL Integration (Steps 9-13) ✅
9. ✅ NextAuth v5 — credentials + JWT strategy
10. ✅ RBAC — permissions.ts, RoleGate, usePermissions
11. ✅ Middleware — edge-compatible JWT check
12. ✅ GHL client — axios + mock server (20 contacts, 10 convos, 15 opps)
13. ✅ GHL OAuth — authorize + callback with encrypted tokens

### Phase C: Layout & Onboarding (Steps 14-15) ✅
14. ✅ Layout shell — Sidebar, Topbar, MobileNav, ErrorBoundary, skeletons
15. ✅ Onboarding wizard — 4-step flow, middleware redirects

### Phase D: Modules (Steps 16-19) ✅
16. ✅ Comms — 3-panel chat layout
17. ✅ Contacts — table + detail + notes
18. ✅ Pipeline — Kanban board
19. ✅ Dashboard home — stats + activity

### Phase E: Polish (Steps 20-25) ✅
20. ✅ Settings page — tenant info, GHL status, team table
21. ✅ Team management — role dropdown, invites
22. ✅ GHL webhooks — HMAC verification, cache invalidation
23. ✅ Error boundaries — per-route error.tsx
24. ✅ Loading states — skeletons + optimistic updates
25. ✅ Final audit

### Phase F: Railway Deployment (2026-03-13) ✅
26-34. ✅ Prisma postinstall, route rename to /api/crm/*, trustHost, AUTH_URL/SECRET, migrate in start, adapter-pg seed, tsx prod dep, prisma.config.ts seed, session cookie fix

### Phase G: Phase 2 Features (2026-03-16) ✅

**Feature 1: Real Authentication & Multi-Tenant Signup** ✅
- `/register` page with new tenant + invite flows
- Registration API with bcrypt, slug generation, invite token validation
- Team invite API with 7-day expiry tokens

**Feature 2: Mock/Real Data Toggle** ✅
- DataModeCard component with toggle
- `getDataMode()` utility
- Prevents live without GHL OAuth tokens

**Feature 3: AI-Powered Voucher Image Reader** ✅
- POST /api/voucher/read → Claude API (claude-sonnet-4-20250514)
- Returns structured JSON: producto, códigos, precios, servicios
- Auto-fills reservation form

**Feature 4: Reservation Form Voucher Section** ✅
- Image drop zone with drag & drop
- Manual input fields + copy buttons
- "VALIDAR EN GROUPON" button + mandatory redemption checkbox

**Feature 5: Voucher Tracking** ✅
- VoucherStats widget: pendientes, canjeados, ingresos, expiring alerts
- Voucher stats API with aggregation queries

**Feature 6: Groupon Product Mapping Editor** ✅
- CRUD table for regex → services mappings
- Team invite card with URL copy

### Phase H: GHL Live Sync (2026-03-16) ✅

**Step 1: GHLClient Class** ✅
- `src/lib/ghl/api.ts` — Typed class with 25+ methods (contacts, conversations, pipelines, opportunities, custom fields, calendars, forms, tags)
- Auto-refresh on 401, exponential backoff on 429/5xx
- `getGHLClient(tenantId)` factory reads encrypted tokens from DB

**Step 2: GHL Types** ✅
- Expanded `src/lib/ghl/types.ts` with all CRUD types + webhook types

**Step 3: Cache Tables** ✅
- 6 new Prisma models: CachedContact, CachedConversation, CachedOpportunity, CachedPipeline, SyncQueue, SyncStatus
- Migration: `20260316200000_ghl_cache_sync`

**Step 4: Sync Service** ✅
- `src/lib/ghl/sync.ts` — fullSync (paginated), incrementalSync, webhook cache handlers, processSyncQueue

**Step 5: Updated API Routes** ✅
- All CRM routes branch on `getDataMode()`: live reads from cache, writes through GHL
- New: `/api/dashboard/stats`, `/api/crm/opportunities/[id]` PUT

**Step 6: Two-Way Sync + SyncQueue** ✅
- Failed GHL writes queued with exponential backoff retry

**Step 7: Webhook Cache Updates** ✅
- Webhook handler rewritten for real-time cache upserts (12 event types)

**Step 8: Mock/Real Toggle Wired** ✅
- PATCH /api/settings/tenant triggers fullSync() on first switch to live
- DataModeCard shows sync status + manual sync button

**Step 9: Cron Safety Net** ✅
- `/api/cron/sync` processes SyncQueue + runs incrementalSync for live tenants

**Step 10: Dashboard Stats** ✅
- Live stats from cached data (contacts, pipeline value, conversations)

### Design System Overhaul (2026-03-16) ✅
- Warm/premium aesthetic inspired by kinso.ai
- DM Sans font, warm coral (#E87B5A) primary accent
- Applied across all pages and components

## DB Migrations
1. `init` — Core models (Tenant, User, Role, Reservation, etc.)
2. `20260316100000_phase2_auth_voucher_datamode` — Auth fields, voucher fields, dataMode, GrouponProductMapping
3. `20260316200000_ghl_cache_sync` — Cache tables, SyncQueue, SyncStatus

## Known Issues
- No Postgres running locally — need `docker-compose up db redis` before migrations
- ANTHROPIC_API_KEY must be set on Railway for voucher reader to work
- Voucher section only visible when "CUPÓN GROUPON" source is selected
- Cron endpoint (`/api/cron/sync`) needs Railway cron job configured (every 5 min)

## Pending Work
- **Connect real GHL sub-account** via OAuth flow and test end-to-end live sync
- **Set up Railway cron** for `/api/cron/sync` (every 5 minutes)
- **Test webhook delivery** — register webhook URL in GHL marketplace app settings

## Key Decisions
- **Prisma v7** requires adapter pattern — `@prisma/adapter-pg`
- **shadcn/ui v4** on base-ui (not Radix) — `render` prop instead of `asChild`
- **Next.js 16** with Tailwind v4
- **Edge middleware** uses `getToken()` from `next-auth/jwt`, NOT `auth()` (Prisma → node:path → edge crash)
- **Two GHL clients**: `MockGHLClient` (mock mode, axios-style) and `GHLClient` class (live mode, typed methods)
- **Live mode reads from cache tables**, not directly from GHL — fast reads, webhook-synced
- **Write-through pattern** — writes go to GHL first, then update cache; failures queued to SyncQueue
- **Cron as public route** — `/api/cron/sync` in PUBLIC_ROUTES, intended for external cron trigger
- **Railway**: migrations at start time (not build), DATABASE_URL injected at runtime
- **Cookie config explicit** for Railway's TLS proxy — `__Secure-` prefix when AUTH_URL is HTTPS

## Deployment Info
- **Platform:** Railway (Docker)
- **Live URL:** https://crm-dash-prod.up.railway.app
- **Services:** Next.js app + Postgres + Redis
- **Build:** `npm install` → postinstall (`prisma generate`) → `npm run build`
- **Start:** `npm start` → `prisma migrate deploy` → `prisma db seed` → `next start`
- **Demo login:** admin@demo.com / demo1234 (Owner), sales@demo.com / demo1234 (Sales Rep)

## Auto-Audit Results

### Phase H Final Audit (GHL Live Sync) — Latest
- ✅ Type Check: 0 errors
- ✅ Lint: 0 errors, 3 warnings (underscore-prefixed destructured vars)
- ✅ Build: compiled clean (45+ routes)
- ✅ Security: all API routes have auth + permissions + tenant scoping
- ✅ Deployed: commit f78b7f9

### Previous Audits (all passed)
- Phase A: 17 tests, 0 type/lint errors, build clean
- Phase B: 34 tests, 0 type/lint errors, build clean
- Phase C: 34 tests, 0 type/lint errors, build clean
- Phase D: 34 tests, 0 type/lint errors, build clean
- Phase E: 34 tests, 0 type/lint errors, build clean
- Phase G (Phase 2): 0 type/lint errors, build clean, deployed ce6f718
