// Shared "Are you sure you want to X <name>?" confirm-dialog sentence —
// AcctConfigResource.jsx/KycConfigResource.jsx/DigitalProductResource.jsx
// each previously showed only the bare record name (no sentence at all)
// where Institution/Profile/User's own confirm dialogs show a full,
// grammatically correct question — this brings those three in line with
// that same phrasing instead of duplicating it three times.
const ACTION_VERB = {
  auth: "Authorize",
  deleteAuth: "Authorize",
  deauth: "Deauthorize",
  delete: "Delete",
  deactivate: "Deactivate",
  reactivate: "Reactivate",
  submit: "Submit",
};

// `tr` is the same configFieldLabels.js lookup the caller already uses for
// its field labels — passing it through here means this one sentence stays
// in sync with the page's language instead of only the words around it
// switching to Portuguese.
export function describeConfirmAction(type, name, tr = (s) => s) {
  const verb = ACTION_VERB[type] ?? type;
  return `${tr("Are you sure you want to")} ${tr(verb).toLowerCase()} ${name}?`;
}
