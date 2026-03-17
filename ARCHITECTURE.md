# GHL Dashboard — Architecture Patterns

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        RAILWAY PLATFORM                         │
│                                                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  Next.js 16  │───▶│  PostgreSQL   │    │      Redis       │   │
│  │  App Router  │    │  (Prisma v7)  │    │  (Cache-aside)   │   │
│  │              │───▶│              │    │                  │   │
│  └──────┬───────┘    └──────────────┘    └──────────────────┘   │
│         │                                                       │
└─────────┼───────────────────────────────────────────────────────┘
          │
          │ HTTPS
          │
    ┌─────┴──────────────────────────────────┐
    │           EXTERNAL SERVICES             │
    │                                         │
    │  ┌───────────────┐  ┌───────────────┐  │
    │  │  GoHighLevel   │  │  Claude API   │  │
    │  │  API v2        │  │  (Anthropic)  │  │
    │  │  - Contacts    │  │  - Voucher    │  │
    │  │  - Convos      │  │    image OCR  │  │
    │  │  - Pipelines   │  │              │  │
    │  │  - Opps        │  │              │  │
    │  │  - OAuth       │  │              │  │
    │  │  - Webhooks    │  │              │  │
    │  └───────────────┘  └───────────────┘  │
    └─────────────────────────────────────────┘
