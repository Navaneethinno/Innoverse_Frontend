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

  MASTER: {
    MODULE_LIST: "/master/module/list",
    INSTITUTION_TYPE_LIST: "/master/institution_type/list",
    LANGUAGE_LIST: "/master/language/list",
  },

  USERS: {
    LIST: "/user/list",
    AUDIT_LIST: "/user/audit_list",
    ADD: "/user/add",
    EDIT: "/user/edit",
    AUTH: "/user/auth",
    DEAUTH: "/user/deauth",
    DELETE: "/user/delete",
    DELETE_AUTH: "/user/delete_auth",
    ALL_PROFILES: "/profile/getall",
  },

  INSTITUTIONS: {
    LIST: "/institution/profile/list",
    GET_ACTIVE: "/institution/profile/get_active",
    ADD: "/institution/profile/add",
    EDIT: "/institution/profile/edit",
    AUTH: "/institution/profile/auth",
    DEAUTH: "/institution/profile/deauth",
    DELETE: "/institution/profile/delete",
    DELETE_AUTH: "/institution/profile/delete_auth",
    AUDIT: "/institution/profile/audit",
  },

  // Profile (URMG) endpoints — per the official Postman collection
  // ("InnoVerse_ConfigProcessor" -> "Profile (URMG)"). "Profile" here is a
  // role/permission profile (menu_id/action_id grants), NOT the Institution
  // Profile entity under INSTITUTIONS above.
  PROFILES: {
    LIST: "/profile/list",
    GET_ALL: "/profile/getall",
    GET: "/profile/get",
    ADD: "/profile/add",
    EDIT: "/profile/edit",
    AUTH: "/profile/auth",
    DEAUTH: "/profile/deauth",
    DELETE: "/profile/delete",
    DELETE_AUTH: "/profile/delete_auth",
    AUDIT_LIST: "/profile/audit_list",
  },
};
