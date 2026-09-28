import { API_ENDPOINTS } from "@/Utils/Constant";
import { request } from "@/Services/Epurse/onboarding.api";
import { downloadAttachment } from "@/Services/api/fileTransfer";

// Reports > AML Score Breakdown (menu 108, View only; Reports handoff 10,
// 2026-09): customers' kept AML screening runs and how each score was
// reached — every party screened, the records it matched and each match's
// name score and adjustments. Separate from the risk score.
//
// The filter body (list, export) is all optional: customer_kind, period |
// from/to, latest_only (default true), band_codes, risk_action_ids,
// min_score/max_score, matched_only, triggers, status, name, reference_id,
// inst_profile_id.
const base = API_ENDPOINTS.REPORT.AML_BREAKDOWN;

export const amlBreakdownApi = {
  // Filter body + page, limit (≤ 200), sort_by (desc = newest first).
  list: (payload = {}) => request(`${base}/list`, payload),
  // { run_id } -> the row plus setup, parties, previous, changes, history.
  get: (payload) => request(`${base}/get`, payload),
  // Filter body + format (XLSX | CSV), detail (one row per match), sort_by.
  export: (payload) => downloadAttachment(`${base}/export`, payload, `aml_score_breakdown.${payload.format === "CSV" ? "csv" : "xlsx"}`),
};
