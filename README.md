# Innoverse Frontend

Innoverse is a Vite + React + TypeScript frontend for institution, user,
profile, application, menu, KYC, dashboard, and maker-checker workflows.

## Development

```bash
npm install
npm run dev
```

Set `VITE_API_BASE_URL` in `.env.local` to the backend API base URL. The
current prototype defaults and endpoint contracts are preserved by the shared
API client.

## Checks

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test:run
npm run build
```

See `ARCHITECTURE_MIGRATION.md` for migration status and `CODING_RULES.md` for
contribution conventions.