```

## Request Flow

```
Browser → Middleware (JWT check via getToken()) → Next.js Route
  │
  ├── (auth) routes: /login, /register — no auth required
  │
  ├── (dashboard) routes: /, /reservas, /settings, etc.
  │   └── Layout wraps with SessionProvider + QueryClientProvider
  │
  └── API routes (session + tenant auth, NO permission checks):
      ├── /api/auth/*              — NextAuth handlers
      ├── /api/crm/*               — GHL bridge (mode branch: mock vs live)
      │   ├── contacts/            — GET/POST + [id] GET/PUT/DELETE + [id]/notes GET/POST
      │   ├── conversations/       — GET (paginated) + [id]/messages GET/POST + [id]/assign PUT
      │   ├── pipelines/           — GET
      │   ├── opportunities/       — GET (paginated) + [id] PUT
      │   ├── oauth/               — authorize + callback (public)
      │   └── webhooks/            — POST (HMAC verified, updates cache)
      ├── /api/admin/ghl/*         — Admin sync tools (full-sync, sync-status, test, create-fields)
      ├── /api/admin/seed-products — POST seed full 93-product catalog + season calendar
      ├── /api/cron/sync           — Background sync (public, for external cron)
      ├── /api/dashboard/stats     — Cached stats for dashboard
      ├── /api/pricing             — POST price calculation (season-aware matrix lookup)
      ├── /api/season-calendar/*   — Season period CRUD
      ├── /api/products/*          — Product catalog CRUD + bulk-import
      ├── /api/quotes/*            — Quote CRUD + [id]/items
      ├── /api/reservations/*      — Reservation CRUD + stats + voucher-stats + capacity + duplicate + from-quote
      ├── /api/voucher/read        — Claude API (image → structured JSON)
      ├── /api/settings/*          — Tenant + team + team/[userId]/role + team/invite + groupon-mappings
      ├── /api/onboarding/*        — Complete + invite + roles + team
      └── /api/health              — Public health check
```

## Multi-Tenant Architecture

```
Tenant (company)
  ├── Users (team members, each with Role)
  ├── Roles (Owner, Manager, Sales Rep, VA/Admin — with permissions array)
  ├── ModuleConfigs (per-module settings)
  ├── Reservations (with voucher tracking fields)
  ├── Quotes + QuoteItems
  ├── Products (catalog, with pricingMatrix JSON for season-aware pricing)
  ├── SeasonCalendar (alta/media season periods per station)
  ├── GrouponProductMappings (regex → services mapping)
  ├── StationCapacity (per station/date)
  ├── Notifications
  ├── GHL Connection (encrypted OAuth tokens, locationId)
  ├── CachedContacts (synced from GHL)
  ├── CachedConversations (synced from GHL, assignedTo in raw JSON)
  ├── CachedOpportunities (synced from GHL)
  ├── CachedPipelines (synced from GHL)
  ├── SyncStatus (last sync times, counts, in-progress flag)
  └── SyncQueue (failed write retries with exponential backoff)
```

**Every query includes `WHERE tenantId = ?`** — enforced at the API route level.

## Authentication & Authorization

### Auth Flow
- NextAuth v5 with credentials provider + JWT strategy
- Session: `{ id, email, name, tenantId, roleId, roleName, permissions, onboardingComplete }`
- Edge middleware uses `getToken()` from `next-auth/jwt` — NOT `auth()` (Prisma → node:path → edge crash)
- Cookie: `__Secure-authjs.session-token` (HTTPS) or `authjs.session-token` (HTTP)

### Registration
- `POST /api/auth/register` — two paths:
  - **New tenant**: creates Tenant + 4 Roles + User (Owner) + ModuleConfigs in transaction
  - **Invite join**: validates invite token, updates placeholder user, assigns Sales Rep role
- After registration: auto-login via `signIn("credentials")` → redirect

### Authorization
- **API level:** Session + tenant check only. `hasPermission()` was removed from all 32 API routes because DB roles don't have populated permissions.
- **UI level:** `RoleGate` component + `usePermissions()` hook still gate UI elements client-side.
- Public routes: `/api/auth/*`, `/api/health`, `/api/crm/webhooks`, `/api/crm/oauth/*`, `/api/cron/sync`

## Database Access
- Import `prisma` from `@/lib/db`
- Uses Prisma v7 with `@prisma/adapter-pg` (not direct URL)
- Generated client at `src/generated/prisma/client`
- Every query MUST include `tenantId` scope
- JSON fields: cast with `JSON.parse(JSON.stringify(obj)) as Prisma.InputJsonValue`
- Import Prisma types from `@/generated/prisma/client` (not `@/generated/prisma`)

## Caching
- Import `redis`, `getCachedOrFetch`, `invalidateCache` from `@/lib/cache/redis`
- Cache keys defined in `@/lib/cache/keys.ts`
- TTLs defined in `CacheTTL` constant
- Mock mode: GHL reads go through `getCachedOrFetch()` → Redis
- Live mode: reads go through cache tables (Postgres) → kept fresh by webhooks + cron

## Encryption
- Import `encrypt`/`decrypt` from `@/lib/encryption`
- Uses AES-256-GCM with random IV
- Format: `iv:tag:ciphertext` (all hex-encoded)
- Used for GHL access/refresh tokens

## GHL Integration

### Two Client Modes
- **Mock mode**: `createGHLClient(tenantId)` from `@/lib/ghl/client.ts` → returns `MockGHLClient` with `.get()/.post()/.put()/.delete()` methods
- **Live mode**: `getGHLClient(tenantId)` from `@/lib/ghl/api.ts` → returns typed `GHLClient` class with named methods

### GHLClient Class (`src/lib/ghl/api.ts`)
- 25+ typed methods: getContacts, getContact, createContact, updateContact, deleteContact, searchContacts, getContactNotes, addContactNote, addContactTag, removeContactTag, getConversations, getConversation, updateConversation, getMessages, sendMessage, getPipelines, getOpportunities, getOpportunity, createOpportunity, updateOpportunity, getCustomFields, createCustomField, getLocation, getCalendars, getAppointments, getForms, getFormSubmissions, getTags
- Auto-refresh on 401, exponential backoff on 429/5xx
- Rate limiting: 80 requests per 10 seconds

### GHL Sync Architecture
```
GHL API ←→ GHLClient (typed methods) ←→ Cache Tables (Postgres) ←→ API Routes ←→ Frontend
                                              ↑
                                        Webhooks (real-time)
                                        Full Sync (on toggle)
                                        Incremental Sync (cron)
```

### Sync Modes
1. **Full Sync** (`fullSync(tenantId)`) — paginated fetch of all GHL data → bulk upsert to cache tables. Triggered on first switch to live mode.
2. **Incremental Sync** (`incrementalSync(tenantId)`) — checks cache staleness, re-fetches if needed. Run by cron.
3. **Webhook Sync** — real-time cache upserts on GHL events (12+ event types). HMAC-SHA256 verified.
4. **Write-Through** — writes go to GHL first, then update local cache. On failure, queued to SyncQueue (max 5 retries, exponential backoff).

### Webhook Events Handled
ContactCreate, ContactUpdate, ContactDelete, ContactTagUpdate, ContactDndUpdate, InboundMessage, OutboundMessage, OpportunityCreate, OpportunityStageUpdate, OpportunityStatusUpdate, OpportunityMonetaryValueUpdate, NoteCreate, TaskCreate

## Voucher System (AI-Powered)

### Reader Flow
```
Image upload → POST /api/voucher/read → Claude API (claude-sonnet-4-20250514)
  → Structured JSON extraction → Auto-fill form fields
```

### Data Flow
```
VoucherSection (drop zone / manual) → ReservationForm state → POST /api/reservations
  → Reservation record with voucher fields in DB
```

### Tracking
- VoucherStats component queries `/api/reservations/voucher-stats`
- Aggregates: pendientes, canjeados, ingresos, caducan semana/mes
- Groupon product mapping: regex → services CRUD in Settings

## Pricing Engine

### Season-Aware Pricing
- `SeasonCalendar` table defines alta/media periods per station (or "all" for global)
- Default season is "media" when no matching entry found
- Server-side: `getSeason(tenantId, station, date)` queries DB
- Client-side: `getSeasonFromCalendar(entries, station, date)` uses pre-fetched data

### Pricing Matrices (JSON in Product.pricingMatrix)
- **Day-based** (equipment, forfaits, lockers): `{ media: { "1": 36, "2": 60 }, alta: { "1": 42 } }`
- **Private lessons** (hour+people): `{ media: { "1h": { "1p": 70, "2p": 75 } } }`

### Client/Server Split (CRITICAL)
- `src/lib/pricing/calculator.ts` — server-side, imports Prisma
- `src/lib/pricing/client.ts` — client-safe, pure functions
- Client hooks import from `client.ts`, never from `calculator.ts` (avoids Prisma in client bundle)

## React Query Hooks

All in `src/hooks/` — use `fetchJSON<T>()` helper that throws on non-ok:
- `useGHL.ts` — GHL data (conversations, contacts, pipelines, opportunities) + mutations (assign, update, delete, move)
- `useReservations.ts` — reservation CRUD + stats + capacity + duplicate + from-quote
- `useQuotes.ts` — quote CRUD + delete
- `useSettings.ts` — tenant, team, data mode, invites, sync status
- `useProducts.ts` — product catalog CRUD
- `usePricing.ts` — price calculation + season detection
- `useSeasonCalendar.ts` — season calendar CRUD
- `useVoucher.ts` — voucher AI reader mutation

## UI Architecture

### Layout
- Route groups: `(dashboard)` for authenticated pages, `(auth)` for login/register/onboarding
- Dashboard layout wraps with `SessionProvider` + `QueryClientProvider`
- Sidebar (240px), Topbar, MobileNav in `src/components/layout/`

### Design System
- DM Sans font, warm coral primary (#E87B5A)
- shadcn/ui v4 on base-ui — `render` prop instead of `asChild`
- Toasts: `sonner`, Tailwind v4 with `tw-animate-css`

### Key UI Patterns
- Every data component has a Skeleton loader — never blank screens
- Every mutation is optimistic — update UI immediately, rollback on error
- Drag-and-drop: @dnd-kit v6 (`useDraggable`/`useDroppable`, PointerSensor 8px)
- All UI text in SPANISH, all currency in EUR via `Intl.NumberFormat`

## Modules

| Module | Path | Key Features |
|--------|------|-------------|
| Dashboard | `/` | Stats cards, daily volume chart, top station, source revenue, activity feed |
| Contacts | `/contacts` | Table + detail with inline edit + notes + delete |
| Comms | `/comms` | 3-panel chat, conversation assignment, contact sidebar |
| Pipeline | `/pipeline` | Kanban DnD, opportunity modal, pipeline selector |
| Reservas | `/reservas` | Form + list, Groupon voucher, auto-pricing, CSV export, date range filter |
| Presupuestos | `/presupuestos` | Quote CRUD, auto-package, print/PDF, expiry badges, convert to reservation |
| Catálogo | `/catalogo` | Product table, season toggle, station filter, expandable pricing matrix, CSV import |
| Settings | `/settings` | Data mode, GHL OAuth, team, season calendar, price import, Groupon mappings, catalog seed |

## Railway Deployment
- **Build:** `npm install` → postinstall (`prisma generate`) → `npm run build`
- **Start:** `npm start` → `prisma migrate deploy` → `prisma db seed` → `next start`
- **Key constraint:** `prisma migrate deploy` runs at start (not build) — DATABASE_URL injected at runtime
- **Seed script** (`prisma/seed.ts`): uses `@prisma/adapter-pg` + `pg` Pool
- **Prisma config** (`prisma.config.ts`): defines seed command — Prisma v7 ignores `package.json`
