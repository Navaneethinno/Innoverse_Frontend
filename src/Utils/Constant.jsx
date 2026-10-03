const configuredBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "https://etakuapi.innovitegrasuite.com";
// Host only: every path below is the FULL route. Admin routes start with
// /config/, masters with /master/ or /customer/master_config/ (never /config), health
// is /health. A base ending in /config turns every master path into
// /config/master/... and 404s it. Live channels are host + path + /live.

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
//   1. USER_MANAGEMENT.KYC       -> /config/user/kyc/*   (a user's own KYC record)
//   2. CONFIG_KYC.KYC_GROUP      -> /config/kyc/group/*  (a KYC scheme and its levels, one record)
//   3. Digital product KYC       -> no routes of its own; part of /config/digital_product/product/*
// ---------------------------------------------------------------------------
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/config/user/login",
    REFRESH_TOKEN: "/config/user/refresh_token",
    CHANGE_PASSWORD: "/config/user/change_password",
    LOGOUT: "/config/user/logout",
  },

  HEALTH: "/health",

  // --- Institutions (top-level sidebar item) -------------------------------
  // Sub-menu order: Institution Profile, Institution Module, Institution
  // Legal, Institution Branding, Institution Channel, Institution Currency.
  INSTITUTION: {
    INSTITUTION_PROFILE: {
      LIST: "/config/institution/profile/list",
      GET_ACTIVE: "/config/institution/profile/get_active",
      ADD: "/config/institution/profile/add",
      SUBMIT: "/config/institution/profile/submit",
      AUDIT: "/config/institution/profile/audit",
      PENDING: "/config/institution/profile/pending",
      AUTH: "/config/institution/profile/auth",
      DEAUTH: "/config/institution/profile/deauth",
      EDIT: "/config/institution/profile/edit",
      DELETE: "/config/institution/profile/delete",
      DELETE_AUTH: "/config/institution/profile/delete_auth",
      DEACTIVATE: "/config/institution/profile/deactivate",
      REACTIVATE: "/config/institution/profile/reactivate",
    },
    INSTITUTION_MODULE: {
      ADD: "/config/institution/module/add",
      SUBMIT: "/config/institution/module/submit",
      EDIT: "/config/institution/module/edit",
      AUTH: "/config/institution/module/auth",
      DEAUTH: "/config/institution/module/deauth",
      DELETE: "/config/institution/module/delete",
      DELETE_AUTH: "/config/institution/module/delete_auth",
      DEACTIVATE: "/config/institution/module/deactivate",
      REACTIVATE: "/config/institution/module/reactivate",
      LIST: "/config/institution/module/list",
      GET_ACTIVE: "/config/institution/module/get_active",
      AUDIT: "/config/institution/module/audit",
      PENDING: "/config/institution/module/pending",
    },
    INSTITUTION_LEGAL: {
      ADD: "/config/institution/legal/add",
      SUBMIT: "/config/institution/legal/submit",
      EDIT: "/config/institution/legal/edit",
      AUTH: "/config/institution/legal/auth",
      DEAUTH: "/config/institution/legal/deauth",
      DELETE: "/config/institution/legal/delete",
      DELETE_AUTH: "/config/institution/legal/delete_auth",
      DEACTIVATE: "/config/institution/legal/deactivate",
      REACTIVATE: "/config/institution/legal/reactivate",
      LIST: "/config/institution/legal/list",
      GET_ACTIVE: "/config/institution/legal/get_active",
      AUDIT: "/config/institution/legal/audit",
      PENDING: "/config/institution/legal/pending",
    },
    INSTITUTION_BRANDING: {
      ADD: "/config/institution/branding/add", SUBMIT: "/config/institution/branding/submit", EDIT: "/config/institution/branding/edit", AUTH: "/config/institution/branding/auth", DEAUTH: "/config/institution/branding/deauth", DELETE: "/config/institution/branding/delete", DELETE_AUTH: "/config/institution/branding/delete_auth", DEACTIVATE: "/config/institution/branding/deactivate", REACTIVATE: "/config/institution/branding/reactivate", LIST: "/config/institution/branding/list", GET_ACTIVE: "/config/institution/branding/get_active", AUDIT: "/config/institution/branding/audit", PENDING: "/config/institution/branding/pending",
      // Logo: multipart upload -> stored path; `file` returns the image.
      UPLOAD: "/config/institution/branding/upload", FILE: "/config/institution/branding/file",
    },
    INSTITUTION_CHANNEL: {
      ADD: "/config/institution/channel/add", SUBMIT: "/config/institution/channel/submit", EDIT: "/config/institution/channel/edit", AUTH: "/config/institution/channel/auth", DEAUTH: "/config/institution/channel/deauth", DELETE: "/config/institution/channel/delete", DELETE_AUTH: "/config/institution/channel/delete_auth", DEACTIVATE: "/config/institution/channel/deactivate", REACTIVATE: "/config/institution/channel/reactivate", LIST: "/config/institution/channel/list", GET_ACTIVE: "/config/institution/channel/get_active", AUDIT: "/config/institution/channel/audit", PENDING: "/config/institution/channel/pending",
    },
    INSTITUTION_CURRENCY: {
      ADD: "/config/institution/currency/add", SUBMIT: "/config/institution/currency/submit", EDIT: "/config/institution/currency/edit", AUTH: "/config/institution/currency/auth", DEAUTH: "/config/institution/currency/deauth", DELETE: "/config/institution/currency/delete", DELETE_AUTH: "/config/institution/currency/delete_auth", DEACTIVATE: "/config/institution/currency/deactivate", REACTIVATE: "/config/institution/currency/reactivate", LIST: "/config/institution/currency/list", GET_ACTIVE: "/config/institution/currency/get_active", AUDIT: "/config/institution/currency/audit", PENDING: "/config/institution/currency/pending",
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
      LIST: "/config/user/profile/list",
      SUBMIT: "/config/user/profile/submit",
      GET: "/config/user/profile/get",
      GET_ACTIVE: "/config/user/profile/get_active",
      ADD: "/config/user/profile/add",
      AUDIT: "/config/user/profile/audit",
      PENDING: "/config/user/profile/pending",
      AUTH: "/config/user/profile/auth",
      DEAUTH: "/config/user/profile/deauth",
      EDIT: "/config/user/profile/edit",
      DELETE: "/config/user/profile/delete",
      DELETE_AUTH: "/config/user/profile/delete_auth",
    },
    USER: {
      LIST: "/config/user/list",
      SUBMIT: "/config/user/submit",
      GET: "/config/user/get",
      GET_ACTIVE: "/config/user/get_active",
      ADD: "/config/user/add",
      AUDIT: "/config/user/audit",
      PENDING: "/config/user/pending",
      AUTH: "/config/user/auth",
      DEAUTH: "/config/user/deauth",
      EDIT: "/config/user/edit",
      DELETE: "/config/user/delete",
      DELETE_AUTH: "/config/user/delete_auth",
      DEACTIVATE: "/config/user/deactivate",
      REACTIVATE: "/config/user/reactivate",
      PASSWORD_POLICY_LIST: "/config/user/password_policy/list",
    },
    // KYC (#1 of the three KYCs — see note at top of file): a user's own KYC
    // record, under /user/kyc/*. Confirmed live but not consumed by any page
    // yet (only the old singular /user/kyc/get was wired, as
    // usersApi.getKyc; kept working here under its new home).
    KYC: {
      LIST: "/config/user/kyc/list",
      GET: "/config/user/kyc/get",
      GET_ACTIVE: "/config/user/kyc/get_active",
      ADD: "/config/user/kyc/add",
      SUBMIT: "/config/user/kyc/submit",
      AUDIT: "/config/user/kyc/audit",
      PENDING: "/config/user/kyc/pending",
      AUTH: "/config/user/kyc/auth",
      DEAUTH: "/config/user/kyc/deauth",
      EDIT: "/config/user/kyc/edit",
      DELETE: "/config/user/kyc/delete",
      DELETE_AUTH: "/config/user/kyc/delete_auth",
      DEACTIVATE: "/config/user/kyc/deactivate",
      REACTIVATE: "/config/user/kyc/reactivate",
    },
    PASSWORD_POLICY: {
      LIST: "/config/user/password_policy/list",
      GET: "/config/user/password_policy/get",
      GET_ACTIVE: "/config/user/password_policy/get_active",
      ADD: "/config/user/password_policy/add",
      SUBMIT: "/config/user/password_policy/submit",
      EDIT: "/config/user/password_policy/edit",
      AUTH: "/config/user/password_policy/auth",
      DEAUTH: "/config/user/password_policy/deauth",
      DELETE: "/config/user/password_policy/delete",
      DELETE_AUTH: "/config/user/password_policy/delete_auth",
      DEACTIVATE: "/config/user/password_policy/deactivate",
      REACTIVATE: "/config/user/password_policy/reactivate",
      AUDIT: "/config/user/password_policy/audit",
      PENDING: "/config/user/password_policy/pending",
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
    // Public platform files (GET, no login, cacheable): FILE + "/" + stored
    // path, e.g. a country's image_src "platform/country/ad.png".
    FILE: "/master/file",
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
      ADD: "/customer/master_config/province/add", SUBMIT: "/customer/master_config/province/submit", LIST: "/customer/master_config/province/list",
      GET_ACTIVE: "/customer/master_config/province/get_active", AUDIT: "/customer/master_config/province/audit", AUTH: "/customer/master_config/province/auth",
      DEAUTH: "/customer/master_config/province/deauth", EDIT: "/customer/master_config/province/edit", DELETE: "/customer/master_config/province/delete",
      DELETE_AUTH: "/customer/master_config/province/delete_auth",
      PENDING: "/customer/master_config/province/pending",
      DEACTIVATE: "/customer/master_config/province/deactivate",
      REACTIVATE: "/customer/master_config/province/reactivate",
    },
    DISTRICT: {
      ADD: "/customer/master_config/district/add", SUBMIT: "/customer/master_config/district/submit", LIST: "/customer/master_config/district/list",
      GET_ACTIVE: "/customer/master_config/district/get_active", AUDIT: "/customer/master_config/district/audit", AUTH: "/customer/master_config/district/auth",
      DEAUTH: "/customer/master_config/district/deauth", EDIT: "/customer/master_config/district/edit", DELETE: "/customer/master_config/district/delete",
      DELETE_AUTH: "/customer/master_config/district/delete_auth",
      PENDING: "/customer/master_config/district/pending",
      DEACTIVATE: "/customer/master_config/district/deactivate",
      REACTIVATE: "/customer/master_config/district/reactivate",
    },
    VILLAGE: {
      ADD: "/customer/master_config/village/add", SUBMIT: "/customer/master_config/village/submit", LIST: "/customer/master_config/village/list",
      GET_ACTIVE: "/customer/master_config/village/get_active", AUDIT: "/customer/master_config/village/audit", AUTH: "/customer/master_config/village/auth",
      DEAUTH: "/customer/master_config/village/deauth", EDIT: "/customer/master_config/village/edit", DELETE: "/customer/master_config/village/delete",
      DELETE_AUTH: "/customer/master_config/village/delete_auth",
      PENDING: "/customer/master_config/village/pending",
      DEACTIVATE: "/customer/master_config/village/deactivate",
      REACTIVATE: "/customer/master_config/village/reactivate",
    },
    GENDER: {
      ADD: "/customer/master_config/gender/add", SUBMIT: "/customer/master_config/gender/submit", LIST: "/customer/master_config/gender/list",
      GET_ACTIVE: "/customer/master_config/gender/get_active", AUDIT: "/customer/master_config/gender/audit", AUTH: "/customer/master_config/gender/auth",
      DEAUTH: "/customer/master_config/gender/deauth", EDIT: "/customer/master_config/gender/edit", DELETE: "/customer/master_config/gender/delete",
      DELETE_AUTH: "/customer/master_config/gender/delete_auth",
      PENDING: "/customer/master_config/gender/pending",
      DEACTIVATE: "/customer/master_config/gender/deactivate",
      REACTIVATE: "/customer/master_config/gender/reactivate",
    },
    RELIGION: {
      ADD: "/customer/master_config/indv_religion/add", SUBMIT: "/customer/master_config/indv_religion/submit", LIST: "/customer/master_config/indv_religion/list",
      GET_ACTIVE: "/customer/master_config/indv_religion/get_active", AUDIT: "/customer/master_config/indv_religion/audit", AUTH: "/customer/master_config/indv_religion/auth",
      DEAUTH: "/customer/master_config/indv_religion/deauth", EDIT: "/customer/master_config/indv_religion/edit", DELETE: "/customer/master_config/indv_religion/delete",
      DELETE_AUTH: "/customer/master_config/indv_religion/delete_auth",
      PENDING: "/customer/master_config/indv_religion/pending",
      DEACTIVATE: "/customer/master_config/indv_religion/deactivate",
      REACTIVATE: "/customer/master_config/indv_religion/reactivate",
    },
    QUALIFICATION: {
      ADD: "/customer/master_config/indv_qualification/add", SUBMIT: "/customer/master_config/indv_qualification/submit", LIST: "/customer/master_config/indv_qualification/list",
      GET_ACTIVE: "/customer/master_config/indv_qualification/get_active", AUDIT: "/customer/master_config/indv_qualification/audit", AUTH: "/customer/master_config/indv_qualification/auth",
      DEAUTH: "/customer/master_config/indv_qualification/deauth", EDIT: "/customer/master_config/indv_qualification/edit", DELETE: "/customer/master_config/indv_qualification/delete",
      DELETE_AUTH: "/customer/master_config/indv_qualification/delete_auth",
      PENDING: "/customer/master_config/indv_qualification/pending",
      DEACTIVATE: "/customer/master_config/indv_qualification/deactivate",
      REACTIVATE: "/customer/master_config/indv_qualification/reactivate",
    },
    DISABILITY: {
      ADD: "/customer/master_config/indv_disability/add", SUBMIT: "/customer/master_config/indv_disability/submit", LIST: "/customer/master_config/indv_disability/list",
      GET_ACTIVE: "/customer/master_config/indv_disability/get_active", AUDIT: "/customer/master_config/indv_disability/audit", AUTH: "/customer/master_config/indv_disability/auth",
      DEAUTH: "/customer/master_config/indv_disability/deauth", EDIT: "/customer/master_config/indv_disability/edit", DELETE: "/customer/master_config/indv_disability/delete",
      DELETE_AUTH: "/customer/master_config/indv_disability/delete_auth",
      PENDING: "/customer/master_config/indv_disability/pending",
      DEACTIVATE: "/customer/master_config/indv_disability/deactivate",
      REACTIVATE: "/customer/master_config/indv_disability/reactivate",
    },
    EMPLOYMENT: {
      ADD: "/customer/master_config/indv_employment/add", SUBMIT: "/customer/master_config/indv_employment/submit", LIST: "/customer/master_config/indv_employment/list",
      GET_ACTIVE: "/customer/master_config/indv_employment/get_active", AUDIT: "/customer/master_config/indv_employment/audit", AUTH: "/customer/master_config/indv_employment/auth",
      DEAUTH: "/customer/master_config/indv_employment/deauth", EDIT: "/customer/master_config/indv_employment/edit", DELETE: "/customer/master_config/indv_employment/delete",
      DELETE_AUTH: "/customer/master_config/indv_employment/delete_auth",
      PENDING: "/customer/master_config/indv_employment/pending",
      DEACTIVATE: "/customer/master_config/indv_employment/deactivate",
      REACTIVATE: "/customer/master_config/indv_employment/reactivate",
    },
    OCCUPATION: {
      ADD: "/customer/master_config/indv_occupation/add", SUBMIT: "/customer/master_config/indv_occupation/submit", LIST: "/customer/master_config/indv_occupation/list",
      GET_ACTIVE: "/customer/master_config/indv_occupation/get_active", AUDIT: "/customer/master_config/indv_occupation/audit", AUTH: "/customer/master_config/indv_occupation/auth",
      DEAUTH: "/customer/master_config/indv_occupation/deauth", EDIT: "/customer/master_config/indv_occupation/edit", DELETE: "/customer/master_config/indv_occupation/delete",
      DELETE_AUTH: "/customer/master_config/indv_occupation/delete_auth",
      PENDING: "/customer/master_config/indv_occupation/pending",
      DEACTIVATE: "/customer/master_config/indv_occupation/deactivate",
      REACTIVATE: "/customer/master_config/indv_occupation/reactivate",
    },
    SOURCE_OF_FUND: {
      ADD: "/customer/master_config/indv_source_of_fund/add", SUBMIT: "/customer/master_config/indv_source_of_fund/submit", LIST: "/customer/master_config/indv_source_of_fund/list",
      GET_ACTIVE: "/customer/master_config/indv_source_of_fund/get_active", AUDIT: "/customer/master_config/indv_source_of_fund/audit", AUTH: "/customer/master_config/indv_source_of_fund/auth",
      DEAUTH: "/customer/master_config/indv_source_of_fund/deauth", EDIT: "/customer/master_config/indv_source_of_fund/edit", DELETE: "/customer/master_config/indv_source_of_fund/delete",
      DELETE_AUTH: "/customer/master_config/indv_source_of_fund/delete_auth",
      PENDING: "/customer/master_config/indv_source_of_fund/pending",
      DEACTIVATE: "/customer/master_config/indv_source_of_fund/deactivate",
      REACTIVATE: "/customer/master_config/indv_source_of_fund/reactivate",
    },
    ACCOUNT_PURPOSE: {
      ADD: "/customer/master_config/indv_account_purpose/add", SUBMIT: "/customer/master_config/indv_account_purpose/submit", LIST: "/customer/master_config/indv_account_purpose/list",
      GET_ACTIVE: "/customer/master_config/indv_account_purpose/get_active", AUDIT: "/customer/master_config/indv_account_purpose/audit", AUTH: "/customer/master_config/indv_account_purpose/auth",
      DEAUTH: "/customer/master_config/indv_account_purpose/deauth", EDIT: "/customer/master_config/indv_account_purpose/edit", DELETE: "/customer/master_config/indv_account_purpose/delete",
      DELETE_AUTH: "/customer/master_config/indv_account_purpose/delete_auth",
      PENDING: "/customer/master_config/indv_account_purpose/pending",
      DEACTIVATE: "/customer/master_config/indv_account_purpose/deactivate",
      REACTIVATE: "/customer/master_config/indv_account_purpose/reactivate",
    },
    DESIGNATION: {
      ADD: "/customer/master_config/indv_designation/add", SUBMIT: "/customer/master_config/indv_designation/submit", LIST: "/customer/master_config/indv_designation/list",
      GET_ACTIVE: "/customer/master_config/indv_designation/get_active", AUDIT: "/customer/master_config/indv_designation/audit", AUTH: "/customer/master_config/indv_designation/auth",
      DEAUTH: "/customer/master_config/indv_designation/deauth", EDIT: "/customer/master_config/indv_designation/edit", DELETE: "/customer/master_config/indv_designation/delete",
      DELETE_AUTH: "/customer/master_config/indv_designation/delete_auth",
      PENDING: "/customer/master_config/indv_designation/pending",
      DEACTIVATE: "/customer/master_config/indv_designation/deactivate",
      REACTIVATE: "/customer/master_config/indv_designation/reactivate",
    },
    // Individual Customer domain masters (2026-09) — same 13-route shape as
    // every entity above (e.g. GENDER); only ownership_sub_type additionally
    // carries an ownership_id field.
    MARITAL_STATUS: {
      ADD: "/customer/master_config/indv_marital_status/add", SUBMIT: "/customer/master_config/indv_marital_status/submit", LIST: "/customer/master_config/indv_marital_status/list",
      GET_ACTIVE: "/customer/master_config/indv_marital_status/get_active", AUDIT: "/customer/master_config/indv_marital_status/audit", AUTH: "/customer/master_config/indv_marital_status/auth",
      DEAUTH: "/customer/master_config/indv_marital_status/deauth", EDIT: "/customer/master_config/indv_marital_status/edit", DELETE: "/customer/master_config/indv_marital_status/delete",
      DELETE_AUTH: "/customer/master_config/indv_marital_status/delete_auth",
      PENDING: "/customer/master_config/indv_marital_status/pending",
      DEACTIVATE: "/customer/master_config/indv_marital_status/deactivate",
      REACTIVATE: "/customer/master_config/indv_marital_status/reactivate",
    },
    VISA_TYPE: {
      ADD: "/customer/master_config/indv_visa_type/add", SUBMIT: "/customer/master_config/indv_visa_type/submit", LIST: "/customer/master_config/indv_visa_type/list",
      GET_ACTIVE: "/customer/master_config/indv_visa_type/get_active", AUDIT: "/customer/master_config/indv_visa_type/audit", AUTH: "/customer/master_config/indv_visa_type/auth",
      DEAUTH: "/customer/master_config/indv_visa_type/deauth", EDIT: "/customer/master_config/indv_visa_type/edit", DELETE: "/customer/master_config/indv_visa_type/delete",
      DELETE_AUTH: "/customer/master_config/indv_visa_type/delete_auth",
      PENDING: "/customer/master_config/indv_visa_type/pending",
      DEACTIVATE: "/customer/master_config/indv_visa_type/deactivate",
      REACTIVATE: "/customer/master_config/indv_visa_type/reactivate",
    },
    IMMIGRATION_STATUS: {
      ADD: "/customer/master_config/indv_immigration_status/add", SUBMIT: "/customer/master_config/indv_immigration_status/submit", LIST: "/customer/master_config/indv_immigration_status/list",
      GET_ACTIVE: "/customer/master_config/indv_immigration_status/get_active", AUDIT: "/customer/master_config/indv_immigration_status/audit", AUTH: "/customer/master_config/indv_immigration_status/auth",
      DEAUTH: "/customer/master_config/indv_immigration_status/deauth", EDIT: "/customer/master_config/indv_immigration_status/edit", DELETE: "/customer/master_config/indv_immigration_status/delete",
      DELETE_AUTH: "/customer/master_config/indv_immigration_status/delete_auth",
      PENDING: "/customer/master_config/indv_immigration_status/pending",
      DEACTIVATE: "/customer/master_config/indv_immigration_status/deactivate",
      REACTIVATE: "/customer/master_config/indv_immigration_status/reactivate",
    },
    ADDRESS_TYPE: {
      ADD: "/customer/master_config/indv_address_type/add", SUBMIT: "/customer/master_config/indv_address_type/submit", LIST: "/customer/master_config/indv_address_type/list",
      GET_ACTIVE: "/customer/master_config/indv_address_type/get_active", AUDIT: "/customer/master_config/indv_address_type/audit", AUTH: "/customer/master_config/indv_address_type/auth",
      DEAUTH: "/customer/master_config/indv_address_type/deauth", EDIT: "/customer/master_config/indv_address_type/edit", DELETE: "/customer/master_config/indv_address_type/delete",
      DELETE_AUTH: "/customer/master_config/indv_address_type/delete_auth",
      PENDING: "/customer/master_config/indv_address_type/pending",
      DEACTIVATE: "/customer/master_config/indv_address_type/deactivate",
      REACTIVATE: "/customer/master_config/indv_address_type/reactivate",
    },
    RELATIONSHIP_TYPE: {
      ADD: "/customer/master_config/indv_relationship_type/add", SUBMIT: "/customer/master_config/indv_relationship_type/submit", LIST: "/customer/master_config/indv_relationship_type/list",
      GET_ACTIVE: "/customer/master_config/indv_relationship_type/get_active", AUDIT: "/customer/master_config/indv_relationship_type/audit", AUTH: "/customer/master_config/indv_relationship_type/auth",
      DEAUTH: "/customer/master_config/indv_relationship_type/deauth", EDIT: "/customer/master_config/indv_relationship_type/edit", DELETE: "/customer/master_config/indv_relationship_type/delete",
      DELETE_AUTH: "/customer/master_config/indv_relationship_type/delete_auth",
      PENDING: "/customer/master_config/indv_relationship_type/pending",
      DEACTIVATE: "/customer/master_config/indv_relationship_type/deactivate",
      REACTIVATE: "/customer/master_config/indv_relationship_type/reactivate",
    },
    INDV_VERIFICATION_STATUS: {
      ADD: "/customer/master_config/verification_status/add", SUBMIT: "/customer/master_config/verification_status/submit", LIST: "/customer/master_config/verification_status/list",
      GET_ACTIVE: "/customer/master_config/verification_status/get_active", AUDIT: "/customer/master_config/verification_status/audit", AUTH: "/customer/master_config/verification_status/auth",
      DEAUTH: "/customer/master_config/verification_status/deauth", EDIT: "/customer/master_config/verification_status/edit", DELETE: "/customer/master_config/verification_status/delete",
      DELETE_AUTH: "/customer/master_config/verification_status/delete_auth",
      PENDING: "/customer/master_config/verification_status/pending",
      DEACTIVATE: "/customer/master_config/verification_status/deactivate",
      REACTIVATE: "/customer/master_config/verification_status/reactivate",
    },
    INDV_VERIFICATION_METHOD: {
      ADD: "/customer/master_config/verification_method/add", SUBMIT: "/customer/master_config/verification_method/submit", LIST: "/customer/master_config/verification_method/list",
      GET_ACTIVE: "/customer/master_config/verification_method/get_active", AUDIT: "/customer/master_config/verification_method/audit", AUTH: "/customer/master_config/verification_method/auth",
      DEAUTH: "/customer/master_config/verification_method/deauth", EDIT: "/customer/master_config/verification_method/edit", DELETE: "/customer/master_config/verification_method/delete",
      DELETE_AUTH: "/customer/master_config/verification_method/delete_auth",
      PENDING: "/customer/master_config/verification_method/pending",
      DEACTIVATE: "/customer/master_config/verification_method/deactivate",
      REACTIVATE: "/customer/master_config/verification_method/reactivate",
    },
    INDV_TAX_STATUS: {
      ADD: "/customer/master_config/indv_tax_status/add", SUBMIT: "/customer/master_config/indv_tax_status/submit", LIST: "/customer/master_config/indv_tax_status/list",
      GET_ACTIVE: "/customer/master_config/indv_tax_status/get_active", AUDIT: "/customer/master_config/indv_tax_status/audit", AUTH: "/customer/master_config/indv_tax_status/auth",
      DEAUTH: "/customer/master_config/indv_tax_status/deauth", EDIT: "/customer/master_config/indv_tax_status/edit", DELETE: "/customer/master_config/indv_tax_status/delete",
      DELETE_AUTH: "/customer/master_config/indv_tax_status/delete_auth",
      PENDING: "/customer/master_config/indv_tax_status/pending",
      DEACTIVATE: "/customer/master_config/indv_tax_status/deactivate",
      REACTIVATE: "/customer/master_config/indv_tax_status/reactivate",
    },
    INDV_TAX_CLASSIFICATION: {
      ADD: "/customer/master_config/indv_tax_classification/add", SUBMIT: "/customer/master_config/indv_tax_classification/submit", LIST: "/customer/master_config/indv_tax_classification/list",
      GET_ACTIVE: "/customer/master_config/indv_tax_classification/get_active", AUDIT: "/customer/master_config/indv_tax_classification/audit", AUTH: "/customer/master_config/indv_tax_classification/auth",
      DEAUTH: "/customer/master_config/indv_tax_classification/deauth", EDIT: "/customer/master_config/indv_tax_classification/edit", DELETE: "/customer/master_config/indv_tax_classification/delete",
      DELETE_AUTH: "/customer/master_config/indv_tax_classification/delete_auth",
      PENDING: "/customer/master_config/indv_tax_classification/pending",
      DEACTIVATE: "/customer/master_config/indv_tax_classification/deactivate",
      REACTIVATE: "/customer/master_config/indv_tax_classification/reactivate",
    },
    INDV_PEP_STATUS: {
      ADD: "/customer/master_config/indv_pep_status/add", SUBMIT: "/customer/master_config/indv_pep_status/submit", LIST: "/customer/master_config/indv_pep_status/list",
      GET_ACTIVE: "/customer/master_config/indv_pep_status/get_active", AUDIT: "/customer/master_config/indv_pep_status/audit", AUTH: "/customer/master_config/indv_pep_status/auth",
      DEAUTH: "/customer/master_config/indv_pep_status/deauth", EDIT: "/customer/master_config/indv_pep_status/edit", DELETE: "/customer/master_config/indv_pep_status/delete",
      DELETE_AUTH: "/customer/master_config/indv_pep_status/delete_auth",
      PENDING: "/customer/master_config/indv_pep_status/pending",
      DEACTIVATE: "/customer/master_config/indv_pep_status/deactivate",
      REACTIVATE: "/customer/master_config/indv_pep_status/reactivate",
    },
    INDV_PEP_CATEGORY: {
      ADD: "/customer/master_config/indv_pep_category/add", SUBMIT: "/customer/master_config/indv_pep_category/submit", LIST: "/customer/master_config/indv_pep_category/list",
      GET_ACTIVE: "/customer/master_config/indv_pep_category/get_active", AUDIT: "/customer/master_config/indv_pep_category/audit", AUTH: "/customer/master_config/indv_pep_category/auth",
      DEAUTH: "/customer/master_config/indv_pep_category/deauth", EDIT: "/customer/master_config/indv_pep_category/edit", DELETE: "/customer/master_config/indv_pep_category/delete",
      DELETE_AUTH: "/customer/master_config/indv_pep_category/delete_auth",
      PENDING: "/customer/master_config/indv_pep_category/pending",
      DEACTIVATE: "/customer/master_config/indv_pep_category/deactivate",
      REACTIVATE: "/customer/master_config/indv_pep_category/reactivate",
    },
    OWNERSHIP_SUB_TYPE: {
      ADD: "/customer/master_config/ownership_sub_type/add", SUBMIT: "/customer/master_config/ownership_sub_type/submit", LIST: "/customer/master_config/ownership_sub_type/list",
      GET_ACTIVE: "/customer/master_config/ownership_sub_type/get_active", AUDIT: "/customer/master_config/ownership_sub_type/audit", AUTH: "/customer/master_config/ownership_sub_type/auth",
      DEAUTH: "/customer/master_config/ownership_sub_type/deauth", EDIT: "/customer/master_config/ownership_sub_type/edit", DELETE: "/customer/master_config/ownership_sub_type/delete",
      DELETE_AUTH: "/customer/master_config/ownership_sub_type/delete_auth",
      PENDING: "/customer/master_config/ownership_sub_type/pending",
      DEACTIVATE: "/customer/master_config/ownership_sub_type/deactivate",
      REACTIVATE: "/customer/master_config/ownership_sub_type/reactivate",
    },
    // Global (not institution-scoped) master of acceptable document names —
    // Individual Customer Onboarding Configuration reference (2026-09),
    // entity F. Feeds indv_document_type_config's document_type_id lookup.
    DOCUMENT_TYPE: {
      ADD: "/customer/master_config/indv_document_type/add", SUBMIT: "/customer/master_config/indv_document_type/submit", LIST: "/customer/master_config/indv_document_type/list",
      GET_ACTIVE: "/customer/master_config/indv_document_type/get_active", AUDIT: "/customer/master_config/indv_document_type/audit", AUTH: "/customer/master_config/indv_document_type/auth",
      DEAUTH: "/customer/master_config/indv_document_type/deauth", EDIT: "/customer/master_config/indv_document_type/edit", DELETE: "/customer/master_config/indv_document_type/delete",
      DELETE_AUTH: "/customer/master_config/indv_document_type/delete_auth",
      PENDING: "/customer/master_config/indv_document_type/pending",
      DEACTIVATE: "/customer/master_config/indv_document_type/deactivate",
      REACTIVATE: "/customer/master_config/indv_document_type/reactivate",
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
      ADD: "/config/acct/product/add",
      SUBMIT: "/config/acct/product/submit",
      EDIT: "/config/acct/product/edit",
      AUTH: "/config/acct/product/auth",
      DEAUTH: "/config/acct/product/deauth",
      DELETE: "/config/acct/product/delete",
      DELETE_AUTH: "/config/acct/product/delete_auth",
      LIST: "/config/acct/product/list",
      GET_ACTIVE: "/config/acct/product/get_active",
      AUDIT: "/config/acct/product/audit",
      PENDING: "/config/acct/product/pending",
      DEACTIVATE: "/config/acct/product/deactivate",
      REACTIVATE: "/config/acct/product/reactivate",
    },
    ACCT_PRODUCT_OWNERSHIP: {
      ADD: "/config/acct/ownership/add",
      SUBMIT: "/config/acct/ownership/submit",
      EDIT: "/config/acct/ownership/edit",
      AUTH: "/config/acct/ownership/auth",
      DEAUTH: "/config/acct/ownership/deauth",
      DELETE: "/config/acct/ownership/delete",
      DELETE_AUTH: "/config/acct/ownership/delete_auth",
      LIST: "/config/acct/ownership/list",
      GET_ACTIVE: "/config/acct/ownership/get_active",
      AUDIT: "/config/acct/ownership/audit",
      PENDING: "/config/acct/ownership/pending",
      DEACTIVATE: "/config/acct/ownership/deactivate",
      REACTIVATE: "/config/acct/ownership/reactivate",
    },
    ACCT_PRODUCT_PARTY_TYPE: {
      ADD: "/config/acct/party_type/add",
      SUBMIT: "/config/acct/party_type/submit",
      EDIT: "/config/acct/party_type/edit",
      AUTH: "/config/acct/party_type/auth",
      DEAUTH: "/config/acct/party_type/deauth",
      DELETE: "/config/acct/party_type/delete",
      DELETE_AUTH: "/config/acct/party_type/delete_auth",
      LIST: "/config/acct/party_type/list",
      GET_ACTIVE: "/config/acct/party_type/get_active",
      AUDIT: "/config/acct/party_type/audit",
      PENDING: "/config/acct/party_type/pending",
      DEACTIVATE: "/config/acct/party_type/deactivate",
      REACTIVATE: "/config/acct/party_type/reactivate",
    },
    ACCT_PRODUCT_TRANSACTION: {
      ADD: "/config/acct/transaction/add",
      SUBMIT: "/config/acct/transaction/submit",
      EDIT: "/config/acct/transaction/edit",
      AUTH: "/config/acct/transaction/auth",
      DEAUTH: "/config/acct/transaction/deauth",
      DELETE: "/config/acct/transaction/delete",
      DELETE_AUTH: "/config/acct/transaction/delete_auth",
      LIST: "/config/acct/transaction/list",
      GET_ACTIVE: "/config/acct/transaction/get_active",
      AUDIT: "/config/acct/transaction/audit",
      PENDING: "/config/acct/transaction/pending",
      DEACTIVATE: "/config/acct/transaction/deactivate",
      REACTIVATE: "/config/acct/transaction/reactivate",
    },
    ACCT_PRODUCT_CHANNEL: {
      ADD: "/config/acct/channel/add",
      SUBMIT: "/config/acct/channel/submit",
      EDIT: "/config/acct/channel/edit",
      AUTH: "/config/acct/channel/auth",
      DEAUTH: "/config/acct/channel/deauth",
      DELETE: "/config/acct/channel/delete",
      DELETE_AUTH: "/config/acct/channel/delete_auth",
      LIST: "/config/acct/channel/list",
      GET_ACTIVE: "/config/acct/channel/get_active",
      AUDIT: "/config/acct/channel/audit",
      PENDING: "/config/acct/channel/pending",
      DEACTIVATE: "/config/acct/channel/deactivate",
      REACTIVATE: "/config/acct/channel/reactivate",
    },
    ACCT_PRODUCT_BALANCE_CONFIG: {
      ADD: "/config/acct/balance_config/add",
      SUBMIT: "/config/acct/balance_config/submit",
      EDIT: "/config/acct/balance_config/edit",
      AUTH: "/config/acct/balance_config/auth",
      DEAUTH: "/config/acct/balance_config/deauth",
      DELETE: "/config/acct/balance_config/delete",
      DELETE_AUTH: "/config/acct/balance_config/delete_auth",
      LIST: "/config/acct/balance_config/list",
      GET_ACTIVE: "/config/acct/balance_config/get_active",
      AUDIT: "/config/acct/balance_config/audit",
      PENDING: "/config/acct/balance_config/pending",
      DEACTIVATE: "/config/acct/balance_config/deactivate",
      REACTIVATE: "/config/acct/balance_config/reactivate",
    },
    ACCT_PRODUCT_GROUP_CONFIG: {
      ADD: "/config/acct/group_config/add",
      SUBMIT: "/config/acct/group_config/submit",
      EDIT: "/config/acct/group_config/edit",
      AUTH: "/config/acct/group_config/auth",
      DEAUTH: "/config/acct/group_config/deauth",
      DELETE: "/config/acct/group_config/delete",
      DELETE_AUTH: "/config/acct/group_config/delete_auth",
      LIST: "/config/acct/group_config/list",
      GET_ACTIVE: "/config/acct/group_config/get_active",
      AUDIT: "/config/acct/group_config/audit",
      PENDING: "/config/acct/group_config/pending",
      DEACTIVATE: "/config/acct/group_config/deactivate",
      REACTIVATE: "/config/acct/group_config/reactivate",
    },
    ACCT_PRODUCT_INTEREST_CONFIG: {
      ADD: "/config/acct/interest_config/add",
      SUBMIT: "/config/acct/interest_config/submit",
      EDIT: "/config/acct/interest_config/edit",
      AUTH: "/config/acct/interest_config/auth",
      DEAUTH: "/config/acct/interest_config/deauth",
      DELETE: "/config/acct/interest_config/delete",
      DELETE_AUTH: "/config/acct/interest_config/delete_auth",
      LIST: "/config/acct/interest_config/list",
      GET_ACTIVE: "/config/acct/interest_config/get_active",
      AUDIT: "/config/acct/interest_config/audit",
      PENDING: "/config/acct/interest_config/pending",
      DEACTIVATE: "/config/acct/interest_config/deactivate",
      REACTIVATE: "/config/acct/interest_config/reactivate",
    },
    ACCT_PRODUCT_JOINT_CONFIG: {
      ADD: "/config/acct/joint_config/add",
      SUBMIT: "/config/acct/joint_config/submit",
      EDIT: "/config/acct/joint_config/edit",
      AUTH: "/config/acct/joint_config/auth",
      DEAUTH: "/config/acct/joint_config/deauth",
      DELETE: "/config/acct/joint_config/delete",
      DELETE_AUTH: "/config/acct/joint_config/delete_auth",
      LIST: "/config/acct/joint_config/list",
      GET_ACTIVE: "/config/acct/joint_config/get_active",
      AUDIT: "/config/acct/joint_config/audit",
      PENDING: "/config/acct/joint_config/pending",
      DEACTIVATE: "/config/acct/joint_config/deactivate",
      REACTIVATE: "/config/acct/joint_config/reactivate",
    },
    ACCT_PRODUCT_LIFECYCLE_CONFIG: {
      ADD: "/config/acct/lifecycle_config/add",
      SUBMIT: "/config/acct/lifecycle_config/submit",
      EDIT: "/config/acct/lifecycle_config/edit",
      AUTH: "/config/acct/lifecycle_config/auth",
      DEAUTH: "/config/acct/lifecycle_config/deauth",
      DELETE: "/config/acct/lifecycle_config/delete",
      DELETE_AUTH: "/config/acct/lifecycle_config/delete_auth",
      LIST: "/config/acct/lifecycle_config/list",
      GET_ACTIVE: "/config/acct/lifecycle_config/get_active",
      AUDIT: "/config/acct/lifecycle_config/audit",
      PENDING: "/config/acct/lifecycle_config/pending",
      DEACTIVATE: "/config/acct/lifecycle_config/deactivate",
      REACTIVATE: "/config/acct/lifecycle_config/reactivate",
    },
    ACCT_PRODUCT_DORMANCY_CONFIG: {
      ADD: "/config/acct/dormancy_config/add",
      SUBMIT: "/config/acct/dormancy_config/submit",
      EDIT: "/config/acct/dormancy_config/edit",
      AUTH: "/config/acct/dormancy_config/auth",
      DEAUTH: "/config/acct/dormancy_config/deauth",
      DELETE: "/config/acct/dormancy_config/delete",
      DELETE_AUTH: "/config/acct/dormancy_config/delete_auth",
      LIST: "/config/acct/dormancy_config/list",
      GET_ACTIVE: "/config/acct/dormancy_config/get_active",
      AUDIT: "/config/acct/dormancy_config/audit",
      PENDING: "/config/acct/dormancy_config/pending",
      DEACTIVATE: "/config/acct/dormancy_config/deactivate",
      REACTIVATE: "/config/acct/dormancy_config/reactivate",
    },
    ACCT_PRODUCT_MINOR_CONFIG: {
      ADD: "/config/acct/minor_config/add",
      SUBMIT: "/config/acct/minor_config/submit",
      EDIT: "/config/acct/minor_config/edit",
      AUTH: "/config/acct/minor_config/auth",
      DEAUTH: "/config/acct/minor_config/deauth",
      DELETE: "/config/acct/minor_config/delete",
      DELETE_AUTH: "/config/acct/minor_config/delete_auth",
      LIST: "/config/acct/minor_config/list",
      GET_ACTIVE: "/config/acct/minor_config/get_active",
      AUDIT: "/config/acct/minor_config/audit",
      PENDING: "/config/acct/minor_config/pending",
      DEACTIVATE: "/config/acct/minor_config/deactivate",
      REACTIVATE: "/config/acct/minor_config/reactivate",
    },
    ACCT_PRODUCT_NOMINEE_CONFIG: {
      ADD: "/config/acct/nominee_config/add",
      SUBMIT: "/config/acct/nominee_config/submit",
      EDIT: "/config/acct/nominee_config/edit",
      AUTH: "/config/acct/nominee_config/auth",
      DEAUTH: "/config/acct/nominee_config/deauth",
      DELETE: "/config/acct/nominee_config/delete",
      DELETE_AUTH: "/config/acct/nominee_config/delete_auth",
      LIST: "/config/acct/nominee_config/list",
      GET_ACTIVE: "/config/acct/nominee_config/get_active",
      AUDIT: "/config/acct/nominee_config/audit",
      PENDING: "/config/acct/nominee_config/pending",
      DEACTIVATE: "/config/acct/nominee_config/deactivate",
      REACTIVATE: "/config/acct/nominee_config/reactivate",
    },
    ACCT_PRODUCT_NUMBERING_CONFIG: {
      ADD: "/config/acct/numbering_config/add",
      SUBMIT: "/config/acct/numbering_config/submit",
      EDIT: "/config/acct/numbering_config/edit",
      AUTH: "/config/acct/numbering_config/auth",
      DEAUTH: "/config/acct/numbering_config/deauth",
      DELETE: "/config/acct/numbering_config/delete",
      DELETE_AUTH: "/config/acct/numbering_config/delete_auth",
      LIST: "/config/acct/numbering_config/list",
      GET_ACTIVE: "/config/acct/numbering_config/get_active",
      AUDIT: "/config/acct/numbering_config/audit",
      PENDING: "/config/acct/numbering_config/pending",
      DEACTIVATE: "/config/acct/numbering_config/deactivate",
      REACTIVATE: "/config/acct/numbering_config/reactivate",
    },
    ACCT_PRODUCT_OPENING_CONFIG: {
      ADD: "/config/acct/opening_config/add",
      SUBMIT: "/config/acct/opening_config/submit",
      EDIT: "/config/acct/opening_config/edit",
      AUTH: "/config/acct/opening_config/auth",
      DEAUTH: "/config/acct/opening_config/deauth",
      DELETE: "/config/acct/opening_config/delete",
      DELETE_AUTH: "/config/acct/opening_config/delete_auth",
      LIST: "/config/acct/opening_config/list",
      GET_ACTIVE: "/config/acct/opening_config/get_active",
      AUDIT: "/config/acct/opening_config/audit",
      PENDING: "/config/acct/opening_config/pending",
      DEACTIVATE: "/config/acct/opening_config/deactivate",
      REACTIVATE: "/config/acct/opening_config/reactivate",
    },
    ACCT_PRODUCT_STATEMENT_CONFIG: {
      ADD: "/config/acct/statement_config/add",
      SUBMIT: "/config/acct/statement_config/submit",
      EDIT: "/config/acct/statement_config/edit",
      AUTH: "/config/acct/statement_config/auth",
      DEAUTH: "/config/acct/statement_config/deauth",
      DELETE: "/config/acct/statement_config/delete",
      DELETE_AUTH: "/config/acct/statement_config/delete_auth",
      LIST: "/config/acct/statement_config/list",
      GET_ACTIVE: "/config/acct/statement_config/get_active",
      AUDIT: "/config/acct/statement_config/audit",
      PENDING: "/config/acct/statement_config/pending",
      DEACTIVATE: "/config/acct/statement_config/deactivate",
      REACTIVATE: "/config/acct/statement_config/reactivate",
    },
    ACCT_PRODUCT_ALERT_CONFIG: {
      ADD: "/config/acct/alert_config/add",
      SUBMIT: "/config/acct/alert_config/submit",
      EDIT: "/config/acct/alert_config/edit",
      AUTH: "/config/acct/alert_config/auth",
      DEAUTH: "/config/acct/alert_config/deauth",
      DELETE: "/config/acct/alert_config/delete",
      DELETE_AUTH: "/config/acct/alert_config/delete_auth",
      LIST: "/config/acct/alert_config/list",
      GET_ACTIVE: "/config/acct/alert_config/get_active",
      AUDIT: "/config/acct/alert_config/audit",
      PENDING: "/config/acct/alert_config/pending",
      DEACTIVATE: "/config/acct/alert_config/deactivate",
      REACTIVATE: "/config/acct/alert_config/reactivate",
    },
  },

  // --- EPURSE > Settings > Configuration > KYC -----------------------------
  // KYC (#2 of the three KYCs — see note at top of file): a KYC scheme and
  // all its levels, one record under /config/kyc/group/* (kycSchemeApi in
  // onboarding.api.js; configKycApi("kyc_group") for dropdowns).
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
  // Only the product itself has routes. Security, KYC, channel, eligibility
  // and residency settings are sections of that one record (edited in the
  // product wizard), not separate entities.
  DIGITAL_PRODUCT: {
    PRODUCT: {
      ADD: "/config/digital_product/product/add", SUBMIT: "/config/digital_product/product/submit", EDIT: "/config/digital_product/product/edit",
      GET: "/config/digital_product/product/get",
      AUTH: "/config/digital_product/product/auth", DEAUTH: "/config/digital_product/product/deauth", DELETE: "/config/digital_product/product/delete",
      DELETE_AUTH: "/config/digital_product/product/delete_auth", LIST: "/config/digital_product/product/list",
      GET_ACTIVE: "/config/digital_product/product/get_active", AUDIT: "/config/digital_product/product/audit",
      DEACTIVATE: "/config/digital_product/product/deactivate", REACTIVATE: "/config/digital_product/product/reactivate",
      PENDING: "/config/digital_product/product/pending",
    },
  },
  // Customer onboarding (admin wizard), individual and corporate — the
  // same 15 routes each (Customer_Onboarding_API.md /
  // Corporate_Customer_Onboarding_API.md).
  CUSTOMER: {
    INDIVIDUAL: {
      OPTIONS: "/customer/admin/individual/options",
      ADD: "/customer/admin/individual/add",
      GET: "/customer/admin/individual/get",
      // Files (File upload handoff, 2026-09): multipart upload -> stored
      // path; `file` returns the stored file itself (blob, not JSON).
      UPLOAD: "/customer/admin/individual/upload",
      FILE: "/customer/admin/individual/file",
      EDIT: "/customer/admin/individual/edit",
      SUBMIT: "/customer/admin/individual/submit",
      LIST: "/customer/admin/individual/list",
      GET_ACTIVE: "/customer/admin/individual/get_active",
      AUDIT: "/customer/admin/individual/audit",
      PENDING: "/customer/admin/individual/pending",
      AUTH: "/customer/admin/individual/auth",
      DEAUTH: "/customer/admin/individual/deauth",
      DELETE: "/customer/admin/individual/delete",
      DELETE_AUTH: "/customer/admin/individual/delete_auth",
      DEACTIVATE: "/customer/admin/individual/deactivate",
      REACTIVATE: "/customer/admin/individual/reactivate",
    },
    CORPORATE: {
      OPTIONS: "/customer/admin/corporate/options",
      ADD: "/customer/admin/corporate/add",
      GET: "/customer/admin/corporate/get",
      // Files (File upload handoff, 2026-09): multipart upload -> stored
      // path; `file` returns the stored file itself (blob, not JSON).
      UPLOAD: "/customer/admin/corporate/upload",
      FILE: "/customer/admin/corporate/file",
      EDIT: "/customer/admin/corporate/edit",
      SUBMIT: "/customer/admin/corporate/submit",
      LIST: "/customer/admin/corporate/list",
      GET_ACTIVE: "/customer/admin/corporate/get_active",
      AUDIT: "/customer/admin/corporate/audit",
      PENDING: "/customer/admin/corporate/pending",
      AUTH: "/customer/admin/corporate/auth",
      DEAUTH: "/customer/admin/corporate/deauth",
      DELETE: "/customer/admin/corporate/delete",
      DELETE_AUTH: "/customer/admin/corporate/delete_auth",
      DEACTIVATE: "/customer/admin/corporate/deactivate",
      REACTIVATE: "/customer/admin/corporate/reactivate",
    },
  },
  // EPURSE > Notification Center (Notification Center handoff, 2026-09):
  // both are standard maker-checker entities — the 13 verbs under each base
  // (see createLifecycle); alerts also have `options` for the form.
  NOTIFICATION: {
    GROUP: "/config/notification/group",
    ALERT: "/config/notification/alert",
    OUTBOX_LIST: "/config/notification/outbox/list",
  },
  // EPURSE > Risk Assessment (Risk Assessment handoff, 2026-09): standard
  // maker-checker verbs plus `options` (form) and `score` (try a setup).
  RISK: {
    INDIVIDUAL: "/customer/risk/individual",
    CORPORATE: "/customer/risk/corporate",
    // Risk Action master (menu 36, replaced Risk Category): an ordinary
    // institution master — the 13 maker-checker verbs under this base.
    ACTION: "/customer/master_config/risk_action",
  },
  // InnoAML (module 4, AML handoffs 03–07, 2026-09). setup/internal_list are
  // the 13 maker-checker verbs; the rest are plain calls under their base.
  // Reports (read-only). User Activity (menu 106): users, entities,
  // summary, list, get, export under this base.
  REPORT: {
    USER_ACTIVITY: "/config/report/user_activity",
    // Risk Score Breakdown (menu 107): list, get, export.
    RISK_BREAKDOWN: "/config/report/risk_breakdown",
    // AML Score Breakdown (menu 108): list, get, export.
    AML_BREAKDOWN: "/config/report/aml_breakdown",
  },
  AML: {
    SETUP: "/config/aml/setup",
    INTERNAL_LIST: "/config/aml/internal_list",
    SCREENING: "/config/aml/screening",
    LOOKUP: "/config/aml/lookup",
    REVIEW: "/config/aml/review",
  },
};
