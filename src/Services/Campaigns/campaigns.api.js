import { API_ENDPOINTS } from "@/Utils/Constant";
import { request } from "@/Services/Epurse/onboarding.api";

const verbs = (base, names) => Object.fromEntries(names.map((v) => [v, (body = {}) => request(`${base}/${v}`, body)]));

// GLOBAL SETTINGS > Campaigns (248). add/edit {id (edit), name, title, body,
// audience, channels, quiet_start_hour, quiet_end_hour, send_at, narration};
// auth/deauth {id, narration}; cancel {id}; get {id} (with stats);
// list {status (run status), search, page, limit}; preview {audience} ->
// audience_size.
export const campaignApi = verbs(API_ENDPOINTS.CAMPAIGN, ["options", "list", "get", "add", "edit", "auth", "deauth", "cancel", "preview"]);

// EPURSE > Rewards Campaigns (226): add/edit {id (edit), setup, narration};
// the rest {id, narration}.
export const rewardsCampaignApi = verbs(API_ENDPOINTS.REWARDS_CAMPAIGN, ["options", "list", "pending", "get", "add", "edit", "delete", "deactivate", "reactivate", "auth", "deauth"]);

// EPURSE > Vouchers (228): the same verbs and replies as Rewards Campaigns.
export const rewardsVoucherApi = verbs(API_ENDPOINTS.REWARDS_VOUCHER, ["list", "pending", "get", "add", "edit", "delete", "deactivate", "reactivate", "auth", "deauth"]);

// EPURSE > Rewards Report (229): {page, page_size, date_from, date_to} and
// campaign_id, decision, txn_id, entity_type + entity_id where they apply.
export const rewardsReportApi = verbs(API_ENDPOINTS.REWARDS_REPORT, ["decisions", "points", "campaigns", "referrals", "redemptions"]);

// EPURSE > Loyalty & Referral (227): one program per institution. get replies
// { id: 0, setup: null, actions } before the first save, else
// { record, history } as a campaign's get; the settings screen reads the
// record's fields, with its pending setup as { setup, proposed_by, ... }.
const program = verbs(API_ENDPOINTS.REWARDS_PROGRAM, ["get", "edit", "auth", "deauth"]);
const firstRow = (r) => (Array.isArray(r?.data) ? r.data[0] : r?.data);
export const rewardsProgramApi = {
  ...program,
  get: async (body) => {
    const reply = await program.get(body);
    const { record, history } = firstRow(reply) ?? {};
    if (!record) return reply;
    const pending = record.pending ? { setup: record.pending, proposed_by: record.proposed_by, proposed_at: record.updated_time, narration: record.narration } : null;
    return { ...reply, data: [{ ...record, pending, history: (history ?? []).map((h) => ({ ...h, action_name: h.action, created_by: h.actor, created_time: h.at, remarks: h.narration })) }] };
  },
};
