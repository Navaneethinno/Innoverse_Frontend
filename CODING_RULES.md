# Frontend Coding Rules

- Use strict TypeScript and the `@/` path alias for application imports.
- Keep server state in TanStack Query. Use Zustand only for genuine client or
  global UI state, such as authentication and layout preferences.
- Keep API calls behind `src/services/api` and feature-owned API modules.
- Keep business rules, schemas, and workflows inside their owning feature.
- Reuse shared UI and maker-checker workflow components before creating new
  components.
- Do not introduce universal CRUD, entity store, or form abstractions.
- Preserve existing endpoint paths, HTTP methods, payloads, and response
  semantics during migrations.
- Add route metadata when adding routes; keep final route composition in the
  app router boundary.
- Run typecheck, lint, formatting, tests, and production build before merging.
