const configuredBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "https://innoverse-api.innovitegra.in";

export const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, "");
export const AUTH_BASIC_USERNAME = import.meta.env.VITE_AUTH_BASIC_USERNAME || "webadmin";
export const AUTH_BASIC_PASSWORD = import.meta.env.VITE_AUTH_BASIC_PASSWORD;
export const NON_LOGIN_APIS_ENABLED = import.meta.env.VITE_ENABLE_NON_LOGIN_APIS === "true";

// The numeric `status` code meaning "Draft" (not yet submitted) on an
// Institution Profile record — confirmed live as 9, but not documented as a
// stable contract, so it's overridable via env instead of a second hardcoded
// literal if the backend ever renumbers it.
export const INSTITUTION_DRAFT_STATUS_CODE = Number(
  import.meta.env.VITE_INSTITUTION_DRAFT_STATUS_CODE ?? 9,
);

// Every backend route path called from src/Services/*.api.js, centralized
// here so a path only ever needs to be typed (and changed) in one place.
// Grouped by the domain that owns the route.
//
// KYC, APPLICATIONS, MENUS (admin config), and PENDING groups were removed —
// none of those paths exist anywhere in the official Postman collection
// ("InnoVerse_ConfigProcessor": Health & System, Auth, User Management,
// Profile (URMG), Master (Reference Data), Institution, Config - Acct).
// They were fictional REST shapes with no real backend behind them, gated
// behind NON_LOGIN_APIS_ENABLED so they never actually fired, along with
// their consuming services/hooks/pages/routes — deleted entirely rather
// than left as dead code pointing at endpoints that don't exist.
// ---------------------------------------------------------------------------
// Below is grouped to mirror the sidebar's own parent -> child order exactly
// (top-level module, then its menu items, in the order they appear in the
// nav), not alphabetically and not by when each group was added. When the
// sidebar gains/reorders a menu item, mirror that change here so this file
// stays a reliable map of "where do I find this page's API" by nav position.
//
// NOTE — there are THREE separate things named "KYC" in this app, each its
// own backend entity with its own routes. Do not merge or alias between
// them:
//   1. USER_MANAGEMENT.KYC       -> /user/kyc/*             (a user's own KYC record)
//   2. CONFIG_KYC (under EPURSE > Configuration > KYC) -> /config/kyc_group*, /config/kyc_group_level*, /config/kyc_group_level_data*, /config/kyc_group_level_process*, /config/kyc_group_level_document* (KYC group/level config used by Config - Acct)
//   3. DIGITAL_PRODUCT's "KYC Config" / "KYC Level" menu items -> /digital_product/kyc_config/*, /digital_product/kyc_level/* (per-product KYC requirement, via digitalProductApi("kyc_config") / ("kyc_level"))
// ---------------------------------------------------------------------------
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/user/login",
    REFRESH_TOKEN: "/user/refresh_token",
    CHANGE_PASSWORD: "/user/change_password",
  },

  HEALTH: "/health",

  // --- Institutions (top-level sidebar item) -------------------------------
  // Sub-menu order: Institution Profile, Institution Module, Institution
  // Legal, Institution Branding, Institution Channel, Institution Currency.
  INSTITUTION: {
    INSTITUTION_PROFILE: {
      LIST: "/institution/profile/list",
      GET_ACTIVE: "/institution/profile/get_active",
      ADD: "/institution/profile/add",
      SUBMIT: "/institution/profile/submit",
      AUDIT: "/institution/profile/audit",
      PENDING: "/institution/profile/pending",
      AUTH: "/institution/profile/auth",
      DEAUTH: "/institution/profile/deauth",
      EDIT: "/institution/profile/edit",
      DELETE: "/institution/profile/delete",
      DELETE_AUTH: "/institution/profile/delete_auth",
      DEACTIVATE: "/institution/profile/deactivate",
      REACTIVATE: "/institution/profile/reactivate",
    },
    INSTITUTION_MODULE: {
      ADD: "/institution/module/add",
      SUBMIT: "/institution/module/submit",
      EDIT: "/institution/module/edit",
      AUTH: "/institution/module/auth",
      DEAUTH: "/institution/module/deauth",
      DELETE: "/institution/module/delete",
      DELETE_AUTH: "/institution/module/delete_auth",
      DEACTIVATE: "/institution/module/deactivate",
      REACTIVATE: "/institution/module/reactivate",
      LIST: "/institution/module/list",
      GET_ACTIVE: "/institution/module/get_active",
      AUDIT: "/institution/module/audit",
      PENDING: "/institution/module/pending",
    },
    INSTITUTION_LEGAL: {
      ADD: "/institution/legal/add",
      SUBMIT: "/institution/legal/submit",
      EDIT: "/institution/legal/edit",
      AUTH: "/institution/legal/auth",
      DEAUTH: "/institution/legal/deauth",
      DELETE: "/institution/legal/delete",
      DELETE_AUTH: "/institution/legal/delete_auth",
      DEACTIVATE: "/institution/legal/deactivate",
      REACTIVATE: "/institution/legal/reactivate",
      LIST: "/institution/legal/list",
      GET_ACTIVE: "/institution/legal/get_active",
      AUDIT: "/institution/legal/audit",
      PENDING: "/institution/legal/pending",
    },
    INSTITUTION_BRANDING: {
      ADD: "/institution/branding/add", SUBMIT: "/institution/branding/submit", EDIT: "/institution/branding/edit", AUTH: "/institution/branding/auth", DEAUTH: "/institution/branding/deauth", DELETE: "/institution/branding/delete", DELETE_AUTH: "/institution/branding/delete_auth", DEACTIVATE: "/institution/branding/deactivate", REACTIVATE: "/institution/branding/reactivate", LIST: "/institution/branding/list", GET_ACTIVE: "/institution/branding/get_active", AUDIT: "/institution/branding/audit", PENDING: "/institution/branding/pending",
    },
    INSTITUTION_CHANNEL: {
      ADD: "/institution/channel/add", SUBMIT: "/institution/channel/submit", EDIT: "/institution/channel/edit", AUTH: "/institution/channel/auth", DEAUTH: "/institution/channel/deauth", DELETE: "/institution/channel/delete", DELETE_AUTH: "/institution/channel/delete_auth", DEACTIVATE: "/institution/channel/deactivate", REACTIVATE: "/institution/channel/reactivate", LIST: "/institution/channel/list", GET_ACTIVE: "/institution/channel/get_active", AUDIT: "/institution/channel/audit", PENDING: "/institution/channel/pending",
    },
    INSTITUTION_CURRENCY: {
      ADD: "/institution/currency/add", SUBMIT: "/institution/currency/submit", EDIT: "/institution/currency/edit", AUTH: "/institution/currency/auth", DEAUTH: "/institution/currency/deauth", DELETE: "/institution/currency/delete", DELETE_AUTH: "/institution/currency/delete_auth", DEACTIVATE: "/institution/currency/deactivate", REACTIVATE: "/institution/currency/reactivate", LIST: "/institution/currency/list", GET_ACTIVE: "/institution/currency/get_active", AUDIT: "/institution/currency/audit", PENDING: "/institution/currency/pending",
    },
  },

  // --- User Management (top-level sidebar item) ----------------------------
  // Sub-menu order: Profile, User, KYC (#1 of the three KYCs — see note
  // above), Password Policy. Anything not in this list (the old
  // /user/audit_list, /user/profile/audit_list, /profile/getall, singular
  // /user/kyc/get) was removed rather than kept as a dead alias.
  USER_MANAGEMENT: {
    // "Profile" here is a role/permission profile (menu_id/action_id
    // grants), NOT the Institution Profile entity under INSTITUTION above.
    PROFILE: {
      LIST: "/user/profile/list",
      SUBMIT: "/user/profile/submit",
      GET: "/user/profile/get",
      GET_ACTIVE: "/user/profile/get_active",
      ADD: "/user/profile/add",
      AUDIT: "/user/profile/audit",
      PENDING: "/user/profile/pending",
      AUTH: "/user/profile/auth",
      DEAUTH: "/user/profile/deauth",
      EDIT: "/user/profile/edit",
      DELETE: "/user/profile/delete",
      DELETE_AUTH: "/user/profile/delete_auth",
      DEACTIVATE: "/user/profile/deactivate",
      REACTIVATE: "/user/profile/reactivate",
    },
    USER: {
      LIST: "/user/list",
      SUBMIT: "/user/submit",
      GET: "/user/get",
      GET_ACTIVE: "/user/get_active",
      ADD: "/user/add",
      AUDIT: "/user/audit",
      PENDING: "/user/pending",
      AUTH: "/user/auth",
      DEAUTH: "/user/deauth",
      EDIT: "/user/edit",
      DELETE: "/user/delete",
      DELETE_AUTH: "/user/delete_auth",
      DEACTIVATE: "/user/deactivate",
      REACTIVATE: "/user/reactivate",
      PASSWORD_POLICY_LIST: "/user/password_policy/list",
    },
    // KYC (#1 of the three KYCs — see note at top of file): a user's own KYC
    // record, under /user/kyc/*. Confirmed live but not consumed by any page
    // yet (only the old singular /user/kyc/get was wired, as
    // usersApi.getKyc; kept working here under its new home).
    KYC: {
      LIST: "/user/kyc/list",
      GET: "/user/kyc/get",
      GET_ACTIVE: "/user/kyc/get_active",
      ADD: "/user/kyc/add",
      SUBMIT: "/user/kyc/submit",
      AUDIT: "/user/kyc/audit",
      PENDING: "/user/kyc/pending",
      AUTH: "/user/kyc/auth",
      DEAUTH: "/user/kyc/deauth",
      EDIT: "/user/kyc/edit",
      DELETE: "/user/kyc/delete",
      DELETE_AUTH: "/user/kyc/delete_auth",
      DEACTIVATE: "/user/kyc/deactivate",
      REACTIVATE: "/user/kyc/reactivate",
    },
    PASSWORD_POLICY: {
      LIST: "/user/password_policy/list",
      GET: "/user/password_policy/get",
      GET_ACTIVE: "/user/password_policy/get_active",
      ADD: "/user/password_policy/add",
      SUBMIT: "/user/password_policy/submit",
      EDIT: "/user/password_policy/edit",
      AUTH: "/user/password_policy/auth",
      DEAUTH: "/user/password_policy/deauth",
      DELETE: "/user/password_policy/delete",
      DELETE_AUTH: "/user/password_policy/delete_auth",
      DEACTIVATE: "/user/password_policy/deactivate",
      REACTIVATE: "/user/password_policy/reactivate",
      AUDIT: "/user/password_policy/audit",
      PENDING: "/user/password_policy/pending",
    },
  },

  // --- Reference-data lookups (no sidebar page of their own) ---------------
  // Backend dropped the trailing "/list" segment from every Master
  // (Reference Data) endpoint (2026-09 update) — paths below match exactly
  // what was given, no "/list" suffix. All are POST with body {}. These are
  // read-only dropdown sources consumed by other pages' forms, not entities
  // with their own sidebar entry or maker-checker CRUD (that's
  // MASTER_CONFIG below, for the Settings > Master pages).
  MASTER: {
    ACTION_LIST: "/master/action",
    STATUS_LIST: "/master/status",
    MODULE_LIST: "/master/module",
    MENU_LIST: "/master/menu",
    MENU_ACTION_LIST: "/master/menu_action",
    CHANNEL_LIST: "/master/channel",
    ACCT_PROD_TYPE_LIST: "/master/acct_prod_type",
    ACCT_OPERATION_MODE_LIST: "/master/acct_operation_mode",
    ACCT_DORMANCY_ACTION_LIST: "/master/acct_dormancy_action",
    ACCT_SEQUENCE_LIST: "/master/acct_sequence",
    TRANSACTION_LIST: "/master/transaction",
    FREQUENCY_LIST: "/master/frequency",
    KYC_PROCESS_LIST: "/master/kyc_process",
    PARTY_TYPE_LIST: "/master/party_type",
    INSTITUTION_TYPE_LIST: "/master/institution_type",
    OWNERSHIP_LIST: "/master/ownership",
    RESIDENCY_TYPE_LIST: "/master/residency_type",
    COUNTRY_LIST: "/master/country",
    CURRENCY_LIST: "/master/currency",
    LANGUAGE_LIST: "/master/language",
    // Confirmed live 2026-09: POST /master/timezone (no trailing "/list",
    // same as every other Master endpoint above), paginated — {page, limit}
    // in the body, {id, name, status, status_name} per record.
    TIMEZONE_LIST: "/master/timezone",
  },

  // Settings > Master pages above (District, Province, ...) are full
  // maker-checker CRUD entities served under /master_config/*, distinct
  // from the read-only /master/* reference lookups above — the sidebar
  // lists them under the same "Master" group but they hit a different base
  // path. Order matches the sidebar.
  MASTER_CONFIG: {
    PROVINCE: {
      ADD: "/master_config/province/add", SUBMIT: "/master_config/province/submit", LIST: "/master_config/province/list",
      GET_ACTIVE: "/master_config/province/get_active", AUDIT: "/master_config/province/audit", AUTH: "/master_config/province/auth",
      DEAUTH: "/master_config/province/deauth", EDIT: "/master_config/province/edit", DELETE: "/master_config/province/delete",
      DELETE_AUTH: "/master_config/province/delete_auth",
      PENDING: "/master_config/province/pending",
      DEACTIVATE: "/master_config/province/deactivate",
      REACTIVATE: "/master_config/province/reactivate",
    },
    DISTRICT: {
      ADD: "/master_config/district/add", SUBMIT: "/master_config/district/submit", LIST: "/master_config/district/list",
      GET_ACTIVE: "/master_config/district/get_active", AUDIT: "/master_config/district/audit", AUTH: "/master_config/district/auth",
      DEAUTH: "/master_config/district/deauth", EDIT: "/master_config/district/edit", DELETE: "/master_config/district/delete",
      DELETE_AUTH: "/master_config/district/delete_auth",
      PENDING: "/master_config/district/pending",
      DEACTIVATE: "/master_config/district/deactivate",
      REACTIVATE: "/master_config/district/reactivate",
    },
    VILLAGE: {
      ADD: "/master_config/village/add", SUBMIT: "/master_config/village/submit", LIST: "/master_config/village/list",
      GET_ACTIVE: "/master_config/village/get_active", AUDIT: "/master_config/village/audit", AUTH: "/master_config/village/auth",
      DEAUTH: "/master_config/village/deauth", EDIT: "/master_config/village/edit", DELETE: "/master_config/village/delete",
      DELETE_AUTH: "/master_config/village/delete_auth",
      PENDING: "/master_config/village/pending",
      DEACTIVATE: "/master_config/village/deactivate",
      REACTIVATE: "/master_config/village/reactivate",
    },
    GENDER: {
      ADD: "/master_config/gender/add", SUBMIT: "/master_config/gender/submit", LIST: "/master_config/gender/list",
      GET_ACTIVE: "/master_config/gender/get_active", AUDIT: "/master_config/gender/audit", AUTH: "/master_config/gender/auth",
      DEAUTH: "/master_config/gender/deauth", EDIT: "/master_config/gender/edit", DELETE: "/master_config/gender/delete",
      DELETE_AUTH: "/master_config/gender/delete_auth",
      PENDING: "/master_config/gender/pending",
      DEACTIVATE: "/master_config/gender/deactivate",
      REACTIVATE: "/master_config/gender/reactivate",
    },
    RELIGION: {
      ADD: "/master_config/indv_religion/add", SUBMIT: "/master_config/indv_religion/submit", LIST: "/master_config/indv_religion/list",
      GET_ACTIVE: "/master_config/indv_religion/get_active", AUDIT: "/master_config/indv_religion/audit", AUTH: "/master_config/indv_religion/auth",
      DEAUTH: "/master_config/indv_religion/deauth", EDIT: "/master_config/indv_religion/edit", DELETE: "/master_config/indv_religion/delete",
      DELETE_AUTH: "/master_config/indv_religion/delete_auth",
      PENDING: "/master_config/indv_religion/pending",
      DEACTIVATE: "/master_config/indv_religion/deactivate",
      REACTIVATE: "/master_config/indv_religion/reactivate",
    },
    QUALIFICATION: {
      ADD: "/master_config/indv_qualification/add", SUBMIT: "/master_config/indv_qualification/submit", LIST: "/master_config/indv_qualification/list",
      GET_ACTIVE: "/master_config/indv_qualification/get_active", AUDIT: "/master_config/indv_qualification/audit", AUTH: "/master_config/indv_qualification/auth",
      DEAUTH: "/master_config/indv_qualification/deauth", EDIT: "/master_config/indv_qualification/edit", DELETE: "/master_config/indv_qualification/delete",
      DELETE_AUTH: "/master_config/indv_qualification/delete_auth",
      PENDING: "/master_config/indv_qualification/pending",
      DEACTIVATE: "/master_config/indv_qualification/deactivate",
      REACTIVATE: "/master_config/indv_qualification/reactivate",
    },
    DISABILITY: {
      ADD: "/master_config/indv_disability/add", SUBMIT: "/master_config/indv_disability/submit", LIST: "/master_config/indv_disability/list",
      GET_ACTIVE: "/master_config/indv_disability/get_active", AUDIT: "/master_config/indv_disability/audit", AUTH: "/master_config/indv_disability/auth",
      DEAUTH: "/master_config/indv_disability/deauth", EDIT: "/master_config/indv_disability/edit", DELETE: "/master_config/indv_disability/delete",
      DELETE_AUTH: "/master_config/indv_disability/delete_auth",
      PENDING: "/master_config/indv_disability/pending",
      DEACTIVATE: "/master_config/indv_disability/deactivate",
      REACTIVATE: "/master_config/indv_disability/reactivate",
    },
    EMPLOYMENT: {
      ADD: "/master_config/indv_employment/add", SUBMIT: "/master_config/indv_employment/submit", LIST: "/master_config/indv_employment/list",
      GET_ACTIVE: "/master_config/indv_employment/get_active", AUDIT: "/master_config/indv_employment/audit", AUTH: "/master_config/indv_employment/auth",
      DEAUTH: "/master_config/indv_employment/deauth", EDIT: "/master_config/indv_employment/edit", DELETE: "/master_config/indv_employment/delete",
      DELETE_AUTH: "/master_config/indv_employment/delete_auth",
      PENDING: "/master_config/indv_employment/pending",
      DEACTIVATE: "/master_config/indv_employment/deactivate",
      REACTIVATE: "/master_config/indv_employment/reactivate",
    },
    OCCUPATION: {
      ADD: "/master_config/indv_occupation/add", SUBMIT: "/master_config/indv_occupation/submit", LIST: "/master_config/indv_occupation/list",
      GET_ACTIVE: "/master_config/indv_occupation/get_active", AUDIT: "/master_config/indv_occupation/audit", AUTH: "/master_config/indv_occupation/auth",
      DEAUTH: "/master_config/indv_occupation/deauth", EDIT: "/master_config/indv_occupation/edit", DELETE: "/master_config/indv_occupation/delete",
      DELETE_AUTH: "/master_config/indv_occupation/delete_auth",
      PENDING: "/master_config/indv_occupation/pending",
      DEACTIVATE: "/master_config/indv_occupation/deactivate",
      REACTIVATE: "/master_config/indv_occupation/reactivate",
    },
    SOURCE_OF_FUND: {
      ADD: "/master_config/indv_source_of_fund/add", SUBMIT: "/master_config/indv_source_of_fund/submit", LIST: "/master_config/indv_source_of_fund/list",
      GET_ACTIVE: "/master_config/indv_source_of_fund/get_active", AUDIT: "/master_config/indv_source_of_fund/audit", AUTH: "/master_config/indv_source_of_fund/auth",
      DEAUTH: "/master_config/indv_source_of_fund/deauth", EDIT: "/master_config/indv_source_of_fund/edit", DELETE: "/master_config/indv_source_of_fund/delete",
      DELETE_AUTH: "/master_config/indv_source_of_fund/delete_auth",
      PENDING: "/master_config/indv_source_of_fund/pending",
      DEACTIVATE: "/master_config/indv_source_of_fund/deactivate",
      REACTIVATE: "/master_config/indv_source_of_fund/reactivate",
    },
    ACCOUNT_PURPOSE: {
      ADD: "/master_config/indv_account_purpose/add", SUBMIT: "/master_config/indv_account_purpose/submit", LIST: "/master_config/indv_account_purpose/list",
      GET_ACTIVE: "/master_config/indv_account_purpose/get_active", AUDIT: "/master_config/indv_account_purpose/audit", AUTH: "/master_config/indv_account_purpose/auth",
      DEAUTH: "/master_config/indv_account_purpose/deauth", EDIT: "/master_config/indv_account_purpose/edit", DELETE: "/master_config/indv_account_purpose/delete",
      DELETE_AUTH: "/master_config/indv_account_purpose/delete_auth",
      PENDING: "/master_config/indv_account_purpose/pending",
      DEACTIVATE: "/master_config/indv_account_purpose/deactivate",
      REACTIVATE: "/master_config/indv_account_purpose/reactivate",
    },
    DESIGNATION: {
      ADD: "/master_config/indv_designation/add", SUBMIT: "/master_config/indv_designation/submit", LIST: "/master_config/indv_designation/list",
      GET_ACTIVE: "/master_config/indv_designation/get_active", AUDIT: "/master_config/indv_designation/audit", AUTH: "/master_config/indv_designation/auth",
      DEAUTH: "/master_config/indv_designation/deauth", EDIT: "/master_config/indv_designation/edit", DELETE: "/master_config/indv_designation/delete",
      DELETE_AUTH: "/master_config/indv_designation/delete_auth",
      PENDING: "/master_config/indv_designation/pending",
      DEACTIVATE: "/master_config/indv_designation/deactivate",
      REACTIVATE: "/master_config/indv_designation/reactivate",
    },
    // Individual Customer domain masters (2026-09) — same 13-route shape as
    // every entity above (e.g. GENDER); only ownership_sub_type additionally
    // carries an ownership_id field.
    MARITAL_STATUS: {
      ADD: "/master_config/indv_marital_status/add", SUBMIT: "/master_config/indv_marital_status/submit", LIST: "/master_config/indv_marital_status/list",
      GET_ACTIVE: "/master_config/indv_marital_status/get_active", AUDIT: "/master_config/indv_marital_status/audit", AUTH: "/master_config/indv_marital_status/auth",
      DEAUTH: "/master_config/indv_marital_status/deauth", EDIT: "/master_config/indv_marital_status/edit", DELETE: "/master_config/indv_marital_status/delete",
      DELETE_AUTH: "/master_config/indv_marital_status/delete_auth",
      PENDING: "/master_config/indv_marital_status/pending",
      DEACTIVATE: "/master_config/indv_marital_status/deactivate",
      REACTIVATE: "/master_config/indv_marital_status/reactivate",
    },
    VISA_TYPE: {
      ADD: "/master_config/indv_visa_type/add", SUBMIT: "/master_config/indv_visa_type/submit", LIST: "/master_config/indv_visa_type/list",
      GET_ACTIVE: "/master_config/indv_visa_type/get_active", AUDIT: "/master_config/indv_visa_type/audit", AUTH: "/master_config/indv_visa_type/auth",
      DEAUTH: "/master_config/indv_visa_type/deauth", EDIT: "/master_config/indv_visa_type/edit", DELETE: "/master_config/indv_visa_type/delete",
      DELETE_AUTH: "/master_config/indv_visa_type/delete_auth",
      PENDING: "/master_config/indv_visa_type/pending",
      DEACTIVATE: "/master_config/indv_visa_type/deactivate",
      REACTIVATE: "/master_config/indv_visa_type/reactivate",
    },
    IMMIGRATION_STATUS: {
      ADD: "/master_config/indv_immigration_status/add", SUBMIT: "/master_config/indv_immigration_status/submit", LIST: "/master_config/indv_immigration_status/list",
      GET_ACTIVE: "/master_config/indv_immigration_status/get_active", AUDIT: "/master_config/indv_immigration_status/audit", AUTH: "/master_config/indv_immigration_status/auth",
      DEAUTH: "/master_config/indv_immigration_status/deauth", EDIT: "/master_config/indv_immigration_status/edit", DELETE: "/master_config/indv_immigration_status/delete",
      DELETE_AUTH: "/master_config/indv_immigration_status/delete_auth",
      PENDING: "/master_config/indv_immigration_status/pending",
      DEACTIVATE: "/master_config/indv_immigration_status/deactivate",
      REACTIVATE: "/master_config/indv_immigration_status/reactivate",
    },
    ADDRESS_TYPE: {
      ADD: "/master_config/indv_address_type/add", SUBMIT: "/master_config/indv_address_type/submit", LIST: "/master_config/indv_address_type/list",
      GET_ACTIVE: "/master_config/indv_address_type/get_active", AUDIT: "/master_config/indv_address_type/audit", AUTH: "/master_config/indv_address_type/auth",
      DEAUTH: "/master_config/indv_address_type/deauth", EDIT: "/master_config/indv_address_type/edit", DELETE: "/master_config/indv_address_type/delete",
      DELETE_AUTH: "/master_config/indv_address_type/delete_auth",
      PENDING: "/master_config/indv_address_type/pending",
      DEACTIVATE: "/master_config/indv_address_type/deactivate",
      REACTIVATE: "/master_config/indv_address_type/reactivate",
    },
    RELATIONSHIP_TYPE: {
      ADD: "/master_config/indv_relationship_type/add", SUBMIT: "/master_config/indv_relationship_type/submit", LIST: "/master_config/indv_relationship_type/list",
      GET_ACTIVE: "/master_config/indv_relationship_type/get_active", AUDIT: "/master_config/indv_relationship_type/audit", AUTH: "/master_config/indv_relationship_type/auth",
      DEAUTH: "/master_config/indv_relationship_type/deauth", EDIT: "/master_config/indv_relationship_type/edit", DELETE: "/master_config/indv_relationship_type/delete",
      DELETE_AUTH: "/master_config/indv_relationship_type/delete_auth",
      PENDING: "/master_config/indv_relationship_type/pending",
      DEACTIVATE: "/master_config/indv_relationship_type/deactivate",
      REACTIVATE: "/master_config/indv_relationship_type/reactivate",
    },
    INDV_VERIFICATION_STATUS: {
      ADD: "/master_config/verification_status/add", SUBMIT: "/master_config/verification_status/submit", LIST: "/master_config/verification_status/list",
      GET_ACTIVE: "/master_config/verification_status/get_active", AUDIT: "/master_config/verification_status/audit", AUTH: "/master_config/verification_status/auth",
      DEAUTH: "/master_config/verification_status/deauth", EDIT: "/master_config/verification_status/edit", DELETE: "/master_config/verification_status/delete",
      DELETE_AUTH: "/master_config/verification_status/delete_auth",
      PENDING: "/master_config/verification_status/pending",
      DEACTIVATE: "/master_config/verification_status/deactivate",
      REACTIVATE: "/master_config/verification_status/reactivate",
    },
    INDV_VERIFICATION_METHOD: {
      ADD: "/master_config/verification_method/add", SUBMIT: "/master_config/verification_method/submit", LIST: "/master_config/verification_method/list",
      GET_ACTIVE: "/master_config/verification_method/get_active", AUDIT: "/master_config/verification_method/audit", AUTH: "/master_config/verification_method/auth",
      DEAUTH: "/master_config/verification_method/deauth", EDIT: "/master_config/verification_method/edit", DELETE: "/master_config/verification_method/delete",
      DELETE_AUTH: "/master_config/verification_method/delete_auth",
      PENDING: "/master_config/verification_method/pending",
      DEACTIVATE: "/master_config/verification_method/deactivate",
      REACTIVATE: "/master_config/verification_method/reactivate",
    },
    INDV_TAX_STATUS: {
      ADD: "/master_config/indv_tax_status/add", SUBMIT: "/master_config/indv_tax_status/submit", LIST: "/master_config/indv_tax_status/list",
      GET_ACTIVE: "/master_config/indv_tax_status/get_active", AUDIT: "/master_config/indv_tax_status/audit", AUTH: "/master_config/indv_tax_status/auth",
      DEAUTH: "/master_config/indv_tax_status/deauth", EDIT: "/master_config/indv_tax_status/edit", DELETE: "/master_config/indv_tax_status/delete",
      DELETE_AUTH: "/master_config/indv_tax_status/delete_auth",
      PENDING: "/master_config/indv_tax_status/pending",
      DEACTIVATE: "/master_config/indv_tax_status/deactivate",
      REACTIVATE: "/master_config/indv_tax_status/reactivate",
    },
    INDV_TAX_CLASSIFICATION: {
      ADD: "/master_config/indv_tax_classification/add", SUBMIT: "/master_config/indv_tax_classification/submit", LIST: "/master_config/indv_tax_classification/list",
      GET_ACTIVE: "/master_config/indv_tax_classification/get_active", AUDIT: "/master_config/indv_tax_classification/audit", AUTH: "/master_config/indv_tax_classification/auth",
      DEAUTH: "/master_config/indv_tax_classification/deauth", EDIT: "/master_config/indv_tax_classification/edit", DELETE: "/master_config/indv_tax_classification/delete",
      DELETE_AUTH: "/master_config/indv_tax_classification/delete_auth",
      PENDING: "/master_config/indv_tax_classification/pending",
      DEACTIVATE: "/master_config/indv_tax_classification/deactivate",
      REACTIVATE: "/master_config/indv_tax_classification/reactivate",
    },
    INDV_PEP_STATUS: {
      ADD: "/master_config/indv_pep_status/add", SUBMIT: "/master_config/indv_pep_status/submit", LIST: "/master_config/indv_pep_status/list",
      GET_ACTIVE: "/master_config/indv_pep_status/get_active", AUDIT: "/master_config/indv_pep_status/audit", AUTH: "/master_config/indv_pep_status/auth",
      DEAUTH: "/master_config/indv_pep_status/deauth", EDIT: "/master_config/indv_pep_status/edit", DELETE: "/master_config/indv_pep_status/delete",
      DELETE_AUTH: "/master_config/indv_pep_status/delete_auth",
      PENDING: "/master_config/indv_pep_status/pending",
      DEACTIVATE: "/master_config/indv_pep_status/deactivate",
      REACTIVATE: "/master_config/indv_pep_status/reactivate",
    },
    INDV_PEP_CATEGORY: {
      ADD: "/master_config/indv_pep_category/add", SUBMIT: "/master_config/indv_pep_category/submit", LIST: "/master_config/indv_pep_category/list",
      GET_ACTIVE: "/master_config/indv_pep_category/get_active", AUDIT: "/master_config/indv_pep_category/audit", AUTH: "/master_config/indv_pep_category/auth",
      DEAUTH: "/master_config/indv_pep_category/deauth", EDIT: "/master_config/indv_pep_category/edit", DELETE: "/master_config/indv_pep_category/delete",
      DELETE_AUTH: "/master_config/indv_pep_category/delete_auth",
      PENDING: "/master_config/indv_pep_category/pending",
      DEACTIVATE: "/master_config/indv_pep_category/deactivate",
      REACTIVATE: "/master_config/indv_pep_category/reactivate",
    },
    OWNERSHIP_SUB_TYPE: {
      ADD: "/master_config/ownership_sub_type/add", SUBMIT: "/master_config/ownership_sub_type/submit", LIST: "/master_config/ownership_sub_type/list",
      GET_ACTIVE: "/master_config/ownership_sub_type/get_active", AUDIT: "/master_config/ownership_sub_type/audit", AUTH: "/master_config/ownership_sub_type/auth",
      DEAUTH: "/master_config/ownership_sub_type/deauth", EDIT: "/master_config/ownership_sub_type/edit", DELETE: "/master_config/ownership_sub_type/delete",
      DELETE_AUTH: "/master_config/ownership_sub_type/delete_auth",
      PENDING: "/master_config/ownership_sub_type/pending",
      DEACTIVATE: "/master_config/ownership_sub_type/deactivate",
      REACTIVATE: "/master_config/ownership_sub_type/reactivate",
    },
    // Global (not institution-scoped) master of acceptable document names —
    // Individual Customer Onboarding Configuration reference (2026-09),
    // entity F. Feeds indv_document_type_config's document_type_id lookup.
    DOCUMENT_TYPE: {
      ADD: "/master_config/indv_document_type/add", SUBMIT: "/master_config/indv_document_type/submit", LIST: "/master_config/indv_document_type/list",
      GET_ACTIVE: "/master_config/indv_document_type/get_active", AUDIT: "/master_config/indv_document_type/audit", AUTH: "/master_config/indv_document_type/auth",
      DEAUTH: "/master_config/indv_document_type/deauth", EDIT: "/master_config/indv_document_type/edit", DELETE: "/master_config/indv_document_type/delete",
      DELETE_AUTH: "/master_config/indv_document_type/delete_auth",
      PENDING: "/master_config/indv_document_type/pending",
      DEACTIVATE: "/master_config/indv_document_type/deactivate",
      REACTIVATE: "/master_config/indv_document_type/reactivate",
    },
  },

  // --- EPURSE > Individual Customer Onboarding Configuration ---------------
  // 6 menu-wise, separated entities (no composite tree) that configure what
  // an institution's individual-customer onboarding wizard shows/requires —
  // see Individual_Customer_Onboarding_Configuration_APIs.md (2026-09).
  // Every path configCustomerApi(entity) calls, spelled out.
  CONFIG_CUSTOMER: {
    INDV_TYPE_CONFIG: {
      ADD: "/config/customer/indv_type_config/add", SUBMIT: "/config/customer/indv_type_config/submit", EDIT: "/config/customer/indv_type_config/edit",
      AUTH: "/config/customer/indv_type_config/auth", DEAUTH: "/config/customer/indv_type_config/deauth", DELETE: "/config/customer/indv_type_config/delete",
      DELETE_AUTH: "/config/customer/indv_type_config/delete_auth", LIST: "/config/customer/indv_type_config/list",
      GET_ACTIVE: "/config/customer/indv_type_config/get_active", AUDIT: "/config/customer/indv_type_config/audit",
      DEACTIVATE: "/config/customer/indv_type_config/deactivate", REACTIVATE: "/config/customer/indv_type_config/reactivate",
      PENDING: "/config/customer/indv_type_config/pending",
    },
    INDV_IDENTIFICATION_TYPE: {
      ADD: "/config/customer/indv_identification_type/add", SUBMIT: "/config/customer/indv_identification_type/submit", EDIT: "/config/customer/indv_identification_type/edit",
      AUTH: "/config/customer/indv_identification_type/auth", DEAUTH: "/config/customer/indv_identification_type/deauth", DELETE: "/config/customer/indv_identification_type/delete",
      DELETE_AUTH: "/config/customer/indv_identification_type/delete_auth", LIST: "/config/customer/indv_identification_type/list",
      GET_ACTIVE: "/config/customer/indv_identification_type/get_active", AUDIT: "/config/customer/indv_identification_type/audit",
      DEACTIVATE: "/config/customer/indv_identification_type/deactivate", REACTIVATE: "/config/customer/indv_identification_type/reactivate",
      PENDING: "/config/customer/indv_identification_type/pending",
    },
    INDV_ADDRESS_TYPE: {
      ADD: "/config/customer/indv_address_type/add", SUBMIT: "/config/customer/indv_address_type/submit", EDIT: "/config/customer/indv_address_type/edit",
      AUTH: "/config/customer/indv_address_type/auth", DEAUTH: "/config/customer/indv_address_type/deauth", DELETE: "/config/customer/indv_address_type/delete",
      DELETE_AUTH: "/config/customer/indv_address_type/delete_auth", LIST: "/config/customer/indv_address_type/list",
      GET_ACTIVE: "/config/customer/indv_address_type/get_active", AUDIT: "/config/customer/indv_address_type/audit",
      DEACTIVATE: "/config/customer/indv_address_type/deactivate", REACTIVATE: "/config/customer/indv_address_type/reactivate",
      PENDING: "/config/customer/indv_address_type/pending",
    },
    INDV_EMPLOYMENT_CONFIG: {
      ADD: "/config/customer/indv_employment_config/add", SUBMIT: "/config/customer/indv_employment_config/submit", EDIT: "/config/customer/indv_employment_config/edit",
      AUTH: "/config/customer/indv_employment_config/auth", DEAUTH: "/config/customer/indv_employment_config/deauth", DELETE: "/config/customer/indv_employment_config/delete",
      DELETE_AUTH: "/config/customer/indv_employment_config/delete_auth", LIST: "/config/customer/indv_employment_config/list",
      GET_ACTIVE: "/config/customer/indv_employment_config/get_active", AUDIT: "/config/customer/indv_employment_config/audit",
      DEACTIVATE: "/config/customer/indv_employment_config/deactivate", REACTIVATE: "/config/customer/indv_employment_config/reactivate",
      PENDING: "/config/customer/indv_employment_config/pending",
    },
    INDV_DOCUMENT_REQUIREMENT_CONFIG: {
      ADD: "/config/customer/indv_document_requirement_config/add", SUBMIT: "/config/customer/indv_document_requirement_config/submit", EDIT: "/config/customer/indv_document_requirement_config/edit",
      AUTH: "/config/customer/indv_document_requirement_config/auth", DEAUTH: "/config/customer/indv_document_requirement_config/deauth", DELETE: "/config/customer/indv_document_requirement_config/delete",
      DELETE_AUTH: "/config/customer/indv_document_requirement_config/delete_auth", LIST: "/config/customer/indv_document_requirement_config/list",
      GET_ACTIVE: "/config/customer/indv_document_requirement_config/get_active", AUDIT: "/config/customer/indv_document_requirement_config/audit",
      DEACTIVATE: "/config/customer/indv_document_requirement_config/deactivate", REACTIVATE: "/config/customer/indv_document_requirement_config/reactivate",
      PENDING: "/config/customer/indv_document_requirement_config/pending",
    },
    INDV_DOCUMENT_TYPE_CONFIG: {
      ADD: "/config/customer/indv_document_type_config/add", SUBMIT: "/config/customer/indv_document_type_config/submit", EDIT: "/config/customer/indv_document_type_config/edit",
      AUTH: "/config/customer/indv_document_type_config/auth", DEAUTH: "/config/customer/indv_document_type_config/deauth", DELETE: "/config/customer/indv_document_type_config/delete",
      DELETE_AUTH: "/config/customer/indv_document_type_config/delete_auth", LIST: "/config/customer/indv_document_type_config/list",
      GET_ACTIVE: "/config/customer/indv_document_type_config/get_active", AUDIT: "/config/customer/indv_document_type_config/audit",
      DEACTIVATE: "/config/customer/indv_document_type_config/deactivate", REACTIVATE: "/config/customer/indv_document_type_config/reactivate",
      PENDING: "/config/customer/indv_document_type_config/pending",
    },
  },

  // --- EPURSE > Settings > Configuration > Account -------------------------
  // "Account" (acct_product) plus its 16 sub-configs, every one of them
  // scoped to a parent acct_product_id. Every path configKycApi(entity)
  // calls, spelled out — nothing built from a template string at request
  // time. Full 13-route maker-checker lifecycle per entity, per the backend
  // reference (2026-09).
  CONFIG_ACCT: {
    ACCT_PRODUCT: {
      ADD: "/config/acct_product/add",
      SUBMIT: "/config/acct_product/submit",
      EDIT: "/config/acct_product/edit",
      AUTH: "/config/acct_product/auth",
      DEAUTH: "/config/acct_product/deauth",
      DELETE: "/config/acct_product/delete",
      DELETE_AUTH: "/config/acct_product/delete_auth",
      LIST: "/config/acct_product/list",
      GET_ACTIVE: "/config/acct_product/get_active",
      AUDIT: "/config/acct_product/audit",
      PENDING: "/config/acct_product/pending",
      DEACTIVATE: "/config/acct_product/deactivate",
      REACTIVATE: "/config/acct_product/reactivate",
    },
    ACCT_PRODUCT_OWNERSHIP: {
      ADD: "/config/acct_product_ownership/add",
      SUBMIT: "/config/acct_product_ownership/submit",
      EDIT: "/config/acct_product_ownership/edit",
      AUTH: "/config/acct_product_ownership/auth",
      DEAUTH: "/config/acct_product_ownership/deauth",
      DELETE: "/config/acct_product_ownership/delete",
      DELETE_AUTH: "/config/acct_product_ownership/delete_auth",
      LIST: "/config/acct_product_ownership/list",
      GET_ACTIVE: "/config/acct_product_ownership/get_active",
      AUDIT: "/config/acct_product_ownership/audit",
      PENDING: "/config/acct_product_ownership/pending",
      DEACTIVATE: "/config/acct_product_ownership/deactivate",
      REACTIVATE: "/config/acct_product_ownership/reactivate",
    },
    ACCT_PRODUCT_PARTY_TYPE: {
      ADD: "/config/acct_product_party_type/add",
      SUBMIT: "/config/acct_product_party_type/submit",
      EDIT: "/config/acct_product_party_type/edit",
      AUTH: "/config/acct_product_party_type/auth",
      DEAUTH: "/config/acct_product_party_type/deauth",
      DELETE: "/config/acct_product_party_type/delete",
      DELETE_AUTH: "/config/acct_product_party_type/delete_auth",
      LIST: "/config/acct_product_party_type/list",
      GET_ACTIVE: "/config/acct_product_party_type/get_active",
      AUDIT: "/config/acct_product_party_type/audit",
      PENDING: "/config/acct_product_party_type/pending",
      DEACTIVATE: "/config/acct_product_party_type/deactivate",
      REACTIVATE: "/config/acct_product_party_type/reactivate",
    },
    ACCT_PRODUCT_TRANSACTION: {
      ADD: "/config/acct_product_transaction/add",
      SUBMIT: "/config/acct_product_transaction/submit",
      EDIT: "/config/acct_product_transaction/edit",
      AUTH: "/config/acct_product_transaction/auth",
      DEAUTH: "/config/acct_product_transaction/deauth",
      DELETE: "/config/acct_product_transaction/delete",
      DELETE_AUTH: "/config/acct_product_transaction/delete_auth",
      LIST: "/config/acct_product_transaction/list",
      GET_ACTIVE: "/config/acct_product_transaction/get_active",
      AUDIT: "/config/acct_product_transaction/audit",
      PENDING: "/config/acct_product_transaction/pending",
      DEACTIVATE: "/config/acct_product_transaction/deactivate",
      REACTIVATE: "/config/acct_product_transaction/reactivate",
    },
    ACCT_PRODUCT_CHANNEL: {
      ADD: "/config/acct_product_channel/add",
      SUBMIT: "/config/acct_product_channel/submit",
      EDIT: "/config/acct_product_channel/edit",
      AUTH: "/config/acct_product_channel/auth",
      DEAUTH: "/config/acct_product_channel/deauth",
      DELETE: "/config/acct_product_channel/delete",
      DELETE_AUTH: "/config/acct_product_channel/delete_auth",
      LIST: "/config/acct_product_channel/list",
      GET_ACTIVE: "/config/acct_product_channel/get_active",
      AUDIT: "/config/acct_product_channel/audit",
      PENDING: "/config/acct_product_channel/pending",
      DEACTIVATE: "/config/acct_product_channel/deactivate",
      REACTIVATE: "/config/acct_product_channel/reactivate",
    },
    ACCT_PRODUCT_BALANCE_CONFIG: {
      ADD: "/config/acct_product_balance_config/add",
      SUBMIT: "/config/acct_product_balance_config/submit",
      EDIT: "/config/acct_product_balance_config/edit",
      AUTH: "/config/acct_product_balance_config/auth",
      DEAUTH: "/config/acct_product_balance_config/deauth",
      DELETE: "/config/acct_product_balance_config/delete",
      DELETE_AUTH: "/config/acct_product_balance_config/delete_auth",
      LIST: "/config/acct_product_balance_config/list",
      GET_ACTIVE: "/config/acct_product_balance_config/get_active",
      AUDIT: "/config/acct_product_balance_config/audit",
      PENDING: "/config/acct_product_balance_config/pending",
      DEACTIVATE: "/config/acct_product_balance_config/deactivate",
      REACTIVATE: "/config/acct_product_balance_config/reactivate",
    },
    ACCT_PRODUCT_GROUP_CONFIG: {
      ADD: "/config/acct_product_group_config/add",
      SUBMIT: "/config/acct_product_group_config/submit",
      EDIT: "/config/acct_product_group_config/edit",
      AUTH: "/config/acct_product_group_config/auth",
      DEAUTH: "/config/acct_product_group_config/deauth",
      DELETE: "/config/acct_product_group_config/delete",
      DELETE_AUTH: "/config/acct_product_group_config/delete_auth",
      LIST: "/config/acct_product_group_config/list",
      GET_ACTIVE: "/config/acct_product_group_config/get_active",
      AUDIT: "/config/acct_product_group_config/audit",
      PENDING: "/config/acct_product_group_config/pending",
      DEACTIVATE: "/config/acct_product_group_config/deactivate",
      REACTIVATE: "/config/acct_product_group_config/reactivate",
    },
    ACCT_PRODUCT_INTEREST_CONFIG: {
      ADD: "/config/acct_product_interest_config/add",
      SUBMIT: "/config/acct_product_interest_config/submit",
      EDIT: "/config/acct_product_interest_config/edit",
      AUTH: "/config/acct_product_interest_config/auth",
      DEAUTH: "/config/acct_product_interest_config/deauth",
      DELETE: "/config/acct_product_interest_config/delete",
      DELETE_AUTH: "/config/acct_product_interest_config/delete_auth",
      LIST: "/config/acct_product_interest_config/list",
      GET_ACTIVE: "/config/acct_product_interest_config/get_active",
      AUDIT: "/config/acct_product_interest_config/audit",
      PENDING: "/config/acct_product_interest_config/pending",
      DEACTIVATE: "/config/acct_product_interest_config/deactivate",
      REACTIVATE: "/config/acct_product_interest_config/reactivate",
    },
    ACCT_PRODUCT_JOINT_CONFIG: {
      ADD: "/config/acct_product_joint_config/add",
      SUBMIT: "/config/acct_product_joint_config/submit",
      EDIT: "/config/acct_product_joint_config/edit",
      AUTH: "/config/acct_product_joint_config/auth",
      DEAUTH: "/config/acct_product_joint_config/deauth",
      DELETE: "/config/acct_product_joint_config/delete",
      DELETE_AUTH: "/config/acct_product_joint_config/delete_auth",
      LIST: "/config/acct_product_joint_config/list",
      GET_ACTIVE: "/config/acct_product_joint_config/get_active",
      AUDIT: "/config/acct_product_joint_config/audit",
      PENDING: "/config/acct_product_joint_config/pending",
      DEACTIVATE: "/config/acct_product_joint_config/deactivate",
      REACTIVATE: "/config/acct_product_joint_config/reactivate",
    },
    ACCT_PRODUCT_LIFECYCLE_CONFIG: {
      ADD: "/config/acct_product_lifecycle_config/add",
      SUBMIT: "/config/acct_product_lifecycle_config/submit",
      EDIT: "/config/acct_product_lifecycle_config/edit",
      AUTH: "/config/acct_product_lifecycle_config/auth",
      DEAUTH: "/config/acct_product_lifecycle_config/deauth",
      DELETE: "/config/acct_product_lifecycle_config/delete",
      DELETE_AUTH: "/config/acct_product_lifecycle_config/delete_auth",
      LIST: "/config/acct_product_lifecycle_config/list",
      GET_ACTIVE: "/config/acct_product_lifecycle_config/get_active",
      AUDIT: "/config/acct_product_lifecycle_config/audit",
      PENDING: "/config/acct_product_lifecycle_config/pending",
      DEACTIVATE: "/config/acct_product_lifecycle_config/deactivate",
      REACTIVATE: "/config/acct_product_lifecycle_config/reactivate",
    },
    ACCT_PRODUCT_DORMANCY_CONFIG: {
      ADD: "/config/acct_product_dormancy_config/add",
      SUBMIT: "/config/acct_product_dormancy_config/submit",
      EDIT: "/config/acct_product_dormancy_config/edit",
      AUTH: "/config/acct_product_dormancy_config/auth",
      DEAUTH: "/config/acct_product_dormancy_config/deauth",
      DELETE: "/config/acct_product_dormancy_config/delete",
      DELETE_AUTH: "/config/acct_product_dormancy_config/delete_auth",
      LIST: "/config/acct_product_dormancy_config/list",
      GET_ACTIVE: "/config/acct_product_dormancy_config/get_active",
      AUDIT: "/config/acct_product_dormancy_config/audit",
      PENDING: "/config/acct_product_dormancy_config/pending",
      DEACTIVATE: "/config/acct_product_dormancy_config/deactivate",
      REACTIVATE: "/config/acct_product_dormancy_config/reactivate",
    },
    ACCT_PRODUCT_MINOR_CONFIG: {
      ADD: "/config/acct_product_minor_config/add",
      SUBMIT: "/config/acct_product_minor_config/submit",
      EDIT: "/config/acct_product_minor_config/edit",
      AUTH: "/config/acct_product_minor_config/auth",
      DEAUTH: "/config/acct_product_minor_config/deauth",
      DELETE: "/config/acct_product_minor_config/delete",
      DELETE_AUTH: "/config/acct_product_minor_config/delete_auth",
      LIST: "/config/acct_product_minor_config/list",
      GET_ACTIVE: "/config/acct_product_minor_config/get_active",
      AUDIT: "/config/acct_product_minor_config/audit",
      PENDING: "/config/acct_product_minor_config/pending",
      DEACTIVATE: "/config/acct_product_minor_config/deactivate",
      REACTIVATE: "/config/acct_product_minor_config/reactivate",
    },
    ACCT_PRODUCT_NOMINEE_CONFIG: {
      ADD: "/config/acct_product_nominee_config/add",
      SUBMIT: "/config/acct_product_nominee_config/submit",
      EDIT: "/config/acct_product_nominee_config/edit",
      AUTH: "/config/acct_product_nominee_config/auth",
      DEAUTH: "/config/acct_product_nominee_config/deauth",
      DELETE: "/config/acct_product_nominee_config/delete",
      DELETE_AUTH: "/config/acct_product_nominee_config/delete_auth",
      LIST: "/config/acct_product_nominee_config/list",
      GET_ACTIVE: "/config/acct_product_nominee_config/get_active",
      AUDIT: "/config/acct_product_nominee_config/audit",
      PENDING: "/config/acct_product_nominee_config/pending",
      DEACTIVATE: "/config/acct_product_nominee_config/deactivate",
      REACTIVATE: "/config/acct_product_nominee_config/reactivate",
    },
    ACCT_PRODUCT_NUMBERING_CONFIG: {
      ADD: "/config/acct_product_numbering_config/add",
      SUBMIT: "/config/acct_product_numbering_config/submit",
      EDIT: "/config/acct_product_numbering_config/edit",
      AUTH: "/config/acct_product_numbering_config/auth",
      DEAUTH: "/config/acct_product_numbering_config/deauth",
      DELETE: "/config/acct_product_numbering_config/delete",
      DELETE_AUTH: "/config/acct_product_numbering_config/delete_auth",
      LIST: "/config/acct_product_numbering_config/list",
      GET_ACTIVE: "/config/acct_product_numbering_config/get_active",
      AUDIT: "/config/acct_product_numbering_config/audit",
      PENDING: "/config/acct_product_numbering_config/pending",
      DEACTIVATE: "/config/acct_product_numbering_config/deactivate",
      REACTIVATE: "/config/acct_product_numbering_config/reactivate",
    },
    ACCT_PRODUCT_OPENING_CONFIG: {
      ADD: "/config/acct_product_opening_config/add",
      SUBMIT: "/config/acct_product_opening_config/submit",
      EDIT: "/config/acct_product_opening_config/edit",
      AUTH: "/config/acct_product_opening_config/auth",
      DEAUTH: "/config/acct_product_opening_config/deauth",
      DELETE: "/config/acct_product_opening_config/delete",
      DELETE_AUTH: "/config/acct_product_opening_config/delete_auth",
      LIST: "/config/acct_product_opening_config/list",
      GET_ACTIVE: "/config/acct_product_opening_config/get_active",
      AUDIT: "/config/acct_product_opening_config/audit",
      PENDING: "/config/acct_product_opening_config/pending",
      DEACTIVATE: "/config/acct_product_opening_config/deactivate",
      REACTIVATE: "/config/acct_product_opening_config/reactivate",
    },
    ACCT_PRODUCT_STATEMENT_CONFIG: {
      ADD: "/config/acct_product_statement_config/add",
      SUBMIT: "/config/acct_product_statement_config/submit",
      EDIT: "/config/acct_product_statement_config/edit",
      AUTH: "/config/acct_product_statement_config/auth",
      DEAUTH: "/config/acct_product_statement_config/deauth",
      DELETE: "/config/acct_product_statement_config/delete",
      DELETE_AUTH: "/config/acct_product_statement_config/delete_auth",
      LIST: "/config/acct_product_statement_config/list",
      GET_ACTIVE: "/config/acct_product_statement_config/get_active",
      AUDIT: "/config/acct_product_statement_config/audit",
      PENDING: "/config/acct_product_statement_config/pending",
      DEACTIVATE: "/config/acct_product_statement_config/deactivate",
      REACTIVATE: "/config/acct_product_statement_config/reactivate",
    },
    ACCT_PRODUCT_ALERT_CONFIG: {
      ADD: "/config/acct_product_alert_config/add",
      SUBMIT: "/config/acct_product_alert_config/submit",
      EDIT: "/config/acct_product_alert_config/edit",
      AUTH: "/config/acct_product_alert_config/auth",
      DEAUTH: "/config/acct_product_alert_config/deauth",
      DELETE: "/config/acct_product_alert_config/delete",
      DELETE_AUTH: "/config/acct_product_alert_config/delete_auth",
      LIST: "/config/acct_product_alert_config/list",
      GET_ACTIVE: "/config/acct_product_alert_config/get_active",
      AUDIT: "/config/acct_product_alert_config/audit",
      PENDING: "/config/acct_product_alert_config/pending",
      DEACTIVATE: "/config/acct_product_alert_config/deactivate",
      REACTIVATE: "/config/acct_product_alert_config/reactivate",
    },
  },

  // --- EPURSE > Settings > Configuration > KYC -----------------------------
  // KYC (#2 of the three KYCs — see note at top of file): KYC group/level
  // config consumed by Config - Acct, under /config/kyc_group*. Every path
  // configKycApi(entity) calls for these 5 entities, spelled out.
  CONFIG_KYC: {
    KYC_GROUP: {
      ADD: "/config/kyc/group/add", SUBMIT: "/config/kyc/group/submit", EDIT: "/config/kyc/group/edit",
      AUTH: "/config/kyc/group/auth", DEAUTH: "/config/kyc/group/deauth", DELETE: "/config/kyc/group/delete",
      DELETE_AUTH: "/config/kyc/group/delete_auth", LIST: "/config/kyc/group/list",
      GET_ACTIVE: "/config/kyc/group/get_active", AUDIT: "/config/kyc/group/audit",
      PENDING: "/config/kyc/group/pending",
      DEACTIVATE: "/config/kyc/group/deactivate",
      REACTIVATE: "/config/kyc/group/reactivate",
    },
    // KYC_GROUP_LEVEL/_DATA/_PROCESS/_DOCUMENT removed (Frontend fixes —
    // onboarding menus and corporate masters, 2026-09, fix 4): none of
    // these /config/kyc_group_level* routes exist on the backend any more
    // — a KYC scheme and all its levels are now one record edited whole
    // via /config/kyc/group (KYC_GROUP above, used by kycSchemeApi in
    // onboarding.api.js) — and nothing in this codebase actually called
    // configKycApi() with any of these four entity names.
  },

  // --- EPURSE > Digital Product ---------------------------------------------
  // Sub-menu order (as wired today): Product, Security Config, KYC Config
  // (#3 of the three KYCs — see note at top of file), KYC Level, Channel
  // Config, Channel Transaction, Eligibility Config, Residency.
  //
  // The sidebar shows additional items under Product (Product Ownership,
  // Product Party Type, Product Channel, Product Balance Configuration,
  // Product Group Configuration, Interest/Joint/Lifecycle/Dormancy/Minor/
  // Alert/Nominee/Numbering/Opening/Statement Configuration) — none of
  // those have a wired page or confirmed endpoint yet, so no path is listed
  // for them here; add it under this comment, following the same shape,
  // once a real endpoint exists.
  //
  // Every path digitalProductApi(entity) calls for these 9 entities,
  // spelled out — nothing built from a template string at request time.
  DIGITAL_PRODUCT: {
    PRODUCT: {
      ADD: "/digital_product/product/add", SUBMIT: "/digital_product/product/submit", EDIT: "/digital_product/product/edit",
      GET: "/digital_product/product/get",
      AUTH: "/digital_product/product/auth", DEAUTH: "/digital_product/product/deauth", DELETE: "/digital_product/product/delete",
      DELETE_AUTH: "/digital_product/product/delete_auth", LIST: "/digital_product/product/list",
      GET_ACTIVE: "/digital_product/product/get_active", AUDIT: "/digital_product/product/audit",
      DEACTIVATE: "/digital_product/product/deactivate", REACTIVATE: "/digital_product/product/reactivate",
      PENDING: "/digital_product/product/pending",
    },
    PRODUCT_MAP: {
      ADD: "/digital_product/product_map/add", SUBMIT: "/digital_product/product_map/submit", EDIT: "/digital_product/product_map/edit",
      AUTH: "/digital_product/product_map/auth", DEAUTH: "/digital_product/product_map/deauth", DELETE: "/digital_product/product_map/delete",
      DELETE_AUTH: "/digital_product/product_map/delete_auth", LIST: "/digital_product/product_map/list",
      GET_ACTIVE: "/digital_product/product_map/get_active", AUDIT: "/digital_product/product_map/audit",
      DEACTIVATE: "/digital_product/product_map/deactivate", REACTIVATE: "/digital_product/product_map/reactivate",
      PENDING: "/digital_product/product_map/pending",
    },
    SECURITY_CONFIG: {
      ADD: "/digital_product/security_config/add", SUBMIT: "/digital_product/security_config/submit", EDIT: "/digital_product/security_config/edit",
      AUTH: "/digital_product/security_config/auth", DEAUTH: "/digital_product/security_config/deauth", DELETE: "/digital_product/security_config/delete",
      DELETE_AUTH: "/digital_product/security_config/delete_auth", LIST: "/digital_product/security_config/list",
      GET_ACTIVE: "/digital_product/security_config/get_active", AUDIT: "/digital_product/security_config/audit",
      DEACTIVATE: "/digital_product/security_config/deactivate", REACTIVATE: "/digital_product/security_config/reactivate",
      PENDING: "/digital_product/security_config/pending",
    },
    KYC_CONFIG: {
      ADD: "/digital_product/kyc_config/add", SUBMIT: "/digital_product/kyc_config/submit", EDIT: "/digital_product/kyc_config/edit",
      AUTH: "/digital_product/kyc_config/auth", DEAUTH: "/digital_product/kyc_config/deauth", DELETE: "/digital_product/kyc_config/delete",
      DELETE_AUTH: "/digital_product/kyc_config/delete_auth", LIST: "/digital_product/kyc_config/list",
      GET_ACTIVE: "/digital_product/kyc_config/get_active", AUDIT: "/digital_product/kyc_config/audit",
      DEACTIVATE: "/digital_product/kyc_config/deactivate", REACTIVATE: "/digital_product/kyc_config/reactivate",
      PENDING: "/digital_product/kyc_config/pending",
    },
    KYC_LEVEL: {
      ADD: "/digital_product/kyc_level/add", SUBMIT: "/digital_product/kyc_level/submit", EDIT: "/digital_product/kyc_level/edit",
      AUTH: "/digital_product/kyc_level/auth", DEAUTH: "/digital_product/kyc_level/deauth", DELETE: "/digital_product/kyc_level/delete",
      DELETE_AUTH: "/digital_product/kyc_level/delete_auth", LIST: "/digital_product/kyc_level/list",
      GET_ACTIVE: "/digital_product/kyc_level/get_active", AUDIT: "/digital_product/kyc_level/audit",
      DEACTIVATE: "/digital_product/kyc_level/deactivate", REACTIVATE: "/digital_product/kyc_level/reactivate",
      PENDING: "/digital_product/kyc_level/pending",
    },
    CHANNEL_CONFIG: {
      ADD: "/digital_product/channel_config/add", SUBMIT: "/digital_product/channel_config/submit", EDIT: "/digital_product/channel_config/edit",
      AUTH: "/digital_product/channel_config/auth", DEAUTH: "/digital_product/channel_config/deauth", DELETE: "/digital_product/channel_config/delete",
      DELETE_AUTH: "/digital_product/channel_config/delete_auth", LIST: "/digital_product/channel_config/list",
      GET_ACTIVE: "/digital_product/channel_config/get_active", AUDIT: "/digital_product/channel_config/audit",
      DEACTIVATE: "/digital_product/channel_config/deactivate", REACTIVATE: "/digital_product/channel_config/reactivate",
      PENDING: "/digital_product/channel_config/pending",
    },
    CHANNEL_TRANSACTION: {
      ADD: "/digital_product/channel_transaction/add", SUBMIT: "/digital_product/channel_transaction/submit", EDIT: "/digital_product/channel_transaction/edit",
      AUTH: "/digital_product/channel_transaction/auth", DEAUTH: "/digital_product/channel_transaction/deauth", DELETE: "/digital_product/channel_transaction/delete",
      DELETE_AUTH: "/digital_product/channel_transaction/delete_auth", LIST: "/digital_product/channel_transaction/list",
      GET_ACTIVE: "/digital_product/channel_transaction/get_active", AUDIT: "/digital_product/channel_transaction/audit",
      DEACTIVATE: "/digital_product/channel_transaction/deactivate", REACTIVATE: "/digital_product/channel_transaction/reactivate",
      PENDING: "/digital_product/channel_transaction/pending",
    },
    ELIGIBILITY_CONFIG: {
      ADD: "/digital_product/eligibility_config/add", SUBMIT: "/digital_product/eligibility_config/submit", EDIT: "/digital_product/eligibility_config/edit",
      AUTH: "/digital_product/eligibility_config/auth", DEAUTH: "/digital_product/eligibility_config/deauth", DELETE: "/digital_product/eligibility_config/delete",
      DELETE_AUTH: "/digital_product/eligibility_config/delete_auth", LIST: "/digital_product/eligibility_config/list",
      GET_ACTIVE: "/digital_product/eligibility_config/get_active", AUDIT: "/digital_product/eligibility_config/audit",
      DEACTIVATE: "/digital_product/eligibility_config/deactivate", REACTIVATE: "/digital_product/eligibility_config/reactivate",
      PENDING: "/digital_product/eligibility_config/pending",
    },
    RESIDENCY: {
      ADD: "/digital_product/residency/add", SUBMIT: "/digital_product/residency/submit", EDIT: "/digital_product/residency/edit",
      AUTH: "/digital_product/residency/auth", DEAUTH: "/digital_product/residency/deauth", DELETE: "/digital_product/residency/delete",
      DELETE_AUTH: "/digital_product/residency/delete_auth", LIST: "/digital_product/residency/list",
      GET_ACTIVE: "/digital_product/residency/get_active", AUDIT: "/digital_product/residency/audit",
      DEACTIVATE: "/digital_product/residency/deactivate", REACTIVATE: "/digital_product/residency/reactivate",
      PENDING: "/digital_product/residency/pending",
    },
  },
  // Customer domain (2026-09 API reference). indv_profile is a composite
  // maker-checker root — same 13-route shape as DIGITAL_PRODUCT.PRODUCT,
  // with a `sections` object on add/edit instead of separate per-section
  // endpoints. indv_onboarding is the separate, non-maker-checker pre-profile
  // self-serve lookup (no audit/pending/auth/deauth — 5 routes only).
  CUSTOMER: {
    INDV_PROFILE: {
      ADD: "/customer/indv_profile/add", SUBMIT: "/customer/indv_profile/submit", EDIT: "/customer/indv_profile/edit",
      GET: "/customer/indv_profile/get",
      WIZARD_CONFIG: "/customer/indv_profile/wizard_config",
      AUTH: "/customer/indv_profile/auth", DEAUTH: "/customer/indv_profile/deauth", DELETE: "/customer/indv_profile/delete",
      DELETE_AUTH: "/customer/indv_profile/delete_auth", LIST: "/customer/indv_profile/list",
      GET_ACTIVE: "/customer/indv_profile/get_active", AUDIT: "/customer/indv_profile/audit",
      DEACTIVATE: "/customer/indv_profile/deactivate", REACTIVATE: "/customer/indv_profile/reactivate",
      PENDING: "/customer/indv_profile/pending",
    },
    INDV_ONBOARDING: {
      START: "/customer/indv_onboarding/start",
      RESUME: "/customer/indv_onboarding/resume",
      UPDATE_STEP: "/customer/indv_onboarding/update_step",
      GET: "/customer/indv_onboarding/get",
      LIST: "/customer/indv_onboarding/list",
    },
  },
};
