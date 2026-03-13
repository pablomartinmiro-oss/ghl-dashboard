# GHL Dashboard — Architecture Patterns

## Database Access
- Import `prisma` from `@/lib/db`
- Uses Prisma v7 with `@prisma/adapter-pg` (not direct URL)
- Generated client at `src/generated/prisma/client`
- Every query MUST include `tenantId` scope

## Caching
- Import `redis`, `getCachedOrFetch`, `invalidateCache` from `@/lib/cache/redis`
- Cache keys defined in `@/lib/cache/keys.ts`
- TTLs defined in `CacheTTL` constant
- All GHL reads go through `getCachedOrFetch()`
- Webhook-triggered invalidation via `@/lib/cache/invalidation.ts`

## Encryption
- Import `encrypt`/`decrypt` from `@/lib/encryption`
- Uses AES-256-GCM with random IV
- Format: `iv:tag:ciphertext` (all hex-encoded)
- Used for GHL access/refresh tokens

## Logging
- Import `logger`, `createRequestLogger`, `createGHLLogger` from `@/lib/logger`
- Never use `console.log` — use structured pino logger
- Child loggers carry `tenantId` and `userId` context

## Environment
- Bootstrap modules (logger, db, redis, encryption) read `process.env` directly
- All application code imports `env` from `@/lib/env` for validated access

## Testing
- Tests in `__tests__/` directory, mirroring `src/` structure
- Prisma and Redis mocked in `__tests__/setup.ts`
- Run with `npx vitest run`

## Authentication
- NextAuth v5 beta with credentials provider + JWT strategy
- Config in `src/lib/auth/config.ts` — exports `handlers`, `auth`, `signIn`, `signOut`
- Session includes: `id`, `email`, `name`, `tenantId`, `roleId`, `roleName`, `permissions`, `onboardingComplete`
- JWT callbacks populate custom fields from user object
- Type declarations for Session and JWT in the config file
- API route handler at `src/app/api/auth/[...nextauth]/route.ts`

## RBAC
- 15 permission keys defined in `src/lib/auth/permissions.ts`
- 4 default roles: Owner/Manager (all), Sales Rep, Marketing, VA/Admin
- `hasPermission(perms, key)`, `hasAnyPermission()`, `hasAllPermissions()` — pure functions
- `RoleGate` component (`src/components/shared/RoleGate.tsx`) — client-side UI gating
- `usePermissions()` hook (`src/hooks/usePermissions.ts`) — returns `can()`, `canAny()`, `canAll()`
- Permission type: `PermissionKey` from `src/types/auth.ts`

## Middleware
- `src/middleware.ts` — uses `getToken()` from `next-auth/jwt` (edge-compatible)
- Does NOT import `@/lib/auth/config` (would pull in Prisma → node:path → edge crash)
- Public routes: `/login`, `/api/auth`, `/api/health`, `/api/ghl/webhooks`, `/api/ghl/oauth`
- Unauthenticated users redirected to `/login`
- Onboarding redirect: if `token.onboardingComplete === false`, redirects to `/onboarding` (unless already there or on API route)

## GHL Integration
- Client factory: `createGHLClient(tenantId)` from `@/lib/ghl/client.ts`
- Returns mock client when `ENABLE_MOCK_GHL=true`
- Real client: axios with rate limiting (80/10s), token refresh on 401, retry with backoff on 429/5xx
- Mock server: `src/lib/ghl/mock-server.ts` — 20 contacts, 10 conversations, 15 opportunities, 4 messages, 3 notes
- OAuth helpers: `src/lib/ghl/oauth.ts` — `getAuthorizeUrl()` and `exchangeCodeForTokens()`
- OAuth routes: `/api/ghl/oauth/authorize` (requires auth) and `/api/ghl/oauth/callback` (public, receives GHL redirect)
- GHL types: `src/lib/ghl/types.ts`

