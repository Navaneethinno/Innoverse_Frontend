# Changelog

The release number is the `version` in `package.json`. It is shown on the sign-in page and at the bottom of the side menu, and each release is tagged in git as `vMAJOR.MINOR.PATCH` on the commit that is deployed. Raise the patch for fixes, the minor for new features, the major for breaking changes.

## 1.1.0

The release number stays 1.1.0 until the GitLab pipeline is set up.

- The sign-in MFA code and the password-reset code are sent in the credential envelope (RSA-OAEP, /auth/public_key), like the password.
- Loading, empty and page-not-found animations are drawn with SVG and CSS instead of an animation player, so the admin portal runs no WebAssembly; its page policy no longer allows it (script-src 'self').
- InnoRecon: a source file chosen in the browser is limited to the smaller of 20 MB (the API's request limit) and the source's own limit; larger files come through the source's SFTP collection.

- react-grid-layout 1.5.4 (1.5.2 shipped a stray binary and C source file in its npm package).

## 1.0.1

- Every upload stops a file over 10 MB before it is sent (bulk registration, bulk payouts, GL uploads, bank statement CSV, form translations CSV, gold documents, loan application and facility documents), the API's own limit.

## 1.0.0

First release.

- Sign in per institution, with maker-checker (one user proposes, another approves) on every setting and record.
- Modules: Institution, User Management, Global Settings, ePurse, InnoCBS (accounts, deposits, loans), Finance, InnoMMS, InnoAML, Case Management, InnoReports, InnoCMS (cards), InnoTreasury and InnoFMS (fuel).
- A dashboard per module, setup guides, live updates and the approval inbox.
- English, Portuguese and Arabic. Per-institution branding.
- Menus and buttons come only from the server's permissions and each record's allowed actions.
- Security review before release: Content-Security-Policy, framing blocked, nosniff, Referrer-Policy, Permissions-Policy and HSTS; the session kept per browser tab; full card numbers shown only after a second check, for a short time; dependencies updated with no known vulnerabilities (React Router 7.18.6).
