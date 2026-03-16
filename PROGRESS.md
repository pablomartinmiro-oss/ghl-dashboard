# GHL Dashboard — Build Progress

## Current Status
- **Phase:** PHASE P COMPLETE — Full Feature Completion
- **Step:** All phases A-P complete (contact edit, kanban DnD, conversation assignment, opp modal, pagination, CSV import)
- **Live URL:** https://crm-dash-prod.up.railway.app
- **Last deployed commit:** f78b7f9 (2026-03-16)
- **Next:** Deploy to Railway, connect real GHL sub-account
- **Date:** 2026-03-16

## What the App Does Today

A fully functional multi-tenant CRM dashboard for Skicenter ski travel agencies, built on GoHighLevel:

1. **Auth & Multi-Tenant** — Register new companies, invite team members, 4 RBAC roles (Owner, Manager, Sales Rep, VA/Admin)
2. **Dashboard** — Stats cards (contacts, pipeline value, conversations), recent activity feed. Shows live GHL data when in live mode.
3. **Contacts** — Searchable table with source/tag filters, detail page with inline editing + notes + delete. Live mode reads from synced cache.
4. **Communications** — 3-panel chat (conversation list, message thread, contact sidebar). Conversation assignment via GHL API. Full contact data in sidebar. Live mode fetches messages from GHL.
5. **Pipeline** — Kanban board with drag-and-drop stage movement (@dnd-kit), opportunity detail modal, pipeline selector, value totals. Live mode reads from synced cache.
6. **Reservations** — Form + list with Groupon voucher integration (AI image reader via Claude API), voucher tracking stats.
7. **Presupuestos** — Quotes module with line items and email preview.
8. **Catálogo** — Product catalog CRUD with CSV bulk import.
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

### Phase I: Smart Pricing Engine (2026-03-16) ✅

**Step 8: Schema & Types** ✅
- Product model refactored: `destination` → `station`, added `personType`, `tier`, `includesHelmet`, `pricingMatrix` (Json), `sortOrder`
- New `SeasonCalendar` model for alta/media season periods per station
- Migration: `20260316300000_pricing_engine`
- All pricing types in `src/lib/pricing/types.ts`

**Step 9: Pricing Calculator** ✅
- Server-side: `src/lib/pricing/calculator.ts` — `getSeason()` (queries DB), `calculatePrice()` (full matrix lookup)
- Client-side: `src/lib/pricing/client.ts` — pure `getProductPrice()` (no Prisma dependency), `EUR` formatter
- Separated to avoid pulling Prisma into client bundles

**Step 10: Real Skicenter Prices** ✅
- 27+ products seeded with full pricing matrices (equipment, forfaits, escuela, clases particulares, lockers, après-ski)
- Day-based matrices: `{ media: { "1": 36, "2": 60, ... }, alta: { "1": 42, ... } }`
- Private lesson matrices: `{ media: { "1h": { "1p": 70, "2p": 75, ... }, ... } }`
- 3 alta season periods (Navidades, Carnaval, Semana Santa)

**Step 11: API Routes** ✅
- `POST /api/pricing` — server-side price calculation
- `GET/POST /api/season-calendar` — season period CRUD
- `PATCH/DELETE /api/season-calendar/[id]` — individual entry management
- Product API updated with new fields (station filter, personType, tier, etc.)

**Step 12: Catálogo UI** ✅
- ProductTable: season toggle (Media/Alta), station filter, matrix-based price display
- ProductModal: station, personType, tier, includesHelmet fields
- Category badges: alquiler, escuela, clase_particular, forfait, locker, apreski

**Step 13: Presupuestos Integration** ✅
- Auto-package uses `getMatrixPrice()` for season-aware pricing
- `findByStation()` for smart product matching (prefers station match, falls back to "all")
- QuoteDetail shows season badge and passes season to auto-package
- Season auto-detected from pre-fetched calendar entries

**Step 13b: Settings UI** ✅
- SeasonCalendarCard: full CRUD for season periods, grouped by station, color-coded badges
- PriceImportCard: shell with drag-and-drop zone (Excel/CSV), "Próximamente" notice

