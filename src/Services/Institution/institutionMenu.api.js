import { jsonRequest } from "@/Services/api/jsonRequest";
import { API_ENDPOINTS } from "@/Utils/Constant";

const ENDPOINTS = API_ENDPOINTS.INSTITUTION.INSTITUTION_MENU;

// Which menus of its subscribed modules an institution has. Every call
// names the institution: { inst_profile_id }.
export const institutionMenuApi = {
  options: (payload) => jsonRequest(ENDPOINTS.OPTIONS, payload),
  get: (payload) => jsonRequest(ENDPOINTS.GET, payload),
  edit: (payload) => jsonRequest(ENDPOINTS.EDIT, payload),
  auth: (payload) => jsonRequest(ENDPOINTS.AUTH, payload),
  deauth: (payload) => jsonRequest(ENDPOINTS.DEAUTH, payload),
};
