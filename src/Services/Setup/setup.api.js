import { jsonRequest } from "@/Services/api/jsonRequest";
import { API_ENDPOINTS } from "@/Utils/Constant";

// The institution's setup state: menus (state, needs, parts, leads_to) and
// flows (setup guides). A service provider / System user names the
// institution with inst_profile_id.
export const setupApi = {
  state: (body = {}) => jsonRequest(API_ENDPOINTS.SETUP_STATE, body),
};
