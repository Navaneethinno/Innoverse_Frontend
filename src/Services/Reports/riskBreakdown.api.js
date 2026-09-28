import { API_ENDPOINTS } from "@/Utils/Constant";
import { request } from "@/Services/Epurse/onboarding.api";
import { downloadAttachment } from "@/Services/api/fileTransfer";

// Reports > Risk Score Breakdown (menu 107, View only; Reports handoff 09,
// 2026-09): customers' kept risk assessments and how each score was
// reached. Separate from the AML score.
//
// The filter body (list, export) is all optional: customer_kind, period |
// from/to, latest_only (default true), level_codes, risk_action_ids,
// min_score/max_score, sources, name, reference_id, inst_profile_id,
// risk_setup_id (needs customer_kind).
const base = API_ENDPOINTS.REPORT.RISK_BREAKDOWN;

export const riskBreakdownApi = {
  // Filter body + page, limit (≤ 200), sort_by (desc = newest first).
  list: (payload = {}) => request(`${base}/list`, payload),
  // { customer_kind, assessment_id } -> the row plus breakdown, previous,
  // changes, history. The id is only unique within a customer type.
  get: (payload) => request(`${base}/get`, payload),
  // Filter body + format (XLSX | CSV), detail (one row per criterion), sort_by.
  export: (payload) => downloadAttachment(`${base}/export`, payload, `risk_score_breakdown.${payload.format === "CSV" ? "csv" : "xlsx"}`),
};
