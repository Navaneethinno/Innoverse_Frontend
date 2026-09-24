// Routes grouped by sidebar module, like payseFrontend's Router: one entry
// per module (INSTITUTION, USER MANAGEMENT, EPURSE), each built from the
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
];
