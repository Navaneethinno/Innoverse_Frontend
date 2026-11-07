import { API_ENDPOINTS } from "@/Utils/Constant";
import { request } from "@/Services/Epurse/onboarding.api";

const verbs = (base, names) => Object.fromEntries(names.map((v) => [v, (body = {}) => request(`${base}/${v}`, body)]));

// GLOBAL SETTINGS > Campaigns (248). add/edit {id (edit), name, title, body,
// audience, channels, quiet_start_hour, quiet_end_hour, send_at, narration};
// auth/deauth {id, narration}; cancel {id}; get {id} (with stats);
// list {status (run status), search, page, limit}; preview {audience} ->
// audience_size.
export const campaignApi = verbs(API_ENDPOINTS.CAMPAIGN, ["list", "get", "add", "edit", "auth", "deauth", "cancel", "preview"]);

// EPURSE > Campaigns (226), rewards: add/edit {id (edit), setup, narration};
// the rest {id, narration}.
export const rewardsCampaignApi = verbs(API_ENDPOINTS.REWARDS_CAMPAIGN, ["list", "pending", "get", "add", "edit", "delete", "deactivate", "reactivate", "auth", "deauth"]);