### Phase J: Auto-Pricing & Reservation Detail (2026-03-16) ✅

**Auto-Pricing in ReservationForm** ✅
- Wired pricing engine into form: season detection, product matching, price breakdown
- Service-to-category mapping (cursillo→escuela, forfait→forfait, etc.)
- `effectivePrice` derived state pattern (useMemo, not useEffect) to avoid lint errors
- Manual price override with "restore auto price" button

**ReservationForm Split** ✅
- Split 951-line form into 4 files under 300 lines each:
  - `ReservationForm.tsx` (327 lines) — main form
  - `ParticipantsTable.tsx` (113 lines) — participants grid
  - `PriceBreakdown.tsx` (47 lines) — auto-calculated price display
  - `pricing-helpers.ts` (70 lines) — service-to-product matching

**CLAUDE.md Restructure** ✅
- Split 330-line root CLAUDE.md into 4 scoped files:
  - `CLAUDE.md` (74 lines) — project overview + non-negotiable rules
  - `src/CLAUDE.md` (63 lines) — code patterns, imports, conventions
  - `src/app/api/CLAUDE.md` (67 lines) — API route patterns, GHL sync
  - `src/app/(dashboard)/CLAUDE.md` (55 lines) — design system, UI conventions

**Reservation Detail View** ✅
- `ReservationDetail.tsx` — full detail panel when clicking a reservation in the list
- Status management (confirm, cancel, mark unavailable, revert to pending)
- Client info with copy-to-clipboard, participants table, pricing summary
- Inline notes editing with save
- Notification history, linked quote display
- Page toggles between create form and detail view based on selection

**Enhanced PATCH API** ✅
- Expanded `/api/reservations/[id]` PATCH to support all editable fields
- Allowlist pattern: status, notes, client info, station, pricing, participants, services

**Station Filter Fix** ✅
- ReservationList station filter now uses shared STATIONS constant (includes Valdesquí)

### Phase K: Dashboard & Presupuestos Enhancement (2026-03-16) ✅

**Dashboard Real Data** ✅
- Replaced hardcoded weekly chart with real daily reservation volume from stats API
- Added reservation KPIs: today's reservations, weekly revenue
- Added top station widget and source revenue breakdown cards
- Recent activity now shows reservations + quotes + GHL opportunities
- Fixed destination labels to use shared STATIONS constant
- Stats API now returns `dailyVolume` (7-day breakdown) and `recentReservations` (last 5)

**QuoteDetail Split** ✅
- Split 470-line QuoteDetail into 2 files (204 + 124 lines):
  - `QuoteDetail.tsx` — header, request summary, actions
  - `PackageTable.tsx` — editable package builder table with upsells

**Quote-to-Reservation Flow** ✅
- Added "Crear Reserva" button in QuoteDetail action bar
- Uses `useCreateFromQuote` hook → navigates to /reservas after creation

**Station Labels Consolidation** ✅
- All modules now use shared `STATIONS` constant from `reservas/_components/constants.ts`
- Removed duplicate `DESTINATION_LABELS` from QuoteList, QuoteDetail, and dashboard
- All 7 stations consistent: Baqueira, Sierra Nevada, Valdesquí, La Pinilla, Grandvalira, Formigal, Alto Campoo

### Phase L: UX Polish & Fixes (2026-03-16) ✅

**Print/PDF for Quotes** ✅
- Added print button to EmailPreviewModal (printer icon next to close)
- Opens formatted HTML in new window with print-ready CSS
- Full Skicenter branding, gradient headers, styled tables
- Users can print or "Save as PDF" from browser dialog

**Client Search Autocomplete** ✅
- New `ClientSearch.tsx` component in reservas
- Searches existing reservations by client name (2+ char trigger)
- Shows dropdown with name, phone, email
- Selecting auto-fills all 3 client fields in ReservationForm

