import { toast } from "react-toastify";
import { Toast } from "@/Components/Common/Toast";

function show(type, message, options) {
  return toast(<Toast type={type} message={message} title={options?.title} />, {
    icon: false,
    ...options,
  });
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
