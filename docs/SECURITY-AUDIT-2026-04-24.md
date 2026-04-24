# Security Audit — 2026-04-24

Scope: every `route.ts` under `src/app/api/` (67 files), plus a global secrets / dead-code sweep.

The three routes pre-flagged by the brief (`settings/groupon-mappings`, `settings/team/invite`, `settings/team`) are already correctly tenant-scoped — verified line-by-line. The real critical issues are elsewhere.

## CRITICAL

### C1. Products routes have NO tenant scoping
**Files**:
- `src/app/api/products/route.ts` — GET/POST
- `src/app/api/products/[id]/route.ts` — PATCH/DELETE
- `src/app/api/products/bulk-import/route.ts` — POST

`Product.tenantId` is nullable in the schema (`null = global catalog`). The current routes never read or write `tenantId`, which means any authenticated user — from any tenant — can:

- read products belonging to another tenant (GET filters only on category/station)
- create unowned global products (POST omits `tenantId`)
- update/delete any product, global or otherwise (PATCH/DELETE look up by `id` only)
- in bulk-import, update or create any product matched by `name` only — clobbering rows owned by other tenants

**Fix applied**: GET returns `tenantId IN (null, currentTenant)` so global catalog stays visible. POST sets `tenantId` from session — new products are tenant-owned. PATCH/DELETE/bulk-import refuse to mutate any row whose `tenantId !== session.tenantId` (404 for "not yours", which also covers globals). Editing the global seeded catalog must now go through `seed-products` (Owner-only).

### C2. `seed-products` deletes the global catalog and is callable by anyone
**File**: `src/app/api/admin/seed-products/route.ts` line 19 — `prisma.product.deleteMany({ where: { tenantId: null } })`.

Any authenticated user (Sales Rep, VA, anyone) of any tenant could nuke the shared global catalog and reseed it from `buildFullCatalog()`. Combined with C1, this is ground for shared-state corruption.

**Fix applied**: requires `roleName === "Owner"` in the session.

### C3. `clean-tenant` is destructive and callable by anyone in the tenant
**File**: `src/app/api/admin/clean-tenant/route.ts`

Any authenticated tenant member (Sales Rep, VA, Manager) can wipe ALL reservations, quotes, station capacity, and notifications for the entire tenant. No confirmation token, no role gate.

**Fix applied**: requires `roleName === "Owner"`.

## HIGH

### H1. Hardcoded shared password in `onboarding/invite`
**File**: `src/app/api/onboarding/invite/route.ts` line 46 — `await hash("changeme123", 12)` is set as `passwordHash` for every invited user, with `isActive: true`.

Anyone who can guess an invitee's email can sign in as them with `changeme123`. The user is created active, no first-login password reset, no invite token gate.

**Fix applied**: invitees are now created with `passwordHash: null`, `isActive: false`, and a 32-byte random `inviteToken` (matches the existing flow in `settings/team/invite/route.ts`). They must claim the account via the registration flow. (`/register?invite=<token>` is already implemented.)

### H2. Webhook signature check is fail-OPEN when secret is unset
**File**: `src/app/api/crm/webhooks/route.ts` lines 28-35 — `if (!secret) return true`.

If `GHL_WEBHOOK_SECRET` env var is missing in production (env drift, misconfig), HMAC verification is silently skipped. Any caller can POST arbitrary webhook payloads.

**Fix applied**: in production (`NODE_ENV === "production"`) a missing secret causes verification to fail. In dev it still returns true with a warning logged.

### H3. `admin/ghl/test` leaks token prefix in response
**File**: `src/app/api/admin/ghl/test/route.ts` lines 49, 72.

