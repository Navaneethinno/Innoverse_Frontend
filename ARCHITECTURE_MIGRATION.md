# Innoverse Frontend Architecture Migration

## Purpose

This document records the migration from the existing working prototype to a
feature-oriented frontend architecture. The migration is incremental and must
preserve existing UI, behavior, API contracts, routes, and visual design.

## Current Architecture

- React 18.3.1 with Vite 6.3.5 and TypeScript source files.
- Tailwind CSS v4 through the Vite plugin, with Radix/shadcn-style UI
  primitives and a custom glass/pastel theme.
- React Router 7 with routes composed in `src/app/App.tsx`.
- Redux auth store for authentication/session client state.
- TanStack Query for entity server data.
- Native `fetch` through `src/services/api/apiClient.ts`.
- A large `src/app/features/api.service.ts` containing endpoints for several
  domains.
- Route-level pages under `src/app/pages`, with substantial fetching, form,
  validation, mutation, and notification logic inside page components.
- Shared maker-checker components under `src/app/components/common`.
- No strict TypeScript configuration, ESLint, Prettier, test runner, or
  localization infrastructure.
- The project contains an npm lockfile and a pnpm workspace file; npm is the
  current baseline because the lockfile and scripts are npm-compatible.

## Target Architecture

- `src/app` owns application bootstrap, providers, configuration, routing, and
  layouts.
- `src/services/api` owns shared request transport, response normalization,
  errors, authorization headers, timeout behavior, and auth storage.
- `src/features/<feature>` owns feature pages, components, API modules,
  TanStack Query hooks, validation, types, and feature-local state.
- `src/features/maker-checker` owns reusable approval, audit, pending-request,
  and rejected-add workflow behavior.
- `src/shared` owns generic UI, shared application components, hooks, utility
  functions, and genuinely shared types/constants.
- Redux owns authentication/session client state; no Zustand store remains.
- TanStack Query owns server state, caching, loading/error state, and
  invalidation.
- Routing is centrally composed with route metadata for access, permissions,
  navigation, breadcrumbs, titles, and lazy loading.
- Forms use React Hook Form incrementally, with feature-owned validation
  schemas.
- Localization is introduced incrementally, beginning with common and auth
  strings.

## Migration Phases

1. Baseline and migration record
2. Project tooling
3. Environment and API foundation
4. Constants and configuration
5. Shared infrastructure
6. Maker-checker workflow
7. TanStack Query introduction
8. Institutions
9. Users
10. Profiles
11. Applications
12. Menus, modules, and menu actions
13. KYC
14. Dashboard and pending
15. Routing and authorization
16. Localization
17. Forms and validation
18. Cleanup
19. Final quality pass

Each phase must be verified before the next phase begins. Obsolete files and
dependencies are removed only after their replacements and actual usage have
been verified.

## Known Risks

- The extracted project is not currently a Git repository, so rollback must be
  handled through file copies or an external source-control workflow.
- Vite currently transpiles TypeScript without a strict compiler configuration.
- Authentication and the main API client use different request implementations.
- The .env API URL is currently ignored by hardcoded runtime URLs.
- Entity stores duplicate server-state and maker-checker behavior.
- Several large pages combine UI, server state, forms, validation, and business
  workflows.
- Existing API response envelopes and payload shapes must not change.
- Some UI dependencies are present only because generated UI wrappers exist;
  usage must be verified before cleanup.
- The current route set contains a redirect for the older
  /institutions/pending path.

## Baseline Status

- Production build: PASS
- Dev server: PASS
- Dev server URL: http://localhost:5173/
- Root HTML response: PASS, status 200
- Vite entry document: PASS, references /src/main.tsx
- Current route tree:
  - / redirects to /dashboard
  - /login public
  - /setup public
  - /dashboard protected
  - /pending protected
  - /institutions protected
  - /institutions/pending redirects to /institutions
  - /institutions/create protected
  - /institutions/:id protected
  - /users protected
  - /profiles protected
  - /applications protected
  - /menus protected
  - /kyc protected
- Package manager baseline: npm lockfile and npm scripts are present; pnpm
  workspace metadata also exists and is an inconsistency to resolve in Phase 1.
- Source/configuration changes before this document: none.

## Execution Status

### Phase 0 - Baseline

- Status: Complete
- Production build and dev server verified.
- Baseline route tree and package-manager situation recorded.

### Phase 1 - Project Tooling

