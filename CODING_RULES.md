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

## Folder structure

Screens mirror the live sidebar (checked against the SuperAdmin menu_array,
2026-09-24), the same way payseFrontend does:
`src/Components/<Module>/<Parent menu>/<Menu>/<Menu>.jsx`, with that menu's
forms, wizards and helpers in the same folder.

```
src/Components/
  Common/ UI/ Layout/ MakerChecker/        shared building blocks
  Institution/                             Institution module
    InstitutionProfile/ InstitutionModule/ InstitutionLegal/
    InstitutionBranding/ InstitutionChannel/ InstitutionCurrency/
  UserManagement/                          User Management module
    User/ Profile/ KYC/ PasswordPolicy/ Shared/
  Epurse/                                  EPURSE module
    Settings/Master/<Gender|Province|District|Village>/
    Configuration/Account/                 every Account > * menu (one resource)
    Configuration/KYC/KycSchemes/
    DigitalProduct/
    Onboarding/OnboardingMaster/           MasterResource + CustomerMasterConfigResource
      Individual/<Religion|Designation|...>/   (serve the remaining master menus)
    Onboarding/OnboardingConfiguration/
    Onboarding/OnboardingWizard/           Individual | Corporate onboarding
```

`src/Services/` and `src/Hooks/` group by module the same way
(`Institution/`, `UserManagement/`, `Epurse/`); cross-cutting code stays at
the top level (`api/`, `Auth/`, `Master/`, `useLiveChannel.js`, ...). A new
menu gets its own folder under its sidebar parent; don't add screens to
`Common/` or create top-level feature folders.
