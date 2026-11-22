import { API_ENDPOINTS } from "@/Utils/Constant";
import { request } from "@/Services/Epurse/onboarding.api";

// INSTITUTION > Institution Documents (menu 217): terms, privacy and other
// texts shown to customers and merchants. One document and all its texts are
// one maker-checker record; each text is versioned per channel and language.
const BASE = API_ENDPOINTS.INSTITUTION.DOCUMENT;
const VERBS = ["options", "list", "pending", "get", "add", "edit", "submit", "auth", "deauth", "deactivate", "reactivate", "delete", "audit", "versions", "version_get", "acceptances"];

export const institutionDocumentsApi = { ...Object.fromEntries(VERBS.map((verb) => [verb, (body = {}) => request(`${BASE}/${verb}`, body)])), listPath: `${BASE}/list` };

// Support contacts (Admin_41): one document per institution under
// maker-checker; edit sends the whole list under `setup`.
const SC = API_ENDPOINTS.INSTITUTION.SUPPORT_CONTACT;
export const supportContactsApi = {
  get: (body = {}) => request(`${SC}/get`, body),
  edit: ({ narration, inst_profile_id, ...setup } = {}) => request(`${SC}/edit`, { setup, ...(narration ? { narration } : {}), ...(inst_profile_id ? { inst_profile_id } : {}) }),
  auth: (body = {}) => request(`${SC}/auth`, body),
  deauth: (body = {}) => request(`${SC}/deauth`, body),
};
