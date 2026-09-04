const configuredBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "https://innoverse-api.innovitegra.in";

export const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, "");
export const AUTH_BASIC_USERNAME = import.meta.env.VITE_AUTH_BASIC_USERNAME || "webadmin";
export const AUTH_BASIC_PASSWORD = import.meta.env.VITE_AUTH_BASIC_PASSWORD;
export const NON_LOGIN_APIS_ENABLED = import.meta.env.VITE_ENABLE_NON_LOGIN_APIS === "true";

// Every backend route path called from src/Services/*.api.js, centralized
// here so a path only ever needs to be typed (and changed) in one place.
// Grouped by the domain that owns the route, except PENDING — the generic
// maker-checker pending/approve/reject/audit pattern reused by Applications,
// Profiles, Menus and MakerChecker itself, so those services call the
// shared PENDING builders below instead of redeclaring their own.
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/user/login",
    REFRESH_TOKEN: "/user/refresh_token",
    CHANGE_PASSWORD: "/user/change_password",
  },

  HEALTH: "/health",

  MASTER: {
    MODULE_LIST: "/master/module/list",
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

  KYC: {
    INSTITUTION: (id) => `/institutions/${id}/kyc`,
    USER: (id) => `/users/${id}/kyc`,
  },

  APPLICATIONS: {
    LIST: "/applications",
    ASSIGN: (institutionId) => `/institutions/${institutionId}/assign-application`,
    BY_ID: (id) => `/applications/${id}`,
    ACTIVATE: (id) => `/applications/${id}/activate`,
    DEACTIVATE: (id) => `/applications/${id}/deactivate`,
  },

  // Profile (URMG) endpoints — per the official Postman collection
  // ("InnoVerse_ConfigProcessor" -> "Profile (URMG)"). "Profile" here is a
  // role/permission profile (menu_id/action_id grants), NOT the Institution
  // Profile entity under INSTITUTIONS above. This group previously held a
  // fictional REST shape (/profiles, /profiles/{id}/activate, ...) that
  // nothing legitimate depended on (confirmed via a codebase-wide grep before
  // this rewrite) — overwritten in place with the real paths rather than
  // renamed, to avoid a second near-duplicate group name.
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

  MENUS: {
    MODULES: "/modules",
    MENUS: "/menus",
    MENU_ACTIONS: "/menu-actions",
    MODULE_BY_ID: (id) => `/modules/${id}`,
    MENU_BY_ID: (id) => `/menus/${id}`,
    MENU_ACTION_BY_ID: (id) => `/menu-actions/${id}`,
    MODULE_ACTIVATE: (id) => `/modules/${id}/activate`,
    MENU_ACTIVATE: (id) => `/menus/${id}/activate`,
    MENU_ACTION_ACTIVATE: (id) => `/menu-actions/${id}/activate`,
    MODULE_DEACTIVATE: (id) => `/modules/${id}/deactivate`,
    MENU_DEACTIVATE: (id) => `/menus/${id}/deactivate`,
    MENU_ACTION_DEACTIVATE: (id) => `/menu-actions/${id}/deactivate`,
  },

  // Generic maker-checker routes — parametrized by an entity key
  // ("applications" | "profiles" | "institution-applications" | "modules" |
  // "menus" | "menu-actions" | ...), not one route per entity.
  PENDING: {
    ALL: "/pending/all",
    BY_ENTITY: (entityKey) => `/pending/entities/${entityKey}/pending`,
    ENTITY_HISTORY: (entityKey, entityId) => `/pending/entities/${entityKey}/${entityId}/history`,
    LIFECYCLE: (entityKey, auditKey) => `/pending/entities/${entityKey}/lifecycle/${auditKey}`,
    APPROVE: (requestId) => `/pending/requests/${requestId}/approve`,
    REJECT: (requestId) => `/pending/requests/${requestId}/reject`,
    CONTINUE_ADD_EDIT: (entityKey, requestId) => `/pending/adds/${entityKey}/${requestId}/edit`,
    CONTINUE_ADD_DELETE: (entityKey, requestId) => `/pending/adds/${entityKey}/${requestId}/delete`,
  },
};