**Fix Fake Notification Timestamps** ✅
- Removed fake `emailSentAt`/`whatsappSentAt` timestamps from reservation creation
- Previously set to `new Date()` regardless of notification method
- Now `undefined` on creation — to be set when actual delivery is implemented
- Toast messages no longer falsely claim notifications were sent

**Quote Expiry Badges** ✅
- `ExpiryBadge` component in QuoteList for sent quotes
- Red "Expirado" badge when past expiry date
- Gold warning badge when ≤2 days remaining
- Subtle day count for quotes with more time

**Product Search** ✅
- Added search input to catálogo ProductTable
- Filters products by name across all categories
- Works alongside existing category and station filters

### Phase M: Feature Gaps (2026-03-16) ✅

**Quote CRUD (Create + Delete)** ✅
- `POST /api/quotes` — create new quotes with client info, trip details, services
- `DELETE /api/quotes/[id]` — cascade delete (items first, then quote)
- `useCreateQuote` and `useDeleteQuote` hooks in `useQuotes.ts`
- `QuoteForm.tsx` component: client fields, station selector, dates, pax, service checkboxes
- "Nuevo" button in presupuestos page header, right panel toggles between form and detail
- Delete button (trash icon) in QuoteDetail action bar with confirmation dialog

**CSV Export for Reservations** ✅
- Download button in ReservationList footer exports filtered results
- UTF-8 BOM for Excel compatibility, proper CSV escaping
- Columns: Nombre, Teléfono, Email, Estación, Fecha, Estado, Origen, Precio, Cupón
- Filename: `reservas-YYYY-MM-DD.csv`

**Editable Fields in ReservationDetail** ✅
- Split into `ReservationDetail.tsx` (120 lines) + `DetailSections.tsx` (220 lines)
- Inline editing for client info (name, phone, email) with save/cancel
- Inline editing for details (station dropdown, date picker, schedule dropdown)
- Notes editing preserved from previous implementation
- All edits use existing `useUpdateReservation` → PATCH endpoint

**Custom Date Range Filter** ✅
- "Rango" button alongside preset date filters (Hoy, Mañana, Semana, Mes, Todas)
- Shows two date inputs (from/to) when selected
- Filters `activityDate` within the custom range

### Phase N: Security & Polish (2026-03-16) ✅

**Permission Checks on All Local CRUD Routes** ✅
- Added `hasPermission()` to 12 API routes (products, quotes, reservations + sub-routes)
- Products: `reservations:view` (GET), `reservations:edit` (POST/PATCH/DELETE)
- Quotes: `reservations:view` (GET), `reservations:create` (POST), `reservations:edit` (PATCH/DELETE)
- Reservations: `reservations:view` (GET/stats), `reservations:create` (POST), `reservations:edit` (PATCH/DELETE)

**Delete Reservation** ✅
- `DELETE /api/reservations/[id]` endpoint with tenant scoping + permission check
- `useDeleteReservation` hook with query invalidation
- "Eliminar" button in ReservationDetail with confirmation dialog

**Empty States** ✅
- ProductTable shows empty state when no products match filters

**Real Team Data in AssignDropdown** ✅
- Replaced hardcoded mock team members with `useTeam()` hook
- Dropdown now shows actual team members from `/api/settings/team`

### Phase O: Contact Edit & Kanban DnD (2026-03-16) ✅

**Contact Editing UI** ✅
- `useUpdateContact` + `useDeleteContact` hooks in `useGHL.ts`
- Inline editing in ContactInfo: name, email, phone with save/cancel
- Delete button in contact detail page with confirmation dialog
- Permission-gated: edit requires `contacts:edit`, delete requires `contacts:delete`

**Kanban Drag-and-Drop** ✅
- `useMoveOpportunity` hook → PUT `/api/crm/opportunities/[id]`
- Pipeline page wrapped with `DndContext` + `DragOverlay` (@dnd-kit v6)
- KanbanColumn: droppable zones with coral ring highlight + "Soltar aquí" placeholder
- KanbanCard: draggable cards with grab cursor, drag overlay with rotation
- PointerSensor with 8px distance activation constraint

