// Routes grouped by sidebar module, like payseFrontend's Router: one entry
// per module (INSTITUTION, USER MANAGEMENT, EPURSE, INNOAML, REPORTS), each built from the
// route files in that module's folder.
import { userRoutes } from "./UserManagement/userRoutes";
import { profileRoutes } from "./UserManagement/profileRoutes";
import { masterRoutes } from "./Epurse/masterRoutes";
import { accountRoutes } from "./Epurse/accountRoutes";
import { kycSchemesRoutes } from "./Epurse/kycSchemesRoutes";
import { digitalProductRoutes } from "./Epurse/digitalProductRoutes";
import { onboardingRoutes } from "./Epurse/onboardingRoutes";
import { onboardingMasterRoutes } from "./Epurse/onboardingMasterRoutes";
import { onboardingAliasRoutes } from "./Epurse/onboardingAliasRoutes";
import { notificationRoutes } from "./Epurse/notificationRoutes";
import { riskRoutes } from "./Epurse/riskRoutes";
import { mmsRoutes } from "./Merchant/mmsRoutes";
import { amlRoutes } from "./InnoAML/amlRoutes";
import { reportRoutes } from "./Reports/reportRoutes";
import { globalSettingsRoutes } from "./GlobalSettings/globalSettingsRoutes";
import { accountingRoutes } from "./Accounting/accountingRoutes";

export { publicRoutes } from "./publicRoutes";
export { dashboardRoutes } from "./dashboardRoutes";
export { institutionRoutes } from "./institutionRoutes";

export const userManagementRoutes = [...userRoutes, ...profileRoutes];

export const epurseRoutes = [
  ...masterRoutes, // Settings > Master (+ Onboarding Master > Individual pages)
  ...accountRoutes, // Configuration > Account
  ...kycSchemesRoutes, // Configuration > KYC
  ...digitalProductRoutes, // Digital Product
  ...onboardingRoutes, // Onboarding > Onboarding Wizard / Configuration
  ...onboardingMasterRoutes, // Onboarding > Onboarding Master
  ...onboardingAliasRoutes, // retired onboarding slugs
  ...notificationRoutes, // Notification Center
  ...riskRoutes, // Risk Assessment
  ...mmsRoutes, // MMS > Agents, Stores, Terminals
];

// InnoAML: AML Configuration (Setup, Internal Watchlists) and AML Screening
// (Screenings, Name Lookup, Match Review).
export const innoAmlRoutes = [...amlRoutes];

// Reports: User Activity, Risk Score Breakdown, AML Score Breakdown.
export const reportsRoutes = [...reportRoutes];

// Global Settings: Limit.
export { globalSettingsRoutes };

// Accounting: Chart of Accounts, GL Mapping, Manual Journal, GL Reports.
export { accountingRoutes };
