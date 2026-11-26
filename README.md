# Innoverse Frontend

The InnoVerse admin portal: a Vite + React (JavaScript) app for institution
setup, users and profiles, onboarding, e-purse accounts, cards, loans, term
deposits, merchants, AML, accounting, reports and the maker-checker flows
around them.

## Development

```bash
npm install
npm run dev
```

Set `VITE_API_BASE_URL` (and `VITE_AUTH_BASIC_PASSWORD`) in `.env.local`.

## Checks

```bash
npm run lint
npm run test:run
npm run build
```

See `CODING_RULES.md` for the folder layout and conventions.

## Build and deploy (for the GitLab pipeline)

| Item | Value |
| --- | --- |
| Node | 24 (`.nvmrc`) |
| Package manager | npm (`package-lock.json`) |
| Install | `npm ci` |
| Build | `npm run build` |
| Output folder | `dist/` (includes `.htaccess` with the security headers, copied from `public/`) |
| Lint | `npm run lint` |
| Tests | `npm run test:run` (Vitest) |
| API base URL | `VITE_API_BASE_URL`, read at build time from `.env` (also written into the page's Content-Security-Policy). UAT (105): `https://etakuapi.innovitegrasuite.com`. PCI laptop: `https://api.innoverse.internal`. |
| Other build settings | `VITE_AUTH_BASIC_USERNAME` and `VITE_AUTH_BASIC_PASSWORD` (the portal's client credential), `VITE_INSTITUTION_DRAFT_STATUS_CODE`; set them as masked CI variables, never in the repo. |
| Deploy on 105 | Copy the contents of `dist/` to the site's web root (folder path to be confirmed). Apache needs `mod_headers` and `AllowOverride FileInfo` for the `.htaccess`. No restart or cache clearing is needed (`index.html` is served no-cache; files under `assets/` have hashed names). |
