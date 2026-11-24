# Changelog

The release number is the `version` in `package.json`. It is shown on the sign-in page and at the bottom of the side menu, and each release is tagged in git as `vMAJOR.MINOR.PATCH` on the commit that is deployed. Raise the patch for fixes, the minor for new features, the major for breaking changes.

## 1.0.0

First release.

- Sign in per institution, with maker-checker (one user proposes, another approves) on every setting and record.
- Modules: Institution, User Management, Global Settings, ePurse, InnoCBS (accounts, deposits, loans), Finance, InnoMMS, InnoAML, Case Management, InnoReports, InnoCMS (cards), InnoTreasury and InnoFMS (fuel).
- A dashboard per module, setup guides, live updates and the approval inbox.
- English, Portuguese and Arabic. Per-institution branding.
- Menus and buttons come only from the server's permissions and each record's allowed actions.
- Security review before release: Content-Security-Policy, framing blocked, nosniff, Referrer-Policy, Permissions-Policy and HSTS; the session kept per browser tab; full card numbers shown only after a second check, for a short time; dependencies updated with no known vulnerabilities (React Router 7.18.6).
