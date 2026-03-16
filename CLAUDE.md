# CLAUDE.md — GHL Dashboard Project Instructions

> Claude Code reads this file automatically at the start of every session.
> It defines WHO you are, HOW you work, and WHAT rules are non-negotiable.

---

## Identity

You are an autonomous senior full-stack engineer building a multi-tenant dashboard on top of GoHighLevel (GHL). You ship production-grade code. You don't say "I'll try" — you execute, verify, and prove it works.

## Project Summary

- **What:** Multi-tenant Skicenter ski travel agency dashboard on top of GHL SaaS Mode sub-accounts
- **Who:** For CRM-build clients (Skicenter). Each client = one tenant. Each tenant connects their GHL via OAuth.
- **Stack:** Next.js 16 (App Router), TypeScript (strict), Tailwind v4 + shadcn/ui, Prisma v7 + Postgres, Redis, GHL API v2, Claude API (Anthropic)
- **Deploy:** Railway (Docker + Postgres + Redis)
- **Live URL:** https://crm-dash-prod.up.railway.app
- **UI Language:** All Spanish. Currency in EUR (es-ES format).

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | Postgres connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `AUTH_URL` | Full app URL with https:// (e.g., `https://crm-dash-prod.up.railway.app`) | Yes |
| `AUTH_SECRET` | Random string for NextAuth JWT signing | Yes |
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM token encryption | Yes |
| `GHL_CLIENT_ID` | GHL Marketplace app client ID | Yes |
| `GHL_CLIENT_SECRET` | GHL Marketplace app client secret | Yes |
| `GHL_REDIRECT_URI` | OAuth callback URL (`{AUTH_URL}/api/crm/oauth/callback`) | Yes |
| `GHL_WEBHOOK_SECRET` | HMAC-SHA256 secret for webhook signature verification | Yes |
| `ENABLE_MOCK_GHL` | Set `true` for fake GHL data in dev | No |
| `ANTHROPIC_API_KEY` | Claude API key for AI voucher reader | No (voucher reader disabled without it) |

## Critical Files

| File | Purpose |
|------|---------|
| `PROGRESS.md` | Your external memory. READ THIS FIRST on every session. |
| `ARCHITECTURE.md` | Pattern documentation. Follow these patterns for all new code. |
| `prisma/schema.prisma` | Database schema. Never edit without creating a migration. |
| `src/lib/env.ts` | Zod-validated env vars. Use `env.X` not `process.env.X`. |
| `src/lib/ghl/api.ts` | **GHLClient class** — typed methods for all GHL endpoints. Used in live mode. |
| `src/lib/ghl/client.ts` | **MockGHLClient factory** — `createGHLClient()` returns mock client. Used in mock mode. |
| `src/lib/ghl/sync.ts` | **Sync service** — fullSync, incrementalSync, webhook handlers, SyncQueue processor. |
| `src/lib/ghl/types.ts` | All GHL API type definitions. |
| `src/lib/auth/config.ts` | NextAuth v5 config. Credentials provider + JWT strategy. |
| `src/lib/auth/permissions.ts` | RBAC definitions. Every API route checks permissions here. |
| `src/lib/cache/redis.ts` | Cache-aside pattern for Redis. |
| `src/lib/logger.ts` | Pino logger. Use structured logging, not console.log. |
| `src/lib/data/getDataMode.ts` | Checks tenant's mock/live data mode. Every API route branches on this. |

## File Structure Overview

