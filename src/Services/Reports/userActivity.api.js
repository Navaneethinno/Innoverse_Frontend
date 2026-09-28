import { API_ENDPOINTS } from "@/Utils/Constant";
import { request } from "@/Services/Epurse/onboarding.api";
import { downloadAttachment } from "@/Services/api/fileTransfer";

// Reports > User Activity (menu 106, View only; Reports handoff 08,
// 2026-09): everything one admin user did in the maker-checker flow over a
// period. Read-only; every call needs View on User Activity.
//
// The filter body (summary, list, export): { user_id, period | from/to,
// roles?, groups?, entities?, actions? } — an empty list means all.
const base = API_ENDPOINTS.REPORT.USER_ACTIVITY;
const call = (verb) => (payload = {}) => request(`${base}/${verb}`, payload);

export const userActivityApi = {
  // Users the viewer may report on: { inst_profile_id?, name? }.
  users: call("users"),
  // Kinds of record covered, for the Area / Record type filters.
  entities: call("entities"),
  summary: call("summary"),
  // Filter body + page, limit (≤ 200), sort_by (desc = newest first).
  list: call("list"),
  // { activity_id } -> the row plus values, is_new, changes, history.
  get: call("get"),
  // Filter body + format (XLSX | CSV) -> { blob, fileName }.
  export: (payload) => downloadAttachment(`${base}/export`, payload, `user_activity.${payload.format === "CSV" ? "csv" : "xlsx"}`),
};
