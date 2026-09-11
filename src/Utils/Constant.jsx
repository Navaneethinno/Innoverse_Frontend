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
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/user/login",
    REFRESH_TOKEN: "/user/refresh_token",
    CHANGE_PASSWORD: "/user/change_password",
  },

  HEALTH: "/health",

  // Backend dropped the trailing "/list" segment from every Master
  // (Reference Data) endpoint (2026-09 update) — paths below match exactly
  // what was given, no "/list" suffix. All are POST with body {}.
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
    KYC_DATA_FIELD_LIST: "/master/kyc_data_field",
    KYC_DOCUMENT_TYPE_LIST: "/master/kyc_document_type",
    PARTY_TYPE_LIST: "/master/party_type",
    INSTITUTION_TYPE_LIST: "/master/institution_type",
    OWNERSHIP_LIST: "/master/ownership",
    RESIDENCY_TYPE_LIST: "/master/residency_type",
    COUNTRY_LIST: "/master/country",
    CURRENCY_LIST: "/master/currency",
    GENDER_LIST: "/master/gender",
    LANGUAGE_LIST: "/master/language",
    // Confirmed live 2026-09: POST /master/timezone (no trailing "/list",
    // same as every other Master endpoint above), paginated — {page, limit}
    // in the body, {id, name, status, status_name} per record.
    TIMEZONE_LIST: "/master/timezone",
  },
  CONFIG_KYC: {
    KYC_GROUP_LEVEL: {
      GET_ACTIVE: "/config/kyc_group_level/get_active",
    },
  },
  CONFIG_ACCT: {
    ACCT_PRODUCT: {
      GET_ACTIVE: "/config/acct_product/get_active",
    },
  },
  MASTER_CONFIG: {
    DISTRICT: {
      ADD: "/master_config/district/add", SUBMIT: "/master_config/district/submit", LIST: "/master_config/district/list",
      GET_ACTIVE: "/master_config/district/get_active", AUDIT: "/master_config/district/audit", AUTH: "/master_config/district/auth",
      DEAUTH: "/master_config/district/deauth", EDIT: "/master_config/district/edit", DELETE: "/master_config/district/delete",
      DELETE_AUTH: "/master_config/district/delete_auth",
    },
    PROVINCE: {
      ADD: "/master_config/province/add", SUBMIT: "/master_config/province/submit", LIST: "/master_config/province/list",
      GET_ACTIVE: "/master_config/province/get_active", AUDIT: "/master_config/province/audit", AUTH: "/master_config/province/auth",
      DEAUTH: "/master_config/province/deauth", EDIT: "/master_config/province/edit", DELETE: "/master_config/province/delete",
      DELETE_AUTH: "/master_config/province/delete_auth",
    },
    VILLAGE: {
      ADD: "/master_config/village/add", SUBMIT: "/master_config/village/submit", LIST: "/master_config/village/list",
      GET_ACTIVE: "/master_config/village/get_active", AUDIT: "/master_config/village/audit", AUTH: "/master_config/village/auth",
      DEAUTH: "/master_config/village/deauth", EDIT: "/master_config/village/edit", DELETE: "/master_config/village/delete",
      DELETE_AUTH: "/master_config/village/delete_auth",
    },
    ACCOUNT_PURPOSE: {
      ADD: "/master_config/account_purpose/add", SUBMIT: "/master_config/account_purpose/submit", LIST: "/master_config/account_purpose/list",
      GET_ACTIVE: "/master_config/account_purpose/get_active", AUDIT: "/master_config/account_purpose/audit", AUTH: "/master_config/account_purpose/auth",
      DEAUTH: "/master_config/account_purpose/deauth", EDIT: "/master_config/account_purpose/edit", DELETE: "/master_config/account_purpose/delete",
      DELETE_AUTH: "/master_config/account_purpose/delete_auth",
    },
    CATEGORY: {
      ADD: "/master_config/category/add", SUBMIT: "/master_config/category/submit", LIST: "/master_config/category/list",
      GET_ACTIVE: "/master_config/category/get_active", AUDIT: "/master_config/category/audit", AUTH: "/master_config/category/auth",
      DEAUTH: "/master_config/category/deauth", EDIT: "/master_config/category/edit", DELETE: "/master_config/category/delete",
      DELETE_AUTH: "/master_config/category/delete_auth",
    },
    CITIZENSHIP: {
      ADD: "/master_config/citizenship/add", SUBMIT: "/master_config/citizenship/submit", LIST: "/master_config/citizenship/list",
      GET_ACTIVE: "/master_config/citizenship/get_active", AUDIT: "/master_config/citizenship/audit", AUTH: "/master_config/citizenship/auth",
      DEAUTH: "/master_config/citizenship/deauth", EDIT: "/master_config/citizenship/edit", DELETE: "/master_config/citizenship/delete",
      DELETE_AUTH: "/master_config/citizenship/delete_auth",
    },
    DESIGNATION: {
      ADD: "/master_config/designation/add", SUBMIT: "/master_config/designation/submit", LIST: "/master_config/designation/list",
      GET_ACTIVE: "/master_config/designation/get_active", AUDIT: "/master_config/designation/audit", AUTH: "/master_config/designation/auth",
      DEAUTH: "/master_config/designation/deauth", EDIT: "/master_config/designation/edit", DELETE: "/master_config/designation/delete",
      DELETE_AUTH: "/master_config/designation/delete_auth",
    },
    DISABILITY: {
      ADD: "/master_config/disability/add", SUBMIT: "/master_config/disability/submit", LIST: "/master_config/disability/list",
      GET_ACTIVE: "/master_config/disability/get_active", AUDIT: "/master_config/disability/audit", AUTH: "/master_config/disability/auth",
      DEAUTH: "/master_config/disability/deauth", EDIT: "/master_config/disability/edit", DELETE: "/master_config/disability/delete",
      DELETE_AUTH: "/master_config/disability/delete_auth",
    },
    EMPLOYMENT: {
      ADD: "/master_config/employment/add", SUBMIT: "/master_config/employment/submit", LIST: "/master_config/employment/list",
      GET_ACTIVE: "/master_config/employment/get_active", AUDIT: "/master_config/employment/audit", AUTH: "/master_config/employment/auth",
      DEAUTH: "/master_config/employment/deauth", EDIT: "/master_config/employment/edit", DELETE: "/master_config/employment/delete",
      DELETE_AUTH: "/master_config/employment/delete_auth",
    },
    OCCUPATION: {
      ADD: "/master_config/occupation/add", SUBMIT: "/master_config/occupation/submit", LIST: "/master_config/occupation/list",
      GET_ACTIVE: "/master_config/occupation/get_active", AUDIT: "/master_config/occupation/audit", AUTH: "/master_config/occupation/auth",
      DEAUTH: "/master_config/occupation/deauth", EDIT: "/master_config/occupation/edit", DELETE: "/master_config/occupation/delete",
      DELETE_AUTH: "/master_config/occupation/delete_auth",
    },
    QUALIFICATION: {
      ADD: "/master_config/qualification/add", SUBMIT: "/master_config/qualification/submit", LIST: "/master_config/qualification/list",
      GET_ACTIVE: "/master_config/qualification/get_active", AUDIT: "/master_config/qualification/audit", AUTH: "/master_config/qualification/auth",
      DEAUTH: "/master_config/qualification/deauth", EDIT: "/master_config/qualification/edit", DELETE: "/master_config/qualification/delete",
      DELETE_AUTH: "/master_config/qualification/delete_auth",
    },
    RELIGION: {
      ADD: "/master_config/religion/add", SUBMIT: "/master_config/religion/submit", LIST: "/master_config/religion/list",
      GET_ACTIVE: "/master_config/religion/get_active", AUDIT: "/master_config/religion/audit", AUTH: "/master_config/religion/auth",
      DEAUTH: "/master_config/religion/deauth", EDIT: "/master_config/religion/edit", DELETE: "/master_config/religion/delete",
      DELETE_AUTH: "/master_config/religion/delete_auth",
    },
    GENDER: {
      ADD: "/master_config/gender/add", SUBMIT: "/master_config/gender/submit", LIST: "/master_config/gender/list",
      GET_ACTIVE: "/master_config/gender/get_active", AUDIT: "/master_config/gender/audit", AUTH: "/master_config/gender/auth",
      DEAUTH: "/master_config/gender/deauth", EDIT: "/master_config/gender/edit", DELETE: "/master_config/gender/delete",
      DELETE_AUTH: "/master_config/gender/delete_auth",
    },
    SOURCE_OF_FUND: {
      ADD: "/master_config/source_of_fund/add", SUBMIT: "/master_config/source_of_fund/submit", LIST: "/master_config/source_of_fund/list",
      GET_ACTIVE: "/master_config/source_of_fund/get_active", AUDIT: "/master_config/source_of_fund/audit", AUTH: "/master_config/source_of_fund/auth",
      DEAUTH: "/master_config/source_of_fund/deauth", EDIT: "/master_config/source_of_fund/edit", DELETE: "/master_config/source_of_fund/delete",
      DELETE_AUTH: "/master_config/source_of_fund/delete_auth",
    },
    TURNOVER: {
      ADD: "/master_config/turnover/add", SUBMIT: "/master_config/turnover/submit", LIST: "/master_config/turnover/list",
      GET_ACTIVE: "/master_config/turnover/get_active", AUDIT: "/master_config/turnover/audit", AUTH: "/master_config/turnover/auth",
      DEAUTH: "/master_config/turnover/deauth", EDIT: "/master_config/turnover/edit", DELETE: "/master_config/turnover/delete",
      DELETE_AUTH: "/master_config/turnover/delete_auth",
    },
  },

  // Grouped Module -> Menu, matching the sidebar's own grouping and the
  // exact endpoint list given by the backend (2026-09). Anything not in
  // that list (the old /user/audit_list, /user/profile/audit_list,
  // /profile/getall, singular /user/kyc/get) has been removed rather than
  // kept as a dead alias.
  USER_MANAGEMENT: {
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
    // KYC is its own sub-entity under /user/kyc/* — confirmed live but not
    // consumed by any page yet (only the old singular /user/kyc/get was
    // wired, as usersApi.getKyc; kept working here under its new home).
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
    // "Profile" here is a role/permission profile (menu_id/action_id
    // grants), NOT the Institution Profile entity under INSTITUTION below.
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
};
