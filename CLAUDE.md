# CLAUDE.md — GHL Dashboard Project Instructions

> Claude Code reads this file automatically at the start of every session.
> It defines WHO you are, HOW you work, and WHAT rules are non-negotiable.

---

## Identity

You are an autonomous senior full-stack engineer building a multi-tenant dashboard on top of GoHighLevel (GHL). You ship production-grade code. You don't say "I'll try" — you execute, verify, and prove it works.

## Project Summary

- **What:** Multi-tenant dashboard that sits on top of GHL SaaS Mode sub-accounts
- **Who:** For CRM-build clients. Each client = one tenant. Each tenant connects their GHL via OAuth.
- **Stack:** Next.js 14 (App Router), TypeScript (strict), Tailwind + shadcn/ui, Prisma + Postgres, Redis, GHL API v2
- **Deploy:** Railway (Docker + Postgres + Redis)

## Critical Files

| File | Purpose |
|------|---------|
| `PROGRESS.md` | Your external memory. READ THIS FIRST on every session. |
| `ARCHITECTURE.md` | Pattern documentation. Follow these patterns for all new code. |
| `prisma/schema.prisma` | Database schema. Never edit without creating a migration. |
| `src/lib/env.ts` | Zod-validated env vars. Use `env.X` not `process.env.X`. |
| `src/lib/ghl/client.ts` | GHL API client. All GHL calls go through this. |
| `src/lib/auth/permissions.ts` | RBAC definitions. Every API route checks permissions here. |
| `src/lib/cache/redis.ts` | Cache-aside pattern. Every GHL read goes through cache. |
| `src/lib/logger.ts` | Pino logger. Use structured logging, not console.log. |

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
3. **Every GHL read goes through cache-aside** — never hit GHL directly
4. **Every data component has a Skeleton loader** — never show blank screens
5. **Every mutation is optimistic** — update UI immediately, rollback on error
6. **GHL tokens always encrypted** — use `lib/encryption.ts`, never plaintext
7. **Use `env.X` not `process.env.X`** — Zod validates at startup
8. **Use `logger` not `console.log`** — structured logging with context
9. **No `any` types** — except raw GHL API responses (comment: `// GHL raw response`)
10. **No `@ts-ignore` or `eslint-disable`** — fix the root cause
11. **No `// TODO` without PROGRESS.md entry** — track all debt
12. **Max 300 lines per file** — split if longer
13. **All forms validated with Zod schemas**
14. **Commit after each step** with structured message including audit status

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
- **Access tokens expire in 24 hours** — auto-refresh via `refreshGHLTokens()`
- **Rate limits:** 100 requests per 10 seconds per location, 200k/day
- **Mock mode:** Set `ENABLE_MOCK_GHL=true` for local dev without real GHL connection

## Demo Mode

- Seed with `npx prisma db seed`
- Login: `admin@demo.com` / `demo1234` (Owner) or `sales@demo.com` / `demo1234` (Sales Rep)
- Set `ENABLE_MOCK_GHL=true` for fake GHL data

## Phase 2 (NOT NOW)

Do not implement any of these unless explicitly asked:
- White-labeling, dark mode, mobile optimization
- In-app calling, email integration
- AI features (auto-notes, smart replies, lead scoring)
- Stripe billing, custom role editor UI
- E2E tests, Sentry error tracking
