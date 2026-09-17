// Matches by the URL's first path segment rather than the full path,
// because the sidebar's fabricated navigation (MenuItem.jsx, ported from
// payseFrontend) always appends a random id — a click lands on paths like
// /user/<uuid> or /profile/<uuid>, not the clean /users or /profiles this
// file used to list as exact/prefix matches. Matching on the full path (or
// even a full-path prefix) meant almost every real page fell through to no
// match at all, and TopBar's breadcrumb silently showed "Dashboard"
// everywhere. Segment-based matching handles every current fabricated
// route (and any future one with the same slug) without needing this file
// hand-kept in sync with the router every time a new alias route is added.
// Two-level breadcrumb (module / menu) matching the sidebar's own module
// grouping (e.g. the "USER MANAGEMENT" section header containing "User" and
// "Profile" rows) so the top bar reads as a clear route, not just a bare
// page name.
const SEGMENT_LABELS = {
  dashboard: { titleKey: "crumbDashboard", breadcrumb: ["crumbDashboard"] },
  institutions: { titleKey: "crumbInstitutions", breadcrumb: ["crumbInstitution", "crumbInstitutions"] },
  institutionmodule: { titleKey: "crumbInstitutionModule", breadcrumb: ["crumbInstitution", "crumbInstitutionModule"] },
  institutionlegal: { titleKey: "crumbInstitutionLegal", breadcrumb: ["crumbInstitution", "crumbInstitutionLegal"] },
  institutionbranding: { titleKey: "crumbInstitutionBranding", breadcrumb: ["crumbInstitution", "crumbInstitutionBranding"] },
  institutionchannel: { titleKey: "crumbInstitutionChannel", breadcrumb: ["crumbInstitution", "crumbInstitutionChannel"] },
  institutioncurrency: { titleKey: "crumbInstitutionCurrency", breadcrumb: ["crumbInstitution", "crumbInstitutionCurrency"] },
  institutionprofile: {
    titleKey: "crumbInstitutionProfile",
    breadcrumb: ["crumbInstitution", "crumbInstitutionProfile"],
  },
  users: { titleKey: "crumbUsers", breadcrumb: ["crumbUserManagement", "crumbUser"] },
  user: { titleKey: "crumbUsers", breadcrumb: ["crumbUserManagement", "crumbUser"] },
  profiles: { titleKey: "crumbProfiles", breadcrumb: ["crumbUserManagement", "crumbProfile"] },
  profile: { titleKey: "crumbProfiles", breadcrumb: ["crumbUserManagement", "crumbProfile"] },
  kyc: { titleKey: "crumbKYC", breadcrumb: ["crumbUserManagement", "crumbKYC"] },
  userkyc: { titleKey: "crumbKYC", breadcrumb: ["crumbUserManagement", "crumbKYC"] },
  passwordpolicy: { titleKey: "crumbPasswordPolicy", breadcrumb: ["crumbUserManagement", "crumbPasswordPolicy"] },
  "password-policy": { titleKey: "crumbPasswordPolicy", breadcrumb: ["crumbUserManagement", "crumbPasswordPolicy"] },
  "change-password": { titleKey: "crumbChangePassword", breadcrumb: ["crumbSettings", "crumbChangePassword"] },

  // --- EPURSE > Settings > Master (master_config maker-checker CRUD) ------
  gender: { titleKey: "crumbGender", breadcrumb: ["crumbMaster", "crumbGender"] },
  district: { titleKey: "crumbDistrict", breadcrumb: ["crumbMaster", "crumbDistrict"] },
  province: { titleKey: "crumbProvince", breadcrumb: ["crumbMaster", "crumbProvince"] },
  village: { titleKey: "crumbVillage", breadcrumb: ["crumbMaster", "crumbVillage"] },
  accountpurpose: { titleKey: "crumbAccountPurpose", breadcrumb: ["crumbMaster", "crumbAccountPurpose"] },
  "account-purpose": { titleKey: "crumbAccountPurpose", breadcrumb: ["crumbMaster", "crumbAccountPurpose"] },
  category: { titleKey: "crumbCategory", breadcrumb: ["crumbMaster", "crumbCategory"] },
  citizenship: { titleKey: "crumbCitizenship", breadcrumb: ["crumbMaster", "crumbCitizenship"] },
  designation: { titleKey: "crumbDesignation", breadcrumb: ["crumbMaster", "crumbDesignation"] },
  disability: { titleKey: "crumbDisability", breadcrumb: ["crumbMaster", "crumbDisability"] },
  employment: { titleKey: "crumbEmployment", breadcrumb: ["crumbMaster", "crumbEmployment"] },
  occupation: { titleKey: "crumbOccupation", breadcrumb: ["crumbMaster", "crumbOccupation"] },
  qualification: { titleKey: "crumbQualification", breadcrumb: ["crumbMaster", "crumbQualification"] },
  religion: { titleKey: "crumbReligion", breadcrumb: ["crumbMaster", "crumbReligion"] },
  turnover: { titleKey: "crumbTurnover", breadcrumb: ["crumbMaster", "crumbTurnover"] },
  sourceoffund: { titleKey: "crumbSourceOfFund", breadcrumb: ["crumbMaster", "crumbSourceOfFund"] },
  "source-of-fund": { titleKey: "crumbSourceOfFund", breadcrumb: ["crumbMaster", "crumbSourceOfFund"] },

  // --- EPURSE > Settings > Configuration > KYC (config/kyc_group*) --------
  group: { titleKey: "crumbGroup", breadcrumb: ["crumbKYC", "crumbGroup"] },
  grouplevel: { titleKey: "crumbGroupLevel", breadcrumb: ["crumbKYC", "crumbGroupLevel"] },
  groupleveldata: { titleKey: "crumbGroupLevelData", breadcrumb: ["crumbKYC", "crumbGroupLevelData"] },
  grouplevelprocess: { titleKey: "crumbGroupLevelProcess", breadcrumb: ["crumbKYC", "crumbGroupLevelProcess"] },
  groupleveldocument: { titleKey: "crumbGroupLevelDocument", breadcrumb: ["crumbKYC", "crumbGroupLevelDocument"] },

  // --- EPURSE > Digital Product ---------------------------------------------
  // "digitalproductproduct": qualified slug for the Digital Product >
  // Product leaf, disambiguated from Account > Product — see
  // MenuItem.jsx's DISAMBIGUATE_BY_PARENT.
  digitalproduct: { titleKey: "crumbDigitalProduct", breadcrumb: ["crumbDigitalProduct", "crumbDigitalProduct"] },
  productmap: { titleKey: "crumbProductMap", breadcrumb: ["crumbDigitalProduct", "crumbProductMap"] },
  securityconfig: { titleKey: "crumbSecurityConfig", breadcrumb: ["crumbDigitalProduct", "crumbSecurityConfig"] },
  kycconfig: { titleKey: "crumbKYCConfig", breadcrumb: ["crumbDigitalProduct", "crumbKYCConfig"] },
  kyclevel: { titleKey: "crumbKYCLevel", breadcrumb: ["crumbDigitalProduct", "crumbKYCLevel"] },
  channelconfig: { titleKey: "crumbChannelConfig", breadcrumb: ["crumbDigitalProduct", "crumbChannelConfig"] },
  channeltransaction: { titleKey: "crumbChannelTransaction", breadcrumb: ["crumbDigitalProduct", "crumbChannelTransaction"] },
  eligibilityconfig: { titleKey: "crumbEligibilityConfig", breadcrumb: ["crumbDigitalProduct", "crumbEligibilityConfig"] },
  residency: { titleKey: "crumbResidency", breadcrumb: ["crumbDigitalProduct", "crumbResidency"] },

  // --- EPURSE > Settings > Configuration > Account (config/acct_product*) -
  // "accountproduct": qualified slug for the Account > Product leaf
  // (the acct_product entity itself), disambiguated from Digital Product >
  // Product — see MenuItem.jsx's DISAMBIGUATE_BY_PARENT. "Account" is
  // usually a non-clickable group header in the sidebar, not a real route —
  // except when a session's menu_array has none of Account's children
  // populated (see acctConfigRoutes.jsx's "account" fallback route), where
  // MenuItem.jsx treats it as an ordinary leaf and navigates to /account
  // directly; that needs its own breadcrumb entry too, or it falls through
  // to the generic "Dashboard" default.
  account: { titleKey: "crumbAccountProduct", breadcrumb: ["crumbAccount", "crumbAccountProduct"] },
  accountproduct: { titleKey: "crumbAccountProduct", breadcrumb: ["crumbAccount", "crumbAccountProduct"] },
  productownership: { titleKey: "crumbProductOwnership", breadcrumb: ["crumbAccount", "crumbProductOwnership"] },
  productpartytype: { titleKey: "crumbProductPartyType", breadcrumb: ["crumbAccount", "crumbProductPartyType"] },
  producttransaction: { titleKey: "crumbProductTransaction", breadcrumb: ["crumbAccount", "crumbProductTransaction"] },
  productchannel: { titleKey: "crumbProductChannel", breadcrumb: ["crumbAccount", "crumbProductChannel"] },
  productbalanceconfiguration: { titleKey: "crumbProductBalanceConfiguration", breadcrumb: ["crumbAccount", "crumbProductBalanceConfiguration"] },
  productgroupconfiguration: { titleKey: "crumbProductGroupConfiguration", breadcrumb: ["crumbAccount", "crumbProductGroupConfiguration"] },
  interestconfiguration: { titleKey: "crumbInterestConfiguration", breadcrumb: ["crumbAccount", "crumbInterestConfiguration"] },
  jointconfiguration: { titleKey: "crumbJointConfiguration", breadcrumb: ["crumbAccount", "crumbJointConfiguration"] },
  lifecycleconfiguration: { titleKey: "crumbLifecycleConfiguration", breadcrumb: ["crumbAccount", "crumbLifecycleConfiguration"] },
  dormancyconfiguration: { titleKey: "crumbDormancyConfiguration", breadcrumb: ["crumbAccount", "crumbDormancyConfiguration"] },
  minorconfiguration: { titleKey: "crumbMinorConfiguration", breadcrumb: ["crumbAccount", "crumbMinorConfiguration"] },
  nomineeconfiguration: { titleKey: "crumbNomineeConfiguration", breadcrumb: ["crumbAccount", "crumbNomineeConfiguration"] },
  numberingconfiguration: { titleKey: "crumbNumberingConfiguration", breadcrumb: ["crumbAccount", "crumbNumberingConfiguration"] },
  openingconfiguration: { titleKey: "crumbOpeningConfiguration", breadcrumb: ["crumbAccount", "crumbOpeningConfiguration"] },
  statementconfiguration: { titleKey: "crumbStatementConfiguration", breadcrumb: ["crumbAccount", "crumbStatementConfiguration"] },
  alertconfiguration: { titleKey: "crumbAlertConfiguration", breadcrumb: ["crumbAccount", "crumbAlertConfiguration"] },
};

