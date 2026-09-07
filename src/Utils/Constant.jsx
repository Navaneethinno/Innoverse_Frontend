const configuredBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "https://innoverse-api.innovitegra.in";

export const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, "");
export const AUTH_BASIC_USERNAME = import.meta.env.VITE_AUTH_BASIC_USERNAME || "webadmin";
export const AUTH_BASIC_PASSWORD = import.meta.env.VITE_AUTH_BASIC_PASSWORD;
export const NON_LOGIN_APIS_ENABLED = import.meta.env.VITE_ENABLE_NON_LOGIN_APIS === "true";

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
    LANGUAGE_LIST: "/master/language",
  },

  // Grouped Module -> Menu, matching the sidebar's own grouping and the
  // exact endpoint list given by the backend (2026-09). Anything not in
  // that list (the old /user/audit_list, /user/profile/audit_list,
  // /profile/getall, singular /user/kyc/get) has been removed rather than
  // kept as a dead alias.
  USER_MANAGEMENT: {
    USER: {
      LIST: "/user/list",
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
  },

  INSTITUTION: {
    INSTITUTION_PROFILE: {
      LIST: "/institution/profile/list",
      GET_ACTIVE: "/institution/profile/get_active",
      ADD: "/institution/profile/add",
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
  },
};
