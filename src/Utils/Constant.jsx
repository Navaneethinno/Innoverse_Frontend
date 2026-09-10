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
