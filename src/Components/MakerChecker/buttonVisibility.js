// Single source of truth for maker-checker action-button visibility, driven
// ONLY by status_name and process_status_name (never id/code/mapcode — see
// "Frontend Status-Based Button Visibility" spec). Every list page should
// derive its buttons from deriveButtonVisibility()/useMakerCheckerButtons()
// here instead of hand-rolling its own draft/pending/active conditions, so
// a fix here fixes every page at once.

const PENDING_PROCESS_STATES = new Set([
  "PENDING ADD",
  "PENDING EDIT",
  "PENDING DELETE",
  "PENDING DEACTIVATE",
  "PENDING REACTIVATE",
]);

// One row per non-pending status_name value from the spec's Button
// Visibility Matrix. Pending rows aren't listed here — they're handled by
// PENDING_VISIBILITY below, keyed off process_status_name instead, since
// that's what actually carries the pending workflow state (status_name
// commonly stays e.g. "Active" while a delete/deactivate/reactivate is
// pending on it).
const STATUS_VISIBILITY = {
  ACTIVE: { edit: true, submitDraft: false, activate: false, deactivate: true, delete: true },
  "REJECTED ADD": { edit: true, submitDraft: false, activate: false, deactivate: false, delete: false },
  "REJECTED EDIT": { edit: true, submitDraft: false, activate: false, deactivate: true, delete: true },
  "REJECTED DELETE": { edit: true, submitDraft: false, activate: false, deactivate: true, delete: true },
  DELETED: { edit: false, submitDraft: false, activate: false, deactivate: false, delete: false },
  DRAFT: { edit: true, submitDraft: true, activate: false, deactivate: false, delete: false },
  UNDEFINED: { edit: false, submitDraft: false, activate: false, deactivate: false, delete: false },
  "REJECTED DEACTIVATE": { edit: true, submitDraft: false, activate: false, deactivate: true, delete: true },
  INACTIVE: { edit: true, submitDraft: false, activate: true, deactivate: false, delete: true },
  "REJECTED REACTIVATE": { edit: true, submitDraft: false, activate: true, deactivate: false, delete: false },
};

const PENDING_VISIBILITY = {
  edit: false,
  submitDraft: false,
  activate: false,
  deactivate: false,
  delete: false,
  authorize: true,
  deauthorize: true,
};

const FALLBACK_VISIBILITY = STATUS_VISIBILITY.UNDEFINED;

function normalize(value) {
  return String(value ?? "").trim().toUpperCase();
}

// Pure status -> button-visibility lookup, no permissions involved yet.
// View and Audit are always true (informational, never conflicts with a
// workflow) so they're fixed here rather than duplicated in every table.
export function deriveButtonVisibility(row) {
  const processState = normalize(row?.process_status_name);
  const statusState = normalize(row?.status_name);
  const isPendingDelete = processState === "PENDING DELETE";

  if (PENDING_PROCESS_STATES.has(processState)) {
    return { view: true, audit: true, ...PENDING_VISIBILITY, isPendingDelete };
  }
  const matched = STATUS_VISIBILITY[statusState] ?? FALLBACK_VISIBILITY;
  return { view: true, audit: true, authorize: false, deauthorize: false, ...matched, isPendingDelete: false };
}

// Combines the pure status lookup with the page's own permission grants
// (from useHasXAction calls) — a button only ever shows when BOTH the
// status allows it AND the user's permission allows it. `perms` accepts
// canEdit, canAdd (or canSubmit — either grants Submit Draft), canAuthorize,
// canChangeStatus, canDelete; any omitted permission defaults to false.
export function getMakerCheckerButtons(row, perms = {}) {
  const v = deriveButtonVisibility(row);
  const canEdit = perms.canEdit ?? false;
  const canSubmit = Boolean(perms.canAdd) || Boolean(perms.canSubmit);
  const canAuthorize = perms.canAuthorize ?? false;
  const canChangeStatus = perms.canChangeStatus ?? false;
  const canDelete = perms.canDelete ?? false;
  return {
    view: v.view,
    audit: v.audit,
    edit: v.edit && canEdit,
    submitDraft: v.submitDraft && canSubmit,
    authorize: v.authorize && canAuthorize,
    deauthorize: v.deauthorize && canAuthorize,
    activate: v.activate && canChangeStatus,
    deactivate: v.deactivate && canChangeStatus,
    delete: v.delete && canDelete,
    // Approving a pending DELETE must call the dedicated /delete_auth
    // endpoint, not the generic /auth one (confirmed against the API docs —
    // /auth only ever completes add/edit/deactivate/reactivate). The UI
    // still shows one "Authorize" button per the spec; callers use this
    // flag to route that click to the right mutation. Reject always uses
    // the generic /deauth endpoint regardless of which workflow is pending.
    isPendingDelete: v.isPendingDelete,
  };
}
