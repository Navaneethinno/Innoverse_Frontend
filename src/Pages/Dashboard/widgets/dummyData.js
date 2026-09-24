// Static dashboard data — intentionally not wired to any API (same rule as
// the original Control Space page: the dashboard must render instantly and
// never hang on a slow or missing endpoint). The shapes mirror what the
// real screens deal with (institutions, customer onboarding, customer-portal
// sources, KYC levels, WEB/APP channels) so a widget can later swap this for
// a live hook without changing its markup.

export const STATS = {
  totalInstitutions: 12,
  activeInstitutions: 10,
  pendingRequests: 23,
  myRequests: 7,
  activeCustomers: 1284,
  onboardingInProgress: 57,
};

// Customers onboarded per month, split individual / corporate.
export const ONBOARDING_TREND = [
  { month: "Apr", individual: 96, corporate: 14 },
  { month: "May", individual: 118, corporate: 19 },
  { month: "Jun", individual: 131, corporate: 17 },
  { month: "Jul", individual: 152, corporate: 26 },
  { month: "Aug", individual: 170, corporate: 31 },
  { month: "Sep", individual: 198, corporate: 38 },
];

// Where customers started their onboarding (created_by / channel).
export const CUSTOMER_SOURCES = [
  { key: "adminPanel", value: 612 },
  { key: "portalWeb", value: 438 },
  { key: "portalApp", value: 234 },
];

// Customers by highest KYC level reached.
export const KYC_LEVELS = [
  { level: "L1", customers: 402 },
  { level: "L2", customers: 537 },
  { level: "L3", customers: 281 },
  { level: "L4", customers: 64 },
];

// Pending maker-checker requests per module.
export const REQUEST_BREAKDOWN = [
  { key: "institutions", value: 4 },
  { key: "users", value: 3 },
  { key: "profiles", value: 2 },
  { key: "customerTypes", value: 5 },
  { key: "kycSchemes", value: 1 },
  { key: "customers", value: 8 },
];

// Latest onboarding activity. source: "admin" | "portal".
export const RECENT_ONBOARDING = [
  { id: "ONB-1042", name: "Aarav Sharma", type: "individual", customerType: "Savings — Student", source: "portal", status: "ACTIVE" },
  { id: "ONB-1041", name: "Blue Harbour Traders Pvt Ltd", type: "corporate", customerType: "Private limited company", source: "admin", status: "PENDING EDIT" },
  { id: "ONB-1040", name: "Maria Fernandes", type: "individual", customerType: "Salaried individual", source: "portal", status: "PENDING" },
  { id: "ONB-1039", name: "Kiran Stores", type: "corporate", customerType: "Sole proprietorship", source: "admin", status: "ACTIVE" },
  { id: "ONB-1038", name: "Joao Silva", type: "individual", customerType: "Savings — Minor", source: "admin", status: "REJECTED" },
];

// Institution channels that switch customer self-onboarding on/off.
export const CHANNELS = [
  { institution: "Bank A", web: true, app: true },
  { institution: "Bank B", web: true, app: false },
  { institution: "Coop Credit Union", web: false, app: true },
  { institution: "Metro Microfinance", web: false, app: false },
];
