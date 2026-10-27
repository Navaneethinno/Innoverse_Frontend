import { useSyncExternalStore } from "react";
import { canChooseInstitution } from "@/Utils/Lib/institutionScope";

// The institution a System or service-provider user is looking at (the top
// bar's Institution filter). Every list and dropdown request (a path ending
// in /list, /get_active or /options) carries it as inst_profile_id unless
// the screen already sends one; empty means every institution. A bank or
// fintech user never has one. It lasts for the browser tab's session.
const KEY = "institutionFilter";
const CHANGE = "institution-filter-changed";
const FILTERED = /\/(list|get_active|options)$/;
// Never filtered: the institution picker itself, platform masters and fixed
// catalogues belong to no institution.
const UNFILTERED = [
  /\/config\/institution\/profile\/(list|get_active|options)$/,
  /\/master\//,
  /\/config\/transaction\/options$/,
  /\/config\/ledger\/adjustment\/options$/,
  /\/config\/card\/bin\/options$/,
];

export function getInstitutionFilter() {
  try {
    return window.sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function setInstitutionFilter(value) {
  try {
    if (value) window.sessionStorage.setItem(KEY, String(value));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the choice simply isn't kept.
  }
  window.dispatchEvent(new Event(CHANGE));
}

const subscribe = (onChange) => {
  window.addEventListener(CHANGE, onChange);
  return () => window.removeEventListener(CHANGE, onChange);
};

export const useInstitutionFilter = () => useSyncExternalStore(subscribe, getInstitutionFilter);

const pathOf = (url) => {
  try {
    return new URL(url, window.location.origin).pathname.replace(/\/+$/, "");
  } catch {
    return String(url).split("?")[0];
  }
};

// A list or dropdown request's init with the chosen institution added to
// its JSON body.
export function withInstitutionFilter(url, init) {
  const chosen = getInstitutionFilter();
  if (!chosen || !canChooseInstitution() || typeof init?.body !== "string") return init;
  const path = pathOf(url);
  if (!FILTERED.test(path) || UNFILTERED.some((re) => re.test(path))) return init;
  try {
    const body = JSON.parse(init.body);
    if (!body || typeof body !== "object" || Array.isArray(body) || body.inst_profile_id != null) return init;
    return { ...init, body: JSON.stringify({ ...body, inst_profile_id: Number(chosen) }) };
  } catch {
    return init;
  }
}