export function getRouteMetadata(pathname) {
  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
  return SEGMENT_LABELS[firstSegment] ?? SEGMENT_LABELS.dashboard;
}

// Reverse lookup so PageBreadcrumbs.jsx can make a crumb clickable without
// its own separate, easy-to-forget-to-update path map (the previous one
// didn't cover every possible crumb text — e.g. "Account" had no entry and
// silently fell back to /dashboard). Every SEGMENT_LABELS key IS a real
// registered route segment, so this only ever points at routes that
// actually exist.
//
// Prefers an exact match on the LEAF label (a crumb's last/most specific
// segment, e.g. "Account Product") over a MODULE-level match (a crumb's
// first segment, e.g. "Account") — a leaf route is the more specific page a
// user would expect that exact word to open; only the module-level crumb
// itself (which has no more specific route of its own) falls back to
// whichever segment represents that module's own landing page.
export function getPathForCrumb(label) {
  const entries = Object.entries(SEGMENT_LABELS);
  const leafMatch = entries.find(([, meta]) => meta.breadcrumb[meta.breadcrumb.length - 1] === label);
  if (leafMatch) return leafMatch[0];
  const moduleMatch = entries.find(([, meta]) => meta.breadcrumb[0] === label);
  if (moduleMatch) return moduleMatch[0];
  return "dashboard";
}
