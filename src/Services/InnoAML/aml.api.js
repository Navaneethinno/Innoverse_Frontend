import { API_ENDPOINTS } from "@/Utils/Constant";
import { createLifecycle, request, requestStream } from "@/Services/Epurse/onboarding.api";
import { uploadFile } from "@/Services/api/fileTransfer";

// InnoAML (AML handoffs 03–07, 2026-09). Every call is a POST with the usual
// admin login, menu permissions and reply envelope.
const { SETUP, INTERNAL_LIST, SCREENING, LOOKUP, REVIEW, MEDIA, MEDIA_REVIEW } = API_ENDPOINTS.AML;
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
  propose: call(MEDIA_REVIEW, "propose"),
  auth: call(MEDIA_REVIEW, "auth"),
  deauth: call(MEDIA_REVIEW, "deauth"),
  pending: call(MEDIA_REVIEW, "pending"),
  list: call(MEDIA_REVIEW, "list"),
};