## UI Components
- shadcn/ui components in `src/components/ui/`
- Uses `sonner` for toast notifications (not deprecated toast)
- Tailwind v4 with `tw-animate-css`
- shadcn/ui v4 uses base-ui (not Radix) — `render` prop instead of `asChild`

## Layout
- Route groups: `(dashboard)` for authenticated pages, `(auth)` for login/onboarding
- Dashboard layout (`src/app/(dashboard)/layout.tsx`) wraps with `SessionProvider` + `QueryClientProvider`
- `Sidebar` (`src/components/layout/Sidebar.tsx`) — role-aware nav, collapsible, unread badge on Comms
- `Topbar` (`src/components/layout/Topbar.tsx`) — search input, notification bell, user dropdown menu
- `MobileNav` (`src/components/layout/MobileNav.tsx`) — Sheet-based nav for mobile, hidden on md+
- Design: Inter font, sidebar dark (slate-900), content area light (slate-50)

## Shared Components
- `ErrorBoundary` (`src/components/shared/ErrorBoundary.tsx`) — class component, retry button, dev error display
- `GHLStatusBanner` (`src/components/shared/GHLStatusBanner.tsx`) — dismissible warning banner + reconnect button
- `EmptyState` (`src/components/shared/EmptyState.tsx`) — icon + title + description + optional CTA
- `LoadingSkeleton` (`src/components/shared/LoadingSkeleton.tsx`) — exports: `PageSkeleton`, `CardSkeleton`, `TableSkeleton`, `ConversationListSkeleton`, `KanbanSkeleton`
- `RoleGate` (`src/components/shared/RoleGate.tsx`) — permission-gated UI wrapper

## Login
- Login page at `src/app/(auth)/login/page.tsx`
- Uses `signIn("credentials", { redirect: false })` for client-side auth
- `useSearchParams` wrapped in `<Suspense>` for Next.js static generation

## Onboarding
- 4-step wizard at `src/app/(auth)/onboarding/` — Connect GHL → Invite Team → Assign Roles → Done
- Step components in `src/components/onboarding/` — `StepIndicator`, `ConnectGHLStep`, `InviteTeamStep`, `AssignRolesStep`
- API routes: `/api/onboarding/invite` (POST), `/api/onboarding/team` (GET), `/api/onboarding/roles` (POST), `/api/onboarding/complete` (POST)
- `onboardingComplete` boolean in JWT/session drives middleware redirects
- On completion, sets `tenant.onboardingComplete = true` and forces full page reload to refresh JWT

## GHL API Routes (Pattern)
- All at `src/app/api/ghl/` — conversations, contacts, pipelines, opportunities
- Every route: `auth()` check → permission check via `hasPermission()` → cache-aside via `getCachedOrFetch()` → GHL client call
- Error handling returns `{ error, code: "GHL_ERROR" }` shape
- Uses `logger.child()` for structured request logging

## React Query Hooks
- `src/hooks/useGHL.ts` — all GHL data fetching hooks
- `useConversations()`, `useMessages(conversationId)`, `useSendMessage(conversationId)`
- `useContacts()`, `useContact(id)`, `useContactNotes(id)`
- `usePipelines()`, `useOpportunities(pipelineId)`
- All use `fetchJSON<T>()` helper that throws on non-ok responses

## Comms Module (Step 16 — audit pending)
- Three-panel layout: ConversationList (left 320px) | MessageThread + MessageInput (center) | ContactSidebar (right 288px, hidden on <lg)
- Components in `src/app/(dashboard)/comms/_components/`
- ConversationList: search, filter tabs (All/Mine/Unassigned/Unread), relative time, unread badges
- MessageThread: chat bubbles (inbound left, outbound right), auto-scroll, timestamps
- MessageInput: textarea, Enter to send, Shift+Enter newline, SMS segment counter, permission-gated
- ContactSidebar: contact info, tags, quick link to full profile
- AssignDropdown: assign conversation to team member (permission-gated to `comms:assign`)
