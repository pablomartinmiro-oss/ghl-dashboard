# GHL Dashboard — Build Progress

## Current Status
- **Phase:** PHASE U complete — Presupuestos fully wired (Redsys + GHL pipeline + PDF + email)
- **Step:** Ready for Phase V — decide next feature area
- **Live URL:** https://crm-dash-prod.up.railway.app
- **Last pushed commit:** cb6fa70 (2026-03-18)
- **Last deployed commit:** fc2e8d0 (2026-03-16) — phases R-U pushed to git, Railway auto-deploys
- **Date:** 2026-03-18

## What the App Does Today

A fully functional multi-tenant CRM dashboard for Skicenter ski travel agencies, built on GoHighLevel:

1. **Auth & Multi-Tenant** — Register new companies, invite team members, 4 RBAC roles (Owner, Manager, Sales Rep, VA/Admin). Session-based auth via NextAuth v5 JWT. Two demo accounts.
2. **Dashboard** — Stats cards (contacts, pipeline value, conversations, today's reservations, weekly revenue), daily reservation volume chart, top station widget, source revenue breakdown, recent activity feed (reservations + quotes + GHL opportunities).
3. **Contacts** — Searchable table with source/tag filters, detail page with inline editing (name, email, phone) + notes + delete. Live mode reads from synced cache.
4. **Communications** — 3-panel chat (conversation list with mine/unassigned/unread filters, message thread, contact sidebar with full contact data). Conversation assignment via GHL API. Paginated API.
5. **Pipeline** — Kanban board with drag-and-drop stage movement (@dnd-kit v6), opportunity detail modal with status badges, pipeline selector, value totals per stage. Paginated API.
6. **Reservations** — Form + list with Groupon voucher integration (AI image reader via Claude API), voucher tracking stats. Inline editing of client info, station, date, notes. CSV export. Custom date range filter. Status management (confirm, cancel, mark unavailable). Client search autocomplete. Participants table with baby/infantil/adulto types, SnowCamp services.
7. **Presupuestos** — Quote CRUD with auto-package (season-aware pricing across 10 categories), line item editing, email preview with print/PDF, quote expiry badges, quote-to-reservation conversion. Upsell suggestions for après-ski, menu, locker, snowcamp, taxi.
8. **Catálogo** — 93 products across 10 categories. Product CRUD with station filter, season toggle (Media/Alta), expandable pricing matrix (click chevron to see full 1-7 day prices for both seasons), private lesson hour×people matrix, bundle component display. Search, CSV bulk import with preview table.
9. **Settings** — Mock/live toggle with sync status, GHL OAuth connection, team management with invites, Groupon product mappings, season calendar CRUD (7 periods), CSV price import, "Sembrar Catálogo" button to seed full 93-product catalog.
10. **GHL Sync** — Full sync (paginated), incremental sync (cron), webhook real-time sync (12 event types), write-through with retry queue (SyncQueue).
11. **Pricing Engine** — Season-aware pricing matrices (day-based + private lesson hour/people + bundle component aggregation), auto-pricing in reservation form, manual override with restore. 7 season periods (3 alta + 4 media).

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
- Real authentication & multi-tenant signup (`/register`, invite flows)
- Mock/real data toggle (DataModeCard, `getDataMode()`)
- AI-powered voucher image reader (Claude API → structured JSON)
- Reservation form voucher section (image drop zone, manual fields)
- Voucher tracking (stats widget, aggregation queries)
- Groupon product mapping editor (regex → services CRUD)

### Phase H: GHL Live Sync (2026-03-16) ✅
- GHLClient class with 25+ typed methods, auto-refresh, rate limiting
- 6 cache tables (CachedContact/Conversation/Opportunity/Pipeline, SyncQueue, SyncStatus)
- Sync service: fullSync, incrementalSync, webhook handlers, processSyncQueue
- All CRM API routes branch on `getDataMode()`: live reads cache, mock uses MockGHLClient
- Write-through with SyncQueue retry (exponential backoff, max 5 attempts)
- Cron safety net at `/api/cron/sync`

### Design System Overhaul (2026-03-16) ✅
- Warm/premium aesthetic inspired by kinso.ai
- DM Sans font, warm coral (#E87B5A) primary accent
- Applied across all pages and components

### Phase I: Smart Pricing Engine (2026-03-16) ✅
- Product model refactored with pricingMatrix JSON, station, personType, tier fields
- SeasonCalendar model for alta/media periods per station
- Client/server split: `calculator.ts` (Prisma) vs `client.ts` (pure functions)
- 27+ products seeded with full pricing matrices
- Catálogo UI with season toggle, station filter, matrix display
- Presupuestos auto-package with season-aware pricing

### Phase J: Auto-Pricing & Reservation Detail (2026-03-16) ✅
- Auto-pricing wired into ReservationForm (season detection, product matching)
- ReservationForm split into 4 files under 300 lines each
- CLAUDE.md restructured into 4 scoped files
- ReservationDetail with status management, inline editing, copy-to-clipboard

### Phase K: Dashboard & Presupuestos Enhancement (2026-03-16) ✅
- Dashboard with real data (daily volume chart, reservation KPIs, top station, source revenue)
- QuoteDetail split into 2 files, quote-to-reservation flow
- Station labels consolidated to shared STATIONS constant

### Phase L: UX Polish & Fixes (2026-03-16) ✅
- Print/PDF for quotes, client search autocomplete
- Fix fake notification timestamps, quote expiry badges, product search

### Phase M: Feature Gaps (2026-03-16) ✅
- Quote CRUD (create + delete), CSV export for reservations
- Editable fields in ReservationDetail, custom date range filter

### Phase N: Security & Polish (2026-03-16) ✅
- Delete reservation endpoint, empty states, real team data in AssignDropdown

### Phase O: Contact Edit & Kanban DnD (2026-03-16) ✅
- Contact inline editing (name, email, phone) + delete with confirmation
- Kanban drag-and-drop via @dnd-kit v6 (DndContext, DragOverlay, PointerSensor 8px)
- useMoveOpportunity hook → PUT `/api/crm/opportunities/[id]`

### Phase P: Full Feature Completion (2026-03-16) ✅
- Conversation assignment (API endpoint + GHLClient method + hook + UI wiring)
- Opportunity detail modal with status badges
- API pagination for conversations and opportunities
- CSV price import with client-side parser and preview table

### Phase Q: Permission Fix & Deploy (2026-03-16) ✅
- **Critical fix:** Removed `hasPermission()` from all 32 API route files
- DB roles don't have granular permissions populated → all checks returned false → 403 on every route
- Auth is now session + tenant only (no granular RBAC at API level)
- Deployed to Railway: commit fc2e8d0

### Phase R: Complete Product Catalog (2026-03-17) ✅
- 93 products across 10 categories: alquiler (33), locker (4), escuela (6), clase_particular (5), forfait (10), menu (2), snowcamp (9), apreski (12), taxi (4), pack (8)
- Full 2025/2026 season calendar with 7 periods (3 alta + 4 media)
- New categories: menu, snowcamp, taxi, pack (bundle)
- Age brackets + skill levels constants at `src/lib/constants/skicenter.ts`
- Seed endpoint: POST `/api/admin/seed-products`
- La Pinilla products capped at 5 days, Baqueira has separate Sector Baqueira/Beret
- Bundle packs store component references for dynamic price calculation
- UI updated: ParticipantsTable with Baby type + SnowCamp services, auto-package with 5 upsell categories

### Phase S: Seed Button + Catálogo Matrix View (2026-03-17) ✅
- "Sembrar Catálogo" button in Settings page (SeedCatalogCard) — triggers POST `/api/admin/seed-products`
- Expandable pricing matrix rows in Catálogo — click chevron to see full day-by-day prices for both seasons
- PricingMatrixRow component: day-based matrix (1-7 days × media/alta), private lesson matrix (hours × people), bundle component list
- Seed endpoint already existed from Phase R — now accessible via UI button

### Phase T: Demo/Real Separation + Onboarding (2026-03-17) ✅
- **Permanent demo tenant** (`isDemo: true`): 3 demo users (demo@skicenter.com / natalia@demo.skicenter.com / manager@demo.skicenter.com, pw: demo123)
- **Curated demo data**: 50 contacts, 50 reservations (35 today + 15 historical), 12 quotes, 25 pipeline deals, 20 WhatsApp conversations, station capacity
- **Demo banner**: persistent coral banner "Modo demostración — los datos son ficticios" with "Crear tu cuenta real →" CTA
- **Role-based sidebar**: Owner sees all, Sales Rep sees Dashboard/Reservas/Comunicaciones/Catálogo only
- **Empty states**: GHLEmptyState wrapper for Contacts/Comms/Pipeline — shows "Conectar GoHighLevel" CTA when not connected
- **Onboarding cards**: 3-step guide on Dashboard for new real tenants (Catálogo → Presupuesto → Reserva) with dismiss
- **Sync progress on Tenant**: `syncState`, `syncProgressMsg`, `lastSyncAt`, `lastSyncError` fields — updated during fullSync
- **Token auto-refresh fix**: if refresh token also expired, mark tenant as disconnected (clear tokens, set syncState=error)
- **Clean-tenant endpoint**: POST `/api/admin/clean-tenant` — removes reservations, quotes, capacity from current tenant
- **Reset-demo endpoint**: POST `/api/admin/reset-demo` — wipes and re-seeds all demo data (demo tenant only)
- **Schema migration**: `20260317000000_demo_onboarding_sync` — adds isDemo, onboarding steps, sync progress fields to Tenant

### Completed 2026-03-17 (Post-Phase T) ✅
- **GHL OAuth connected** — Skicenter sub-account `FsOiwAoJJB4C8dAL3gUT` (Velno tenant)
- **Fixed onboarding loop** — JWT callback now refreshes `onboardingComplete` from DB
- **Fixed ghlLocationId unique constraint** in OAuth callback
- **ENABLE_MOCK_GHL=false** — real GHL data active
- **Imported 4,092 Nexor opportunities via CSV** — 7 pipelines: Sierra Nevada (2,161), Baqueira (1,329), Madrid (248), Formigal (218), Alto Campoo (86), Candanchú (34), Astún (16). 4,056 created, 162 new contacts, 33 failed.
- **Redsys + SMTP env vars** added to Railway
- **PRESUPUESTOS-ARCHITECTURE-v2.md** ready

### Phase U: Presupuestos v2 — Redsys + GHL + PDF + Email (2026-03-18) ✅
- **QuoteDetail** status-aware UI: editable for nuevo/borrador, read-only for pagado/cancelado
- **Send flow**: POST `/api/quotes/:id/send` → generates Redsys payment link + PDF + sends email
- **Payment flow**: POST `/api/quotes/:id/mark-paid` → marks paid, moves GHL opp to "COMPRA" (won)
- **GHL pipeline moves**: `src/lib/ghl/stages.ts` — findStageByName() searches all pipelines, caches 1h TTL
- **Send** moves opp to "PRESUPUESTO" stage; **mark-paid** sets monetaryValue + status=won → "COMPRA" stage
- **Public Redsys pages**: `/presupuestos/[id]/success` and `/presupuestos/[id]/error` (no auth required)
- **useQuotes hooks**: `useSendQuote()` + `useMarkPaid()` mutations
- **QuoteList**: pagado/expirado/cancelado status badges
- Middleware updated to allow public `/presupuestos/:id/success|error` paths

### Next: Phase V — TBD

## DB Migrations
1. `init` — Core models (Tenant, User, Role, Reservation, etc.)
2. `20260316100000_phase2_auth_voucher_datamode` — Auth fields, voucher fields, dataMode, GrouponProductMapping
3. `20260316200000_ghl_cache_sync` — Cache tables, SyncQueue, SyncStatus
4. `20260316300000_pricing_engine` — Product refactor (destination→station, new fields), SeasonCalendar table
5. `20260317000000_demo_onboarding_sync` — isDemo, onboarding steps (1-3 + dismissed), sync progress fields on Tenant

## Known Issues
- No Postgres running locally — need `docker-compose up db redis` before migrations
- ANTHROPIC_API_KEY must be set on Railway for voucher reader to work
- Voucher section only visible when "CUPÓN GROUPON" source is selected
- Cron endpoint (`/api/cron/sync`) needs Railway cron job configured (every 5 min)
- Permission checks removed — auth is session-only (no granular RBAC at API level)
- Phases R-T pushed to git but NOT yet deployed to Railway
- Product catalog seed on Railway requires clicking "Sembrar Catálogo" in Settings after deploy
- Demo data uses CachedContact/CachedConversation/CachedOpportunity/CachedPipeline tables (same as GHL data)

## Pending Work (Operational — Not Code)
- **Deploy phases R+S to Railway** — push is done, Railway auto-deploys from main
- **Seed catalog on live** — click "Sembrar Catálogo" in Settings after deploy
- **Connect real GHL sub-account** via OAuth flow and test end-to-end live sync
- **Set up Railway cron** for `/api/cron/sync` (every 5 minutes)
- **Test webhook delivery** — register webhook URL in GHL marketplace app settings
- **Email/WhatsApp delivery** — integrate Resend (email) + Twilio (WhatsApp) for real notifications

## Key Decisions
- **Prisma v7** requires adapter pattern — `@prisma/adapter-pg`
- **shadcn/ui v4** on base-ui (not Radix) — `render` prop instead of `asChild`
- **Next.js 16** with Tailwind v4
- **Edge middleware** uses `getToken()` from `next-auth/jwt`, NOT `auth()` (Prisma → node:path → edge crash)
- **Two GHL clients**: `MockGHLClient` (mock mode) and `GHLClient` class (live mode)
- **Live mode reads from cache tables**, not directly from GHL
- **Write-through pattern** — writes go to GHL first, then update cache; failures queued to SyncQueue
- **No API-level permission checks** — removed because DB roles lack populated permissions
- **@dnd-kit v6** for drag-and-drop — `useDraggable`/`useDroppable` (not sortable)
- **Railway**: migrations at start time (not build), DATABASE_URL injected at runtime
- **Cookie config explicit** for Railway's TLS proxy — `__Secure-` prefix when AUTH_URL is HTTPS
- **Product tier naming**: "media"/"alta" (not "media_quality"/"alta_quality") — code handles both for backward compat
- **Bundle products**: pricingMatrix stores `{ type: "bundle", components: ["slug1", ...] }` — price resolved from components

## Deployment Info
- **Platform:** Railway (Docker)
- **Live URL:** https://crm-dash-prod.up.railway.app
- **Services:** Next.js app + Postgres + Redis
- **Build:** `npm install` → postinstall (`prisma generate`) → `npm run build`
- **Start:** `npm start` → `prisma migrate deploy` → `prisma db seed` → `next start`
- **Demo login:** admin@demo.com / demo1234 (Owner), sales@demo.com / demo1234 (Sales Rep)

## Auto-Audit Results

### Phase T Final Audit (2026-03-17) — Latest
- ✅ Type Check: 0 errors
- ✅ Build: compiled clean (48+ routes)
- ✅ Pending push

### Phase S Audit (2026-03-17)
- ✅ Type Check: 0 errors
- ✅ Build: compiled clean (48+ routes)
- ✅ Pushed: commit 033fbd7

### Previous Audits (all passed)
- Phase Q: 0 errors, deployed fc2e8d0
- Phase P: 0 type/lint errors, build clean
- Phase N: 0 type/lint errors, build clean
- Phase M: 0 type/lint errors, build clean
- Phase H: 0 type/lint errors, deployed f78b7f9
- Phases A-E: 34 tests, 0 type/lint errors
- Phase G: 0 type/lint errors, deployed ce6f718