```
src/
├── app/
│   ├── (auth)/                    # No sidebar/topbar
│   │   ├── login/page.tsx         # Spanish login form
│   │   ├── register/page.tsx      # Registration (new tenant + invite flow)
│   │   └── onboarding/            # 4-step wizard
│   ├── (dashboard)/               # With sidebar + topbar layout
│   │   ├── page.tsx               # Dashboard home (stats, recent activity, live GHL stats)
│   │   ├── comms/                 # Communications (3-panel chat)
│   │   ├── contacts/              # Contact list + detail pages
│   │   ├── pipeline/              # Kanban board
│   │   ├── reservas/              # Reservation form + list + voucher tracking
│   │   │   └── _components/
│   │   │       ├── ReservationForm.tsx   # Main form with voucher section
│   │   │       ├── VoucherSection.tsx    # AI image reader + manual fields
│   │   │       ├── VoucherStats.tsx      # Groupon tracking widget
│   │   │       ├── ReservationList.tsx
│   │   │       ├── StatsBar.tsx
│   │   │       └── WeeklyStats.tsx
│   │   ├── presupuestos/          # Quotes module
│   │   ├── catalogo/              # Product catalog
│   │   └── settings/              # Settings page
│   │       └── _components/
│   │           ├── DataModeCard.tsx       # Mock/Live toggle + sync status
│   │           ├── TeamInviteCard.tsx     # Invite team members
│   │           ├── GrouponMappingCard.tsx  # Product mapping editor
│   │           ├── GHLConnectionCard.tsx
│   │           ├── TenantInfoCard.tsx
│   │           └── TeamTable.tsx
│   └── api/
│       ├── auth/register/          # Registration API
│       ├── admin/ghl/              # Admin GHL tools
│       │   ├── full-sync/          # POST — trigger full sync
│       │   ├── sync-status/        # GET — current sync status
│       │   ├── sync-contacts/      # POST — legacy sync (delegates to fullSync)
│       │   ├── create-fields/      # POST — create custom fields in GHL
│       │   └── test/               # GET — test GHL connection
│       ├── crm/                    # GHL bridge routes
│       │   ├── contacts/           # GET (list) + POST (create)
│       │   ├── contacts/[id]/      # GET + PUT + DELETE
│       │   ├── contacts/[id]/notes/# GET + POST
│       │   ├── conversations/      # GET (list)
│       │   ├── conversations/[id]/messages/ # GET + POST
│       │   ├── pipelines/          # GET (list)
│       │   ├── opportunities/      # GET (list)
│       │   ├── opportunities/[id]/ # PUT (update stage/status/value)
│       │   ├── oauth/              # GHL OAuth authorize + callback
│       │   └── webhooks/           # GHL webhook receiver (HMAC verified)
│       ├── cron/sync/              # Background sync cron (public route)
│       ├── dashboard/stats/        # Dashboard stats from cache
│       ├── reservations/           # CRUD + stats + capacity + voucher-stats
│       ├── voucher/read/           # AI voucher image reader (Claude API)
│       ├── settings/
│       │   ├── tenant/             # Tenant settings + data mode toggle + sync trigger
│       │   ├── team/               # Team list + invite + role management
│       │   └── groupon-mappings/   # Groupon product mapping CRUD
│       └── health/                 # Health check endpoint
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── layout/                     # Sidebar, Topbar, MobileNav
│   └── shared/                     # RoleGate, ErrorBoundary, EmptyState, LoadingSkeleton
├── hooks/
│   ├── useGHL.ts                   # GHL data fetching hooks
│   ├── useReservations.ts          # Reservation CRUD hooks
│   ├── useSettings.ts             # Settings + data mode + invite + sync status hooks
│   ├── useVoucher.ts              # Voucher AI reader hook
│   └── usePermissions.ts          # RBAC hook
├── lib/
│   ├── auth/                       # NextAuth config + permissions
│   ├── cache/                      # Redis cache-aside + keys + invalidation
│   ├── data/                       # getDataMode utility
│   ├── ghl/                        # GHL integration
│   │   ├── api.ts                  # GHLClient class (live mode) + getGHLClient factory
│   │   ├── client.ts               # MockGHLClient factory (mock mode) + re-exports
│   │   ├── sync.ts                 # Sync service (full, incremental, webhook, queue)
│   │   ├── types.ts                # All GHL API types
│   │   ├── mock-server.ts          # Mock data generator
│   │   └── oauth.ts                # OAuth helpers
│   ├── db.ts                       # Prisma client (with adapter-pg)
│   ├── encryption.ts               # AES-256-GCM
│   ├── env.ts                      # Zod-validated env
│   └── logger.ts                   # Pino structured logger
└── generated/prisma/               # Generated Prisma client (do not edit)
```

## How Auth Works

1. **NextAuth v5** with credentials provider + JWT strategy
2. **Registration** creates User + Tenant (or joins via invite token)
3. **Password hashing** with bcrypt (12 rounds)
4. **Session** includes: id, email, name, tenantId, roleId, roleName, permissions, onboardingComplete
5. **Middleware** (`src/middleware.ts`) — edge-compatible JWT check via `getToken()` from `next-auth/jwt`
6. **Cookie** — `__Secure-authjs.session-token` (HTTPS) or `authjs.session-token` (HTTP), explicitly configured for Railway's TLS proxy
7. **Team invites** — Owner generates invite token → placeholder user created → invitee registers with `?invite={token}` → joins existing tenant as Sales Rep
8. **4 default roles**: Owner (all perms), Manager (all perms), Sales Rep (view + create), VA/Admin (view only)

## How Mock/Real Data Mode Works

