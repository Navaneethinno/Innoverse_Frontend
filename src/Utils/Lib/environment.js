import { useSyncExternalStore } from "react";
import { API_BASE_URL } from "@/Utils/Constant";

// The platform's environment (UAT handoff): every API reply carries
// `X-Environment: UAT | PRODUCTION`. The first reply that says sets it for
// the session. Missing means nothing is shown — never assume UAT.
let environment = null;
const listeners = new Set();

const set = (value) => {
  const next = String(value ?? "").trim().toUpperCase() || null;
  if (!next || next === environment) return;
  environment = next;
  listeners.forEach((listener) => listener());
  markTitle();
};

// "[UAT] " in front of the tab title, so testers can tell tabs apart; kept
// there as pages change the title.
const PREFIX = "[UAT] ";
function markTitle() {
  if (environment === "UAT" && !document.title.startsWith(PREFIX)) document.title = PREFIX + document.title;
}

// Every request goes through fetch: one wrapper reads the header off any
// reply from the API, whichever helper made the call.
export function watchEnvironment() {
  const send = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await send(...args);
    const url = String(args[0]?.url ?? args[0] ?? "");
    if (!environment && (!API_BASE_URL || url.startsWith(API_BASE_URL) || url.startsWith("/"))) set(response.headers.get("X-Environment"));
    return response;
  };
  const title = document.querySelector("title");
  if (title) new MutationObserver(markTitle).observe(title, { childList: true });
}

export const useEnvironment = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => environment,
  );
