// The backend's real action names use British spelling ("Authorise", not
// "Authorize"), and there is no separate "Deauthorize"/"Deauthorise" action
// at all — deauthorizing a record is gated by the same Authorise grant as
// authorizing one (confirmed against a real /user/login response's
// menu_array; see buttonVisibility.js's getMakerCheckerButtons, which
// already treats `deauthorize` as `canAuthorize`-gated for this reason).
//
// Every permission check in this app should accept either spelling for a
// request of either "authorize" or "deauthorize", and should treat a grant
// of "Authorise"/"Authorize" as covering "deauthorize" too. This was
// previously duplicated (and inconsistently — some call sites had only the
// one-way "authorize"->"authorise" alias, none handled "deauthorize" at
// all) across DigitalProductResource.jsx, KycConfigResource.jsx,
// userHooks.js and kycHooks.js. Centralized here so every one of them
// (and any future page) gets the same, complete rule for free.
const GRANT_ALIASES = {
  authorize: ["authorise"],
  authorise: ["authorize"],
  deauthorize: ["deauthorise", "authorize", "authorise"],
  deauthorise: ["deauthorize", "authorize", "authorise"],
  add: ["create"],
  create: ["add"],
};

// grantedActionName: a single action's action_name/name from the backend's
// menu_array. requestedActionName: the permission the UI is asking about
// (e.g. "Authorize", "Deauthorize", "Add").
export function matchesAction(grantedActionName, requestedActionName) {
  const granted = String(grantedActionName ?? "").trim().toLowerCase();
  const requested = String(requestedActionName ?? "").trim().toLowerCase();
  if (!granted || !requested) return false;
  if (granted === requested) return true;
  return (GRANT_ALIASES[requested] ?? []).includes(granted);
}