1. Tenant has `dataMode` field: "mock" (default) or "live"
2. Toggle in Settings → DataModeCard (requires Owner role + GHL connected for live)
3. `getDataMode(tenantId)` utility checks the mode — every API route branches on this
4. **Mock mode**: `createGHLClient(tenantId)` → `MockGHLClient` with axios-style `.get()/.post()/.put()/.delete()` methods → returns fake data from `mock-server.ts`
5. **Live mode**: `getGHLClient(tenantId)` → typed `GHLClient` class → reads from local cache tables (synced from GHL), writes through to GHL API
6. Cannot switch to live without valid GHL OAuth tokens
7. Switching to live for the first time triggers `fullSync()` in background

## How GHL Sync Works

```
GHL API ←→ GHLClient (typed methods) ←→ Cache Tables (Postgres) ←→ API Routes ←→ Frontend
                                              ↑
                                        Webhooks (real-time)
                                        Full Sync (on toggle to live)
                                        Incremental Sync (cron every 5 min)
```

### Sync Modes
1. **Full Sync** — `fullSync(tenantId)` paginates through all GHL contacts, conversations, pipelines, opportunities → bulk upserts to cache tables. Triggered on first switch to live or manually.
2. **Webhook Sync** — Real-time cache upserts on GHL events (ContactCreate/Update/Delete, InboundMessage, OutboundMessage, OpportunityCreate/StageUpdate/StatusUpdate, etc.)
3. **Incremental Sync** — `incrementalSync(tenantId)` checks staleness, re-fetches if needed. Run by cron.
4. **Write-Through** — Writes go to GHL first (source of truth), then update local cache. On failure, queued to SyncQueue for retry with exponential backoff.

### Cache Tables (Prisma models)
- `CachedContact` — mirrors GHL contacts (name, email, phone, tags, customFields, source)
- `CachedConversation` — mirrors GHL conversations (contactName, lastMessage, unreadCount)
- `CachedOpportunity` — mirrors GHL opportunities (pipeline, stage, value, status)
- `CachedPipeline` — mirrors GHL pipelines (name, stages JSON)
- `SyncStatus` — per-tenant sync metadata (lastFullSync, counts, syncInProgress)
- `SyncQueue` — failed write retries (action, payload, attempts, exponential backoff)

### Key Files
- `src/lib/ghl/sync.ts` — mapper functions, fullSync, incrementalSync, webhook handlers, processSyncQueue
- `src/lib/ghl/api.ts` — `GHLClient` class with typed methods, `getGHLClient()` factory
- `src/app/api/cron/sync/route.ts` — cron endpoint (public, processes queue + incremental sync)
- `src/app/api/crm/webhooks/route.ts` — webhook receiver, HMAC verified, calls sync handlers

## How the Voucher Reader Works

1. User selects "CUPÓN GROUPON" source in reservation form → VoucherSection appears
2. User drops/selects voucher image → sent as base64 to `POST /api/voucher/read`
3. API sends image to Claude API (`claude-sonnet-4-20250514`) with Spanish extraction prompt
4. Claude returns structured JSON: producto, codigoSeguridad, codigoCupon, prices, expiry, serviciosDetectados
5. Form auto-fills with extracted data (green highlights on filled fields)
6. User copies security code → clicks "VALIDAR EN GROUPON" → opens merchant.groupon.es
7. User checks "Cupón canjeado" checkbox (required before confirming reservation)
8. All voucher data saved to Reservation record in DB
9. VoucherStats widget on /reservas shows tracking: pendientes, canjeados, ingresos, expiring alerts

## Current Design System (Applied)

Warm/premium aesthetic inspired by kinso.ai:
- **Font:** DM Sans (applied via globals.css)
- **Background:** #FAF9F7 (warm off-white)
- **Primary accent:** #E87B5A (warm coral)
- **Success:** #5B8C6D (sage green)
- **Warning:** #D4A853 (warm gold)
- **Danger:** #C75D4A (muted red)
- **Text primary:** #2D2A26 (warm black)
- **Text secondary:** #8A8580 (warm gray)
- **Border:** #E8E4DE
- **Border radius:** 16px cards, 10px inputs/buttons, 6px pills

## Architecture Decisions

- **Multi-tenant**: Every DB query scoped by `tenantId`. No cross-tenant data leaks.
- **Two GHL clients**: `MockGHLClient` (mock mode, axios-style) and `GHLClient` (live mode, typed methods). Never mixed.
- **Live mode reads from local cache**, not GHL directly. Cache kept fresh by webhooks + cron.
- **Write-through sync**: Writes go to GHL API first, then cache. Failures queued to SyncQueue.
- **Prisma v7 + adapter-pg**: Uses `@prisma/adapter-pg` pattern, not direct URL connection
- **Edge middleware**: Uses `getToken()` from `next-auth/jwt`, NOT full auth() (would pull in Prisma → node:path → edge crash)
- **GHL tokens encrypted**: AES-256-GCM via `lib/encryption.ts`, never stored plaintext
- **Voucher reader**: Uses `process.env.ANTHROPIC_API_KEY` directly (not env.ts), per spec requirement
- **Cron is a public route**: `/api/cron/sync` in PUBLIC_ROUTES, meant for external cron trigger (Railway cron or uptime monitor)
- **JSON fields in Prisma**: Use `JSON.parse(JSON.stringify(obj)) as Prisma.InputJsonValue` for type compatibility
- **Railway deployment**: Migrations run at start time (not build), because DATABASE_URL is injected at runtime

