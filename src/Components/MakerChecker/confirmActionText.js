// Shared "Are you sure you want to X <name>?" confirm-dialog sentence —
// AcctConfigResource.jsx/KycConfigResource.jsx/DigitalProductResource.jsx
// each previously showed only the bare record name (no sentence at all)
// where Institution/Profile/User's own confirm dialogs show a full,
// grammatically correct question — this brings those three in line with
// that same phrasing instead of duplicating it three times.
const ACTION_VERB = {
  auth: "authorize",
  deleteAuth: "authorize",
  deauth: "deauthorize",
  delete: "delete",
  deactivate: "deactivate",
  reactivate: "reactivate",
  submit: "submit",
};

export function describeConfirmAction(type, name) {
  const verb = ACTION_VERB[type] ?? type;
  return `Are you sure you want to ${verb} ${name}?`;
}
