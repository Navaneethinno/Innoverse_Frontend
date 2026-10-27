import { API_ENDPOINTS } from "@/Utils/Constant";
import { createLifecycle, request, requestStream } from "@/Services/Epurse/onboarding.api";
import { downloadAttachment, uploadFile } from "@/Services/api/fileTransfer";

// InnoAML (AML handoffs 03–07, 2026-09). Every call is a POST with the usual
// admin login, menu permissions and reply envelope.
const { SETUP, INTERNAL_LIST, SCREENING, LOOKUP, REVIEW, MEDIA, MEDIA_REVIEW, BLACKLIST, WHITELIST, FLAG } = API_ENDPOINTS.AML;
const call = (base, verb) => (payload = {}) => request(`${base}/${verb}`, payload);

// One setup per institution: score bands (same shape as risk levels) mapped
// to the institution's risk actions, min_match_score, ongoing_rescreen.
// The setup screen uses `list`; read-only screens use `get_active`, which
// needs only a login (no AML Setup menu).
export const amlSetupApi = createLifecycle(SETUP);

// The institution's own watchlists: upload the CSV/XLSX, `validate` it with
// a column setup (stores nothing), then add/edit with the stored file_path.
export const amlInternalListApi = {
  ...createLifecycle(INTERNAL_LIST),
  // { inst_profile_id? (Service Provider only), file } -> { path, file_name, content_type, size }
  upload: (fields) => uploadFile(`${INTERNAL_LIST}/upload`, fields),
  // { inst_profile_id, code, file_path, default_entity_type, columns } -> { rows, valid, errors, preview }
  validate: call(INTERNAL_LIST, "validate"),
};

// Screenings of the institution's customers (recorded at submit, re-screen
// and ongoing re-screening). `customer`/`rescreen` take
// { customer_kind, reference_id }; `changes` lists results that got worse.
export const amlScreeningApi = {
  listPath: `${SCREENING}/list`,
  list: call(SCREENING, "list"),
  get: call(SCREENING, "get"),
  customer: call(SCREENING, "customer"),
  rescreen: call(SCREENING, "rescreen"),
  changesPath: `${SCREENING}/changes`,
  changes: call(SCREENING, "changes"),
};

// Screen a name that isn't a customer (e.g. a payment beneficiary).
export const amlLookupApi = {
  listPath: `${LOOKUP}/list`,
  screen: call(LOOKUP, "screen"),
  list: call(LOOKUP, "list"),
  get: call(LOOKUP, "get"),
};

// Match Review: a maker proposes FALSE_POSITIVE / TRUE_MATCH per match, a
// checker approves (auth) or rejects (deauth) each proposal.
export const amlReviewApi = {
  listPath: `${REVIEW}/list`,
  propose: call(REVIEW, "propose"),
  auth: call(REVIEW, "auth"),
  deauth: call(REVIEW, "deauth"),
  pending: call(REVIEW, "pending"),
  list: call(REVIEW, "list"),
  history: call(REVIEW, "history"),
};

