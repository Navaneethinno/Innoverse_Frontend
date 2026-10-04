import { API_ENDPOINTS } from "@/Utils/Constant";
import { createLifecycle, request } from "@/Services/Epurse/onboarding.api";
import { uploadFile } from "@/Services/api/fileTransfer";

// InnoAML (AML handoffs 03–07, 2026-09). Every call is a POST with the usual
// admin login, menu permissions and reply envelope.
const { SETUP, INTERNAL_LIST, SCREENING, LOOKUP, REVIEW } = API_ENDPOINTS.AML;
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
