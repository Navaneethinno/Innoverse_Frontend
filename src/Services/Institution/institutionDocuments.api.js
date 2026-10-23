import { request } from "@/Services/Epurse/onboarding.api";

// INSTITUTION > Institution Documents (menu 217): terms, privacy and other
// texts shown to customers and merchants. One document and all its texts are
// one maker-checker record; each text is versioned per channel and language.
const BASE = "/config/institution/document";
const VERBS = ["options", "list", "pending", "get", "add", "edit", "submit", "auth", "deauth", "deactivate", "reactivate", "delete", "audit", "versions", "version_get", "acceptances"];

export const institutionDocumentsApi = { ...Object.fromEntries(VERBS.map((verb) => [verb, (body = {}) => request(`${BASE}/${verb}`, body)])), listPath: `${BASE}/list` };
