import { API_ENDPOINTS } from "@/Utils/Constant";
import { request } from "@/Services/Epurse/onboarding.api";

// GLOBAL SETTINGS > App Versions (menu 218): per platform the latest app
// version and the lowest one still allowed. One document per institution under
// maker-checker; edit sends the whole list.
export const appVersionsApi = {
  get: (body = {}) => request(API_ENDPOINTS.GLOBAL.APP_VERSION_GET, body),
  edit: (body) => request(API_ENDPOINTS.GLOBAL.APP_VERSION_EDIT, body),
  auth: (body = {}) => request(API_ENDPOINTS.GLOBAL.APP_VERSION_AUTH, body),
  deauth: (body = {}) => request(API_ENDPOINTS.GLOBAL.APP_VERSION_DEAUTH, body),
};
