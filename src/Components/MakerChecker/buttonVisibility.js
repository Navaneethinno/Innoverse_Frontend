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

// Deliberately NOT in the set above: a live record's own process_status
// can be "DRAFT" too (Draft Deletion's "Edit-side draft" case — an
// authorized record with a staged-but-unsubmitted edit proposal, started
// via /edit with is_draft: true). That's not a pending-checker-approval
// state at all — the live row's business values were never touched, so
// there's nothing to authorize/reject. It falls through to whatever the
// record's own status_name row below says (typically ACTIVE, but per the
// backend spec it can just as well be "Rejected Edit" if the draft edit
// was started on top of a rejected-edit record) for edit/delete/deactivate
// — that row's existing `delete: true` already covers discarding the
// draft, since /delete's backend behavior branches on status/process_status.
// `submitDraft` is forced on regardless of which status row matched
// (confirmed live: "Save changes" on this shape silently left the record
// stuck in Draft with no way back — see CustomerMasterConfigResource.jsx's
// own fix for the same finding), so a checker-pending edit is never one
// click short of Submit just because its live status isn't literally
// "Draft".

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
  // Draft Deletion: an Add-side draft (status DRAFT, never submitted) can
  // be deleted outright by its own maker — no checker step, since nobody
  // but the maker has ever seen it. Backend hard-deletes the row (not a
  // soft pending-delete) and returns "<Entity> Draft Deleted Successfully".
  DRAFT: { edit: true, submitDraft: true, activate: false, deactivate: false, delete: true },
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
  // An edit-side draft on an otherwise-Active/Inactive/Rejected record
  // (process_status_name "Draft" while status_name isn't literally "Draft")
  // still needs Submit — see the comment above.
  const submitDraft = matched.submitDraft || processState === "DRAFT";
  return { view: true, audit: true, authorize: false, deauthorize: false, ...matched, submitDraft, isPendingDelete: false };
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
  // View/Audit follow the View grant when the page passes one; RowActions
  // also enforces it from the current menu.
  const canView = perms.canView ?? true;
  return {
    view: v.view && canView,
    audit: v.audit && canView,
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