- Status: Complete
- Added strict TypeScript, ESLint, Prettier, and Vitest configuration.
- Added typecheck, lint, format:check, test, and test:run scripts.
- Standardized the project on npm metadata and runtime React dependencies.
- Existing prototype lint findings remain warnings only.

### Phase 2 - Environment and API Foundation

- Status: Complete
- Added environment-backed API configuration.
- Added shared API transport, errors, response unwrapping, and auth storage.
- Auth now uses the shared API client.
- Backend was not running locally, so live credentialed login could not be exercised.

### Phase 3 - Constants and Configuration

- Status: Complete
- Added app config, route constants, navigation configuration, and storage keys.
- Preserved compatibility exports for existing imports.

### Phase 4 - Shared Infrastructure

- Status: Complete
- Added shared generic components, notifications, class utilities, and a
  confirmation dialog.
- Preserved existing Radix/shadcn primitives.

### Phase 5 - Maker-checker Workflow

- Status: Complete
- Moved maker-checker components, types, and API boundary under
  src/features/maker-checker.
- Preserved legacy import paths as compatibility re-exports.
- TanStack Query hooks were deferred to Phase 6.

### Phase 6 - TanStack Query

- Status: Complete
- Added a single application QueryClient and provider.
- Migrated the institutions list and approval/rejection mutations.
- Existing institution Zustand state was retained for other consumers.

### Phase 7 - Institutions

- Status: Complete with transitional compatibility
- Moved institution pages, card, API boundary, and types under
  src/features/institutions.
- Migrated institution screen reads and mutations away from the institution
  screen's Zustand usage.
- The legacy institution store remains because later dashboard, users,
  profiles, and applications migrations still reference it.

### Phase 8 - Users

- Status: Complete with transitional compatibility
- Added feature-owned user API, types, query keys, and TanStack Query
  mutations.
- Migrated the Users page server state and request mutations to TanStack Query
  while preserving the existing UI, endpoints, payloads, and notifications.
- Profile option loading remains on the legacy profile store until the Profiles
  migration.
- The legacy user store remains because Institutions, Applications, Profiles,
  Menus, and institution flows still consume it.

### Phase 9 - Profiles

- Status: Complete with transitional compatibility
- Added feature-owned profile API, types, query keys, and TanStack Query
  mutations, including permissions and rejected-ADD continuation.
- Migrated the Profiles page server state and mutations while preserving the
  existing UI and API contracts.
- Profile institution options still use the legacy institution store until all
  remaining consumers migrate.

### Phase 10 - Applications

- Status: Complete with transitional compatibility
- Added feature-owned application API, types, query keys, list/pending query
  hooks, assignment mutation, lifecycle mutations, decisions, and rejected-ADD
  continuation.
- Migrated the Applications page server state and mutations while retaining its
  existing tabs, forms, tables, modal workflow, and legacy option stores.

### Phase 11 - Menus / Modules / Menu Actions

- Status: Complete with transitional compatibility
- Added explicit menu feature types, API methods, and query keys for Modules,
  Menus, Menu Actions, and their independent pending streams.
- Migrated list and pending reads in the existing Menus page without merging
  the three domain concepts or changing their endpoint semantics.

### Phase 12 - KYC

- Status: Complete with transitional compatibility
- Added feature-owned KYC types, API boundary, and institution/user query
  hooks.
- Migrated KYC reads and update submissions to TanStack Query and the existing
  institution/user mutation boundaries without changing the dynamic forms or
  endpoint behavior.

### Phase 13 - Dashboard + Pending

- Status: Complete with transitional compatibility
- Added shared maker-checker pending query and approval/rejection mutations.
- Migrated Pending Dashboard and Dashboard pending-request reads to the shared
  query cache while preserving existing filters, summaries, visuals, and
  navigation behavior.

### Phase 14 - Routing

- Status: Complete with transitional compatibility
- Added centralized route metadata, feature ownership, breadcrumb data, and a
  PermissionRoute compatibility seam under src/app/router.
- TopBar breadcrumbs now use route metadata while existing URLs and route
  declarations remain unchanged.

### Phase 15 - Localization

- Status: Complete foundation only
- Added i18next/react-i18next providers, English common/auth namespaces, and
  fallback language configuration.
- Existing visible strings remain unchanged for incremental migration.

### Phase 16 - Forms + Validation

- Status: Foundation complete; incremental migration remains
- Confirmed React Hook Form is already installed and the existing shadcn/Radix
  FormField implementation is the shared form primitive.
