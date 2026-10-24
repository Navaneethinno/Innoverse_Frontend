import { request } from "@/Services/Epurse/onboarding.api";
import { downloadAttachment, postForm } from "@/Services/api/fileTransfer";

// InnoRecon (module 11): sources (188), layouts (190), files (189) and sets
// (191). Every change is maker-checker: auth / deauth (narration required)
// by a different user; deactivate / reactivate need a narration; delete
// removes a record never used, at once. events:
// { id } -> [{ id, action, detail, actor, at }].
const base = "/config/recon";
const calls = (group, names) => ({
  listPath: `${base}/${group}/list`,
  ...Object.fromEntries(names.map((name) => [name, (body) => request(`${base}/${group}/${name}`, body ?? {})])),
});
const LIFECYCLE = ["list", "get", "add", "edit", "auth", "deauth", "deactivate", "reactivate", "delete", "events"];

// Sources: options -> { kinds, file_name_tokens, max_file_mb, generated_from,
// switch_file_pattern }; check_pattern { file_name_pattern, file_name } ->
// { gives_date, matches, business_date, sequence_no }; collect { source_id }.
export const reconSourcesApi = calls("source", [...LIFECYCLE, "options", "check_pattern", "collect"]);
// SFTP profiles: test { id, dir } -> { ok, error, files: [{ name, size_bytes, modified_at }] }.
export const reconSftpApi = calls("sftp", [...LIFECYCLE, "test"]);
// Currency decimals: set { currency_id, decimal_places }; auth / deauth { currency_id }.
export const reconCurrencyApi = calls("currency", ["list", "set", "auth", "deauth"]);
// Layouts: seeds, seed_get { seed_code }; add { code, seed_code } or { code,
// definition }; edit waits beside the version in force (pending_definition).
export const reconLayoutsApi = {
  ...calls("layout", [...LIFECYCLE, "seeds", "seed_get", "preview"]),
  // A local file read with a layout (nothing saved): multipart.
  previewUpload: (fields) => postForm(`${base}/layout/preview`, fields),
};
// Files: upload (multipart: source_id, file), read { id }, records { id,
// status, search, page, limit }, rejects { id, page, limit }, generate
// { source_id, business_date } (sources generated from the ledger).
export const reconFilesApi = {
  ...calls("file", ["list", "get", "discard", "verify", "read", "records", "rejects", "generate"]),
  upload: (fields) => postForm(`${base}/file/upload`, fields),
  download: (id, name) => downloadAttachment(`${base}/file/download`, { id }, name),
};
// Sets: options -> { sources, fields, cardinalities, actions, tolerances, max_window_days }.
export const reconSetsApi = calls("set", [...LIFECYCLE, "options"]);
// Runs: start { set_id, business_date } -> RUNNING; poll get { id } until DONE / FAILED.
export const reconRunsApi = calls("run", ["start", "list", "get"]);
// Results: groups / unmatched / aging, and the unmatched list as CSV.
export const reconResultsApi = {
  ...calls("result", ["groups", "unmatched", "aging"]),
  export: (body) => downloadAttachment(`${base}/result/export`, body, "unmatched.csv"),
};
// Actions on results, each approved by another user: request { set_id, kind,
// group_id?, record_ids?, business_date?, reason?, narration?, gl_direction? }.
export const reconActionsApi = calls("action", ["options", "request", "list", "get", "auth", "deauth", "cancel"]);
// Notes and owners of open records.
export const reconBreaksApi = calls("break", ["note", "notes", "assign"]);
