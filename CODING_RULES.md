# Frontend Coding Rules

- JavaScript (JSX) with the `@/` path alias for application imports.
- Session and menu state live in Redux (`src/Redux/`: token, menu); page data
  is loaded by each screen through its module's API file in `src/Services/`.
- Everything the backend decides (menus, permissions, options, statuses)
  comes from the API; don't hard-code it in the frontend.
- Reuse the shared building blocks (`Common/`, `MakerChecker/`, `ListPanel`,
  `DataTable`, `RowsEditor`, `useRecordActions`, ...) before creating new ones.
- Lists must stay usable at ~1000 records: server-side paging, search and
  filters.
- No dead code: remove what is no longer used.
- Run lint, tests and the production build before merging.

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
  InnoAML/                                 InnoAML module
    AMLConfiguration/<AMLSetup|InternalWatchlists>/
    AMLScreening/<Screenings|NameLookup|MatchReview>/
    Shared/                                screening detail, badges, customer result
  Reports/                                 Reports module
    <UserActivity|RiskScoreBreakdown|AMLScoreBreakdown>/  Shared/ (periods, IST, downloads)
  GlobalSettings/ Transactions/ Cards/ Loans/ TermDeposits/
  Merchant/ Accounting/ CaseManagement/ Tour/
```

`src/Router/` follows it too: `index.js` builds one route list per module
(`institutionRoutes`, `userManagementRoutes`, `epurseRoutes`, `innoAmlRoutes`,
`reportsRoutes`) from the files in `Router/UserManagement/`, `Router/Epurse/`,
`Router/InnoAML/` and `Router/Reports/`. Header pieces (top bar,
change password) live in `src/Pages/Header/`, as in payse.

Sidebar menus open at `/<module>/<menu path>` (e.g.
`/mms/onboarding/corporate/onboarding-wizard`), because menu names repeat
across modules and branches. `Pages/Sidebar/MenuPage.jsx` resolves the path
to its menu and renders the page registered under the menu's slug
(`menuSlugForItem`), inside `MenuContext` (menu, module, Individual/Corporate
branch). Register a new page under its slug as before; read permissions with
`usePagePermission()`, and open another menu with `useOpenMenu()` so the user
stays in the same module. The module also picks the API prefix for the
customer screens (`Utils/Lib/apiScope.js`: EPURSE `/customer`, MMS
`/merchant`); write service paths with `/customer/...` and let requests be
rewritten.

`src/Services/` and `src/Hooks/` group by module the same way
(`Institution/`, `UserManagement/`, `Epurse/`, `InnoAML/`, `Reports/`); cross-cutting code stays at
the top level (`api/`, `Auth/`, `Master/`, `useLiveChannel.js`, ...). A new
menu gets its own folder under its sidebar parent; don't add screens to
`Common/` or create top-level feature folders.