- Exposed the existing primitive through src/shared/components/forms without
  duplicating it.
- No Zod dependency was added because no migrated feature schema currently
  requires it; feature schemas can add it when validation is migrated.

### Phase 17 - Cleanup

- Status: Deferred cleanup with safe documentation additions
- Added CODING_RULES.md.
- Obsolete stores, the compatibility API service, and legacy page paths remain
  intentionally because remaining features still consume them. They will be
  removed only after those consumers are migrated and verified.

### Phase 18 - Final Quality Pass

- Status: Engineering checks complete; live product verification pending
- Static checks and production build are run after each migration phase.
- No automated test files exist yet, so the test runner passes with no tests.
- Live login/API verification is pending because the configured backend at
  127.0.0.1:8000 is not reachable in this workspace.

### Phase 20 - Institution Store Migration

- Status: Complete
- Dashboard institution summary now uses useInstitutionsQuery.
- Applications and Profiles institution options now use the shared institution
  query cache with query loading enabled only where needed.
- Institution checker candidates were verified as user data and were not
  incorrectly moved into institution state.
- Removed the orphaned legacy institution store and its private API wrapper
  after repository-wide consumer verification.
- No institution API endpoints, methods, payloads, or response semantics were
  changed.
- Backend runtime verification remains blocked because 127.0.0.1:8000 is not
  reachable.

### Phase 21 - API Service Elimination

- Status: Complete
- Feature API wrappers now call services/api/apiClient directly and preserve
  the existing response envelope unwrapping and fallback behavior.
- Menus mutations, menu audit history, and institution-detail KYC reads now
  use feature-owned API/query boundaries rather than page-level legacy service
  calls.
- Removed src/app/features/api.service.ts after repository-wide reference
  verification.
- API parity: PASS by static comparison of migrated paths, methods, payload
  construction, response unwrapping, authentication, and shared error flow.
- No API contract or intended behavior changes.
- Backend runtime verification remains blocked because 127.0.0.1:8000 is not
  reachable.

| Feature       | Method group                                                                | Old implementation | New implementation                                                          | Contract parity |
| ------------- | --------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------- | --------------- |
| Institutions  | list, detail, lifecycle, pending, audit, decisions, rejected ADD            | api.service.ts     | features/institutions/api/institutions.api.ts -> services/api/apiClient.ts  | PASS            |
| Users         | list, lifecycle, pending, audit, decisions, rejected ADD                    | api.service.ts     | features/users/api/users.api.ts -> services/api/apiClient.ts                | PASS            |
| Profiles      | list, lifecycle, permissions, audit, pending, rejected ADD                  | api.service.ts     | features/profiles/api/profiles.api.ts -> services/api/apiClient.ts          | PASS            |
| Applications  | list, assignment, lifecycle, audit, pending, decisions, rejected ADD        | api.service.ts     | features/applications/api/applications.api.ts -> services/api/apiClient.ts  | PASS            |
| Menus         | modules, menus, actions, lifecycle, audit, pending, decisions, rejected ADD | api.service.ts     | features/menus/api/menus.api.ts -> services/api/apiClient.ts                | PASS            |
| KYC           | institution and user reads                                                  | api.service.ts     | features/kyc/api/kyc.api.ts -> services/api/apiClient.ts                    | PASS            |
| Maker-checker | pending, audit, decisions, rejected ADD                                     | api.service.ts     | features/maker-checker/api/makerChecker.api.ts -> services/api/apiClient.ts | PASS            |

### Phase 20 - User Store Migration

- Status: Complete
- Institution creation and detail, Applications, and Menus now use the shared
  useUsersQuery hook for checker-candidate data.
- Removed the user-store fetch effects; candidate options remain derived from
  cached query data and maker-checker remains responsible only for workflow UI.
- Removed the obsolete legacy user server-state store after repository-wide
  consumer verification. User types and API compatibility code remain because
  they still have active consumers.
- No user API endpoints, methods, payloads, or response semantics were changed.
- Backend runtime verification remains blocked because 127.0.0.1:8000 is not
  reachable.

### Phase 20 - Profile Store Migration

- Status: Complete
- Users now use useProfilesQuery for profile selector data and retain the
  existing institution-scoped profile filtering.
- Removed the obsolete profile-store fetch effect and legacy profile
  server-state store after repository-wide consumer verification.
- No profile API endpoints, methods, payloads, or response semantics were
  changed.
- Backend runtime verification remains blocked because 127.0.0.1:8000 is not
  reachable.