// Adverse Media: news searches for a person or company, on demand.
// `search` answers at once with { search_id }; `follow` streams its progress
// (plan, query, candidates, reading, article, story, score, done), calling
// again from the last event on `continue` or a dropped connection, until
// `done`. Search and view use Name Lookup's permission.
export const amlMediaApi = {
  listPath: `${MEDIA}/list`,
  search: call(MEDIA, "search"),
  get: call(MEDIA, "get"),
  list: call(MEDIA, "list"),
  async follow(searchId, onEvent, signal) {
    let after = 0;
    let ended = false;
    while (!ended && !signal?.aborted) {
      let heard = false;
      await requestStream(
        `${MEDIA}/stream`,
        { search_id: searchId, after },
        (kind, data, id) => {
          heard = true;
          if (id) after = id;
          if (kind === "continue") {
            after = data?.after ?? after;
            return;
          }
          if (kind === "done") ended = true;
          onEvent(kind, data);
        },
        signal,
      );
      // A connection that closed at once: wait a moment before asking again.
      if (!heard && !ended) await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  },
};

// Article reviews (RELEVANT / NOT_RELEVANT), maker-checker on Match Review.
export const amlMediaReviewApi = {
  listPath: `${MEDIA_REVIEW}/list`,
  propose: call(MEDIA_REVIEW, "propose"),
  auth: call(MEDIA_REVIEW, "auth"),
  deauth: call(MEDIA_REVIEW, "deauth"),
  pending: call(MEDIA_REVIEW, "pending"),
  list: call(MEDIA_REVIEW, "list"),
};

// The institution's own blacklist (handoff 27): people and companies it won't
// deal with, screened next to the watchlists. Every add / edit / remove waits
// for a checker (`pending`, then `auth` / `deauth` by id, or a whole import
// by batch_id). Bulk import is the Internal Watchlists upload -> validate
// (code BLACKLIST) -> import.
export const amlBlacklistApi = {
  listPath: `${BLACKLIST}/list`,
  list: call(BLACKLIST, "list"),
  get: call(BLACKLIST, "get"),
  add: call(BLACKLIST, "add"),
  edit: call(BLACKLIST, "edit"),
  remove: call(BLACKLIST, "remove"),
  pending: call(BLACKLIST, "pending"),
  auth: call(BLACKLIST, "auth"),
  deauth: call(BLACKLIST, "deauth"),
  upload: (fields) => uploadFile(`${BLACKLIST}/upload`, fields),
  validate: call(BLACKLIST, "validate"),
  import: call(BLACKLIST, "import"),
};

// The whitelist: approved false positives from Match Review, each with an
// expiry and evidence; renew / revoke wait for a checker.
export const amlWhitelistApi = {
  listPath: `${WHITELIST}/list`,
  list: call(WHITELIST, "list"),
  // One entry by hand: { customer, entity_id | listed_name, evidence?, expires_on?, comment, inst_profile_id? }
  add: call(WHITELIST, "add"),
  pending: call(WHITELIST, "pending"),
  renew: call(WHITELIST, "renew"),
  revoke: call(WHITELIST, "revoke"),
  auth: call(WHITELIST, "auth"),
  deauth: call(WHITELIST, "deauth"),
  history: call(WHITELIST, "history"),
  // Upload as the Blacklist's: upload -> validate (each row OK / SKIPPED /
  // PROBLEM, nothing stored) -> import (one batch, decided by batch_id).
  upload: (fields) => uploadFile(`${WHITELIST}/upload`, fields),
  validate: call(WHITELIST, "validate"),
  import: call(WHITELIST, "import"),
};

// Flags: ongoing rescreening found a customer's AML result got worse. Each
// stays OPEN until a case is raised from it (AML Cases) or it is dismissed
// with a comment; either settles every open flag of that customer. The
// list replies { flags, total, open } (open = open flags, any filter).
export const amlFlagApi = {
  listPath: `${FLAG}/list`,
  list: call(FLAG, "list"),
  dismiss: call(FLAG, "dismiss"),
  // { open, open_customers }: the menu's badge.
  count: call(FLAG, "count"),
};

// Transaction Monitoring (menu 199): the institution's rules (one setup
// under maker-checker) watch posted transactions and raise alerts; an alert
// is noted, assigned, closed or escalated into a suspicious transaction
// report. scan runs the monitor at once (it runs every minute anyway).
const MONITORING = "/config/aml/monitoring";
export const amlMonitoringApi = {
  setup: { get: call(`${MONITORING}/setup`, "get"), edit: call(`${MONITORING}/setup`, "edit"), auth: call(`${MONITORING}/setup`, "auth"), deauth: call(`${MONITORING}/setup`, "deauth") },
  alerts: Object.fromEntries(["list", "get", "note", "assign", "close", "escalate"].map((v) => [v, call(`${MONITORING}/alert`, v)])),
  scan: call(MONITORING, "scan"),
};

// Regulatory Reports (menu 200): suspicious transaction reports (drafted,
// submitted, approved by another user, recorded as filed) and the nightly
// currency transaction reports. Each downloads as Excel or CSV.
const REPORTS = "/config/aml/report";
const reportFile = (path, name) => (body) => downloadAttachment(`${REPORTS}/${path}`, body, `${name}.${body.format === "CSV" ? "csv" : "xlsx"}`);
export const amlReportsApi = {
  str: { ...Object.fromEntries(["list", "get", "add", "edit", "submit", "auth", "deauth", "record_filing"].map((v) => [v, call(`${REPORTS}/str`, v)])), export: (body) => reportFile("str/export", `str_${body.reference ?? body.id}`)(body) },
  ctr: { ...Object.fromEntries(["list", "generate", "record_filing"].map((v) => [v, call(`${REPORTS}/ctr`, v)])), export: reportFile("ctr/export", "ctr") },
};
