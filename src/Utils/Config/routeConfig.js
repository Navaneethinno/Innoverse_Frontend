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
  dashboard: { title: "Dashboard", breadcrumb: ["Dashboard"] },
  institutions: { title: "Institutions", breadcrumb: ["Institution", "Institutions"] },
  institutionmodule: { title: "Institution Module", breadcrumb: ["Institution", "Institution Module"] },
  institutionlegal: { title: "Institution Legal", breadcrumb: ["Institution", "Institution Legal"] },
  institutionbranding: { title: "Institution Branding", breadcrumb: ["Institution", "Institution Branding"] },
  institutionchannel: { title: "Institution Channel", breadcrumb: ["Institution", "Institution Channel"] },
  institutioncurrency: { title: "Institution Currency", breadcrumb: ["Institution", "Institution Currency"] },
  institutionprofile: {
    title: "Institution Profile",
    breadcrumb: ["Institution", "Institution Profile"],
  },
  users: { title: "Users", breadcrumb: ["User Management", "User"] },
  user: { title: "Users", breadcrumb: ["User Management", "User"] },
  profiles: { title: "Profiles", breadcrumb: ["User Management", "Profile"] },
  profile: { title: "Profiles", breadcrumb: ["User Management", "Profile"] },
  kyc: { title: "KYC", breadcrumb: ["User Management", "KYC"] },
  userkyc: { title: "KYC", breadcrumb: ["User Management", "KYC"] },
  passwordpolicy: { title: "Password Policy", breadcrumb: ["User Management", "Password Policy"] },
  "password-policy": { title: "Password Policy", breadcrumb: ["User Management", "Password Policy"] },
  "change-password": { title: "Change Password", breadcrumb: ["Settings", "Change Password"] },

  // --- EPURSE > Settings > Master (master_config maker-checker CRUD) ------
  gender: { title: "Gender", breadcrumb: ["Master", "Gender"] },
  district: { title: "District", breadcrumb: ["Master", "District"] },
  province: { title: "Province", breadcrumb: ["Master", "Province"] },
  village: { title: "Village", breadcrumb: ["Master", "Village"] },
  accountpurpose: { title: "Account Purpose", breadcrumb: ["Master", "Account Purpose"] },
  "account-purpose": { title: "Account Purpose", breadcrumb: ["Master", "Account Purpose"] },
  category: { title: "Category", breadcrumb: ["Master", "Category"] },
  citizenship: { title: "Citizenship", breadcrumb: ["Master", "Citizenship"] },
  designation: { title: "Designation", breadcrumb: ["Master", "Designation"] },
  disability: { title: "Disability", breadcrumb: ["Master", "Disability"] },
  employment: { title: "Employment", breadcrumb: ["Master", "Employment"] },
  occupation: { title: "Occupation", breadcrumb: ["Master", "Occupation"] },
  qualification: { title: "Qualification", breadcrumb: ["Master", "Qualification"] },
  religion: { title: "Religion", breadcrumb: ["Master", "Religion"] },
  turnover: { title: "Turnover", breadcrumb: ["Master", "Turnover"] },
  sourceoffund: { title: "Source Of Fund", breadcrumb: ["Master", "Source Of Fund"] },
  "source-of-fund": { title: "Source Of Fund", breadcrumb: ["Master", "Source Of Fund"] },

  // --- EPURSE > Settings > Configuration > KYC (config/kyc_group*) --------
  group: { title: "Group", breadcrumb: ["KYC", "Group"] },
  grouplevel: { title: "Group Level", breadcrumb: ["KYC", "Group Level"] },
  groupleveldata: { title: "Group Level Data", breadcrumb: ["KYC", "Group Level Data"] },
  grouplevelprocess: { title: "Group Level Process", breadcrumb: ["KYC", "Group Level Process"] },
  groupleveldocument: { title: "Group Level Document", breadcrumb: ["KYC", "Group Level Document"] },

  // --- EPURSE > Digital Product ---------------------------------------------
  // "digitalproductproduct": qualified slug for the Digital Product >
  // Product leaf, disambiguated from Account > Product — see
  // MenuItem.jsx's DISAMBIGUATE_BY_PARENT.
  digitalproductproduct: { title: "Product", breadcrumb: ["Digital Product", "Product"] },
  productmap: { title: "Product Map", breadcrumb: ["Digital Product", "Product Map"] },
  securityconfig: { title: "Security Config", breadcrumb: ["Digital Product", "Security Config"] },
  kycconfig: { title: "KYC Config", breadcrumb: ["Digital Product", "KYC Config"] },
  kyclevel: { title: "KYC Level", breadcrumb: ["Digital Product", "KYC Level"] },
  channelconfig: { title: "Channel Config", breadcrumb: ["Digital Product", "Channel Config"] },
  channeltransaction: { title: "Channel Transaction", breadcrumb: ["Digital Product", "Channel Transaction"] },
  eligibilityconfig: { title: "Eligibility Config", breadcrumb: ["Digital Product", "Eligibility Config"] },
  residency: { title: "Residency", breadcrumb: ["Digital Product", "Residency"] },

  // --- EPURSE > Settings > Configuration > Account (config/acct_product*) -
  // "accountproduct": qualified slug for the Account > Product leaf
  // (the acct_product entity itself), disambiguated from Digital Product >
  // Product — see MenuItem.jsx's DISAMBIGUATE_BY_PARENT. "Account" itself
  // is a non-clickable group header in the sidebar, not a real route.
  accountproduct: { title: "Product", breadcrumb: ["Account", "Product"] },
  productownership: { title: "Product Ownership", breadcrumb: ["Account", "Product Ownership"] },
  productpartytype: { title: "Product Party Type", breadcrumb: ["Account", "Product Party Type"] },
  producttransaction: { title: "Product Transaction", breadcrumb: ["Account", "Product Transaction"] },
  productchannel: { title: "Product Channel", breadcrumb: ["Account", "Product Channel"] },
  productbalanceconfiguration: { title: "Product Balance Configuration", breadcrumb: ["Account", "Product Balance Configuration"] },
  productgroupconfiguration: { title: "Product Group Configuration", breadcrumb: ["Account", "Product Group Configuration"] },
  interestconfiguration: { title: "Interest Configuration", breadcrumb: ["Account", "Interest Configuration"] },
  jointconfiguration: { title: "Joint Configuration", breadcrumb: ["Account", "Joint Configuration"] },
  lifecycleconfiguration: { title: "Lifecycle Configuration", breadcrumb: ["Account", "Lifecycle Configuration"] },
  dormancyconfiguration: { title: "Dormancy Configuration", breadcrumb: ["Account", "Dormancy Configuration"] },
  minorconfiguration: { title: "Minor Configuration", breadcrumb: ["Account", "Minor Configuration"] },
  nomineeconfiguration: { title: "Nominee Configuration", breadcrumb: ["Account", "Nominee Configuration"] },
  numberingconfiguration: { title: "Numbering Configuration", breadcrumb: ["Account", "Numbering Configuration"] },
  openingconfiguration: { title: "Opening Configuration", breadcrumb: ["Account", "Opening Configuration"] },
  statementconfiguration: { title: "Statement Configuration", breadcrumb: ["Account", "Statement Configuration"] },
  alertconfiguration: { title: "Alert Configuration", breadcrumb: ["Account", "Alert Configuration"] },
};

export function getRouteMetadata(pathname) {
  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
  return SEGMENT_LABELS[firstSegment] ?? SEGMENT_LABELS.dashboard;
}
