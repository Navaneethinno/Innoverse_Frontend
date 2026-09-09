// Selected API response language — confirmed backend behavior: the
// `message` field in every response is translated per the requested
// locale via an `x-api-lang` request header (e.g. "pt" -> "Código É
// Obrigatório" instead of "Code Required"); `remark` (internal
// diagnostic) always stays English regardless. English is the backend's
// own default, so — matching the confirmed example ("English (default,
// no header)") — the header is omitted entirely rather than sent as
// "en", to stay a literal pass-through of the confirmed contract instead
// of guessing English also needs an explicit value.
export const DEFAULT_API_LANGUAGE = "en";
const STORAGE_KEY = "apiLang";
const CHANGE_EVENT = "api-language-changed";

export function getApiLanguage() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_API_LANGUAGE;
  } catch {
    return DEFAULT_API_LANGUAGE;
  }
}

export function setApiLanguage(code) {
  const next = code || DEFAULT_API_LANGUAGE;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // localStorage can be unavailable (private mode, permissions) — the
    // selection just won't survive a reload in that case.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
}

// Components (the login page and top bar dropdowns) call this to stay in
// sync if the language is changed from the OTHER dropdown in the same
// session, without needing a shared Redux slice for one small value.
export function onApiLanguageChange(handler) {
  const listener = (event) => handler(event.detail ?? getApiLanguage());
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

// Spread into every service's fetch headers. Every confirmed-live
// endpoint's fetch wrapper already builds its headers inline (there is no
// single central HTTP client to patch once) — this is the one shared piece
// each of them spreads in, so a future language addition needs no service
// file changes.
export function apiLanguageHeader() {
  const lang = getApiLanguage();
  return lang && lang !== DEFAULT_API_LANGUAGE ? { "x-api-lang": lang } : {};
}