### Phase P: Full Feature Completion (2026-03-16) ✅

**Conversation Assignment** ✅
- `PUT /api/crm/conversations/[id]/assign` endpoint with `comms:assign` permission
- `updateConversation()` method added to GHLClient class
- `useAssignConversation` hook with query invalidation
- Comms page wired: AssignDropdown now calls real API instead of just toast
- Live mode: extracts `assignedTo` from raw GHL data (was hardcoded null)
- Full contact data now loaded in comms sidebar via `useContact(contactId)`

**Opportunity Detail Modal** ✅
- `OpportunityModal` component: name, value, status, stage, contact, dates
- Click on KanbanCard opens modal (doesn't conflict with drag via 8px threshold)
- Status badges: Abierta (sage), Ganada (coral), Perdida (muted-red), Abandonada (gray)

**API Pagination** ✅
- Conversations API: `page` + `limit` query params, `meta` response with totalPages
- Opportunities API: `page` + `limit` query params, `meta` response with totalPages
- Both with `skip`/`take` + `count` for proper pagination metadata

**CSV Price Import** ✅
- Replaced "próximamente" shell with full CSV import functionality
- Client-side CSV parser: handles nombre, categoría, estación, precio, tipo_precio columns
- Preview table showing parsed rows before import (max 20 visible, count for rest)
- `POST /api/products/bulk-import` endpoint: upserts by name (update existing, create new)
- Max 500 products per import, tenant-scoped

## DB Migrations
1. `init` — Core models (Tenant, User, Role, Reservation, etc.)
2. `20260316100000_phase2_auth_voucher_datamode` — Auth fields, voucher fields, dataMode, GrouponProductMapping
3. `20260316200000_ghl_cache_sync` — Cache tables, SyncQueue, SyncStatus
4. `20260316300000_pricing_engine` — Product refactor (destination→station, new fields), SeasonCalendar table

## Known Issues
- No Postgres running locally — need `docker-compose up db redis` before migrations
- ANTHROPIC_API_KEY must be set on Railway for voucher reader to work
- Voucher section only visible when "CUPÓN GROUPON" source is selected
- Cron endpoint (`/api/cron/sync`) needs Railway cron job configured (every 5 min)

## Pending Work
- **Connect real GHL sub-account** via OAuth flow and test end-to-end live sync
- **Set up Railway cron** for `/api/cron/sync` (every 5 minutes)
- **Test webhook delivery** — register webhook URL in GHL marketplace app settings
- **Email/WhatsApp delivery** — integrate Resend (email) + Twilio (WhatsApp) for real notifications
- **Deploy latest** — commits after f78b7f9 not yet deployed to Railway

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

### Phase P Final Audit (Full Feature Completion) — Latest
- ✅ Type Check: 0 errors
- ✅ Lint: 0 errors, 3 warnings (pre-existing underscore-prefixed vars)
- ✅ Build: compiled clean (48+ routes)

### Phase N Audit (Security & Polish)
- ✅ Type Check: 0 errors
- ✅ Lint: 0 errors, 3 warnings (pre-existing underscore-prefixed vars)
- ✅ Build: compiled clean (45+ routes)
- ✅ Security: all API routes now have auth + permissions + tenant scoping

### Phase M Audit (Feature Gaps)
- ✅ Type Check: 0 errors
- ✅ Lint: 0 errors, 3 warnings
- ✅ Build: compiled clean

### Phase H Audit (GHL Live Sync)
- ✅ Type Check: 0 errors
- ✅ Lint: 0 errors, 3 warnings
- ✅ Build: compiled clean
- ✅ Deployed: commit f78b7f9

### Previous Audits (all passed)
- Phase A: 17 tests, 0 type/lint errors, build clean
- Phase B: 34 tests, 0 type/lint errors, build clean
- Phase C: 34 tests, 0 type/lint errors, build clean
- Phase D: 34 tests, 0 type/lint errors, build clean
- Phase E: 34 tests, 0 type/lint errors, build clean
- Phase G (Phase 2): 0 type/lint errors, build clean, deployed ce6f718
