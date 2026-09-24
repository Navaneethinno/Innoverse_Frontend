import { showPulseToast } from "@/Components/Common/CompactPulseToast";
import { translateToast } from "@/Utils/I18n/toastMessages";

// CompactPulseToast only has two visual variants (a neutral dark pill with
// either a check ring or an error ring) — no separate warning/info
// styling of its own. error keeps its own red ring; every other type
// (success/warning/info — only "info" is ever actually called anywhere in
// the app today) shares the same check-ring styling.
// translateToast only rewrites toast text the frontend itself wrote (form
// checks, timeouts...). A backend `message` is already translated through
// x-api-lang and passes through unchanged. See toastMessages.js.
function show(type, message) {
  showPulseToast(translateToast(message), { variant: type === "error" ? "error" : "success" });
}

export const notifications = {
  success: (message, options) => show("success", message, options),
  error: (message, options) => show("error", message, options),
  warning: (message, options) => show("warning", message, options),
  info: (message, options) => show("info", message, options),
};

// Every confirmed-live endpoint's response envelope includes its own
// `message` (e.g. "Login Successful", "Pending Change Fetched
// Successfully") — the backend's own description of what happened, more
// specific and more likely to match what actually occurred than a single
// hardcoded string reused for every outcome of a given action. Used for the
// success side; the error side already goes through getApiErrorMessage()
// (apiErrors.js), which checks payload.message the same way.
export function apiMessage(result, fallback) {
  const message = result?.message;
  return typeof message === "string" && message.trim() !== "" ? message : fallback;
}
