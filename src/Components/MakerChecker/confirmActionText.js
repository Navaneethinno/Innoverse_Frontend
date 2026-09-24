// Shared "Are you sure you want to X <name>?" confirm-dialog sentence —
// AcctConfigResource.jsx/KycConfigResource.jsx/DigitalProduct.jsx
// each previously showed only the bare record name (no sentence at all)
// where Institution/Profile/User's own confirm dialogs show a full,
// grammatically correct question — this brings those three in line with
// that same phrasing instead of duplicating it three times.
import { i18n } from "@/Utils/I18n/i18n";

// Action -> common-namespace verb key.
const ACTION_VERB = {
  auth: "authorize",
  deleteAuth: "authorize",
  deauth: "deauthorize",
  delete: "delete",
  deactivate: "deactivate",
  reactivate: "reactivate",
  submit: "submit",
};

// Built through i18n directly (not a hook) so the sentence follows the
// selected language wherever it's called from. The old `tr` argument is
// still accepted for existing callers but no longer needed.
// eslint-disable-next-line no-unused-vars
export function describeConfirmAction(type, name, tr) {
  const verbKey = ACTION_VERB[type];
  const verb = verbKey ? i18n.t(`common:${verbKey}`) : String(type);
  return i18n.t("common:confirmActionQuestion", { action: verb.toLowerCase(), name });
}