Returns `accessTokenPrefix: tenant.ghlAccessToken.substring(0, 20)` (encrypted prefix — limited risk, but it's still ciphertext) and `decryptedPrefix: accessToken.substring(0, 10) + "..."` (plaintext bearer token prefix). A user with stolen session cookie can read this.

**Fix applied**: removed both prefixes; replaced with boolean presence flags only.

### H4. Console.log of full webhook bodies (PII risk)
**File**: `src/app/api/crm/webhooks/route.ts` line 41 — `console.log("[WEBHOOK] Received:", req.method, rawBody)`.

Webhook payloads contain contact emails/phones/messages. These end up in Railway logs, retained indefinitely.

**Fix applied**: replaced with `log.debug({ method, bodyLength })` — body content stays out of logs.

## MEDIUM (documented, not fixed in this pass)

### M1. `/api/contact` auto-binds public form to first GHL-connected tenant
**File**: `src/app/api/contact/route.ts` line 147 — `prisma.tenant.findFirst({ where: { ghlLocationId: { not: null } } })`.

In a true multi-tenant deploy, public contact form submissions are routed to whichever tenant has GHL connected first. For Skicenter today (single production tenant), this is acceptable — but should be re-keyed to a `PUBLIC_FORM_TENANT_ID` env var before onboarding any second real tenant.

### M2. `cron/sync` and `cron/quote-reminders` public without `CRON_SECRET`
Per `src/app/api/CLAUDE.md` they are intentionally public, but recommend always requiring the bearer secret in prod to prevent rate-limit DOS against GHL.

### M3. CRM `[id]` mutating routes lack defense-in-depth tenant precheck
GHL operations on `/api/crm/contacts/[id]`, `/api/crm/conversations/[id]/*`, `/api/crm/opportunities/[id]` flow through a tenant-scoped GHLClient (correct boundary), but no `findFirst({ id, tenantId })` precheck on the cache table before the GHL call. Cross-tenant ID overlap is unlikely in practice but a defense-in-depth gap.

### M4. Hardcoded business data
- Quote send: `BASE_URL` and Skicenter IBAN (`/api/quotes/[id]/send/route.ts` lines 11-12)
- Contact form: `reservas@skicenter.es`, `administracion@skicenter.es` recipients
- Redsys webhook: `administracion@skicenter.es`

Not a credential leak, but multi-tenant-incompatible. Tenant-aware once a second real tenant onboards.

### M5. Loose body validation
Most write routes accept `body as Record<string, unknown>` and cast. Consider adding Zod schemas to: `quotes`, `quotes/[id]/items`, `quotes/[id]`, `reservations`, `season-calendar`, `voucher/read` (no payload size limit). Scoped to a follow-up PR — out of scope for this audit.

### M6. `voucher/read` no size cap
`src/app/api/voucher/read/route.ts`: large base64 payloads → unbounded Anthropic API spend. Add `Content-Length` cap (~5 MB).

## LOW

- L1. `/api/admin/ghl/full-sync` uses `console.log` (4×) instead of `logger`.
- L2. `/api/season-calendar/*` imports unused `permissions` from session.
- L3. `/api/health` exposes `RAILWAY_GIT_COMMIT_SHA` — minor build-metadata leak. Acceptable.
- L4. `/api/auth/register` checks email uniqueness with `findFirst` + create — race window. Atomic via `@@unique([email, tenantId])` constraint, so the race only causes a 500 not a duplicate.

## Secret scan

Grepped `src/`, project root, and tracked markdown for: `sk-`, `Bearer ` literals, `password:` / `apiKey:` in code, AWS-style keys, GHL/Anthropic key shapes, and embedded private keys.

**Findings**: zero hardcoded credentials. The only env-coupled literals are non-secret business data (IBAN, email recipients — see M4).

## Dead-code purge

Searched for: `Sensa`, `Sensa Padel`, `Chief of Staff`, `sensa`, `padel` across the entire repo (excluding `node_modules`, `.next`, `.git`, `generated`).

**Findings**: zero matches. The repo is already clean.

## Webhook migration: HMAC-SHA256 → Ed25519

### Current state
- File: `src/app/api/crm/webhooks/route.ts` lines 28-35.
- Algorithm: `createHmac("sha256", GHL_WEBHOOK_SECRET).update(rawBody).digest("hex")`
- Compared against header `x-ghl-signature`.
- Secret stored in `GHL_WEBHOOK_SECRET` env var, shared symmetric key.

GHL's Redsys-style sibling: `src/app/api/crm/webhooks/redsys/route.ts` (separate path, different scheme — not migrating).

### What needs to change for Ed25519

1. **Switch from symmetric HMAC to asymmetric verification**. GHL publishes a public Ed25519 signing key; we no longer hold a secret. Replace `createHmac` with `crypto.verify("ed25519", rawBodyBuffer, publicKey, signatureBuffer)` (Node's `crypto.verify` supports Ed25519 directly — no third-party lib needed).

2. **Header name and encoding**:
   - Today: `x-ghl-signature`, hex-encoded.
   - Likely under Ed25519: `x-wh-signature` (GHL's documented header), base64-encoded. Confirm header name + encoding from GHL's published spec at migration time.

3. **Public key plumbing**:
   - New env var `GHL_WEBHOOK_PUBLIC_KEY` containing the PEM-encoded Ed25519 public key (or DER base64).
   - Add to `src/lib/env.ts` Zod schema (optional during migration window, required after).
   - Document key rotation policy: GHL may rotate; we should support reading either of two keys during a rotation window.

4. **Backward-compat shim**:
   - Phase 1: support BOTH HMAC and Ed25519. If `x-wh-signature` (Ed25519) header present, verify that; else fall back to `x-ghl-signature` HMAC. Reject if neither.
   - Phase 2: after GHL fully cuts over, drop HMAC path and the secret env var.

5. **Replay protection**: Ed25519 alone doesn't prevent replay. If GHL's payload includes a timestamp / nonce, validate `now - timestamp < N minutes` and reject duplicates (Redis SETNX on event id).

6. **Test coverage**:
   - Unit test the verifier with a fixture signed with a known Ed25519 keypair.
   - Negative tests: tampered body, wrong key, missing header, expired timestamp.

7. **Rollout**:
   - Add public key to Railway env first.
   - Deploy dual-path verification.
   - Coordinate with GHL on cutover date.
   - Remove HMAC path + secret in a follow-up commit.

### Files to touch (when implementing)
- `src/app/api/crm/webhooks/route.ts` — `verifySignature()` becomes dual-path.
- `src/lib/env.ts` — add `GHL_WEBHOOK_PUBLIC_KEY` (and during migration keep `GHL_WEBHOOK_SECRET`).
- `__tests__/webhook-signature.test.ts` (new) — fixture-based verification tests.
- `CLAUDE.md` env table — update.

## Summary of fixes in this commit

| Severity | Issue | Status |
|---|---|---|
| C1 | Products routes — tenant scoping | **fixed** |
| C2 | `seed-products` — Owner role | **fixed** |
| C3 | `clean-tenant` — Owner role | **fixed** |
| H1 | `onboarding/invite` hardcoded password | **fixed** |
| H2 | Webhook fail-open in prod | **fixed** |
| H3 | `admin/ghl/test` token prefix leak | **fixed** |
| H4 | Webhook console.log of full body | **fixed** |
| M1-M6 | various | documented, deferred |
| Ed25519 migration | scope only | documented above |
| Dead code (Sensa / Chief of Staff) | none found | confirmed clean |
