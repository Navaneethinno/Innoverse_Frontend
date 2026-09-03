const configuredBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "https://innoverse-api.innovitegra.in";

export const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, "");
export const AUTH_BASIC_USERNAME = import.meta.env.VITE_AUTH_BASIC_USERNAME || "webadmin";
export const AUTH_BASIC_PASSWORD = import.meta.env.VITE_AUTH_BASIC_PASSWORD;
export const NON_LOGIN_APIS_ENABLED = import.meta.env.VITE_ENABLE_NON_LOGIN_APIS === "true";