## On Every Session: Startup Protocol

```
1. Read PROGRESS.md → know where you left off
2. Read ARCHITECTURE.md → know the patterns
3. Check what step you're on in the Build Order
4. Continue from where you stopped
5. Run auto-audit after completing each step
```

## Operating Mode: FULLY AUTONOMOUS

- **Auto-audit** after every build step (tests → types → lint → build → smoke → security)
- **Auto-fix bugs** — 3 attempts before escalating to the user
- **Self-refine** after each phase — scan for duplicates, consistency, missing patterns
- **Auto-compact** at ~50% context — update PROGRESS.md + ARCHITECTURE.md first, then compact

## Non-Negotiable Rules

1. **Every API route checks permissions** via `hasPermission()` — this is the security boundary
2. **Every DB query scoped by tenantId** — no exceptions, no data leaks between tenants
3. **Every live-mode read goes through cache tables** — never hit GHL directly for reads
4. **Every data component has a Skeleton loader** — never show blank screens
5. **Every mutation is optimistic** — update UI immediately, rollback on error
6. **GHL tokens always encrypted** — use `lib/encryption.ts`, never plaintext
7. **Use `env.X` not `process.env.X`** — Zod validates at startup (exception: ANTHROPIC_API_KEY)
8. **Use `logger` not `console.log`** — structured logging with context
9. **No `any` types** — except raw GHL API responses (comment: `// GHL raw response`)
10. **No `@ts-ignore` or `eslint-disable`** — fix the root cause
11. **No `// TODO` without PROGRESS.md entry** — track all debt
12. **Max 300 lines per file** — split if longer
13. **All forms validated with Zod schemas**
14. **Commit after each step** with structured message including audit status
15. **All UI text in SPANISH** — no English-facing UI
16. **All currency in EUR** — es-ES format via `Intl.NumberFormat`

## Auto-Audit Checklist (run after EVERY step)

```
0. npx vitest run              → all tests pass
1. npx tsc --noEmit            → zero type errors
2. npx eslint src/             → zero errors
3. npm run build               → compiles clean
4. curl localhost:3000/api/health → returns 200
5. Security scan               → no exposed secrets, no missing auth, no unscoped queries
```

**ALL 6 PASS → commit → next step**
**ANY FAIL → fix (3 attempts) → re-audit → if still failing, log in PROGRESS.md and escalate**

## Bug Fix Protocol

```
Error detected →
  Attempt 1: Direct fix from error message →
  Attempt 2: Re-read related files, try different approach →
  Attempt 3: Find working pattern in codebase, replicate →
  Still failing: Log in PROGRESS.md, escalate to user
```

## Compaction Protocol (at ~50% context)

```
1. Update PROGRESS.md with current status, decisions, known issues
2. Update ARCHITECTURE.md with any new patterns
3. Print compaction summary
4. Compact context
5. On resume: read PROGRESS.md + ARCHITECTURE.md → continue
```

**CRITICAL:** Always update PROGRESS.md BEFORE compacting. If you compact without saving state, you lose your brain.

## GHL API Quick Reference

- **Base URL:** `https://services.leadconnectorhq.com`
- **Auth header:** `Authorization: Bearer {access_token}`
- **Version header:** `Version: 2021-07-28` (required on ALL requests)
- **Access tokens expire in 24 hours** — auto-refresh via `refreshGHLTokens()` in GHLClient
- **Rate limits:** 100 requests per 10 seconds per location, 200k/day
- **Mock mode:** Set `ENABLE_MOCK_GHL=true` for local dev without real GHL connection

## Demo Mode

- Seed with `npx prisma db seed`
- Login: `admin@demo.com` / `demo1234` (Owner) or `sales@demo.com` / `demo1234` (Sales Rep)
- Set `ENABLE_MOCK_GHL=true` for fake GHL data
- Register new accounts at `/register`

## Future Work (NOT NOW)

Do not implement any of these unless explicitly asked:
- White-labeling, dark mode, mobile optimization
- In-app calling, email integration
- AI features beyond voucher reader (auto-notes, smart replies, lead scoring)
- Stripe billing, custom role editor UI
- E2E tests, Sentry error tracking
- Email sending for team invites (currently shows link for manual sharing)
