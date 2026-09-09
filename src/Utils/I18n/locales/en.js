// English translation objects, namespaced the same way i18n.js already
// declared them (common/auth) — one object per namespace, one file per
// language, matching payse's per-language-file convention
// (Services/Translation/EnglishTranslation.json etc.) rather than the
// original single inline `resources` object holding every language.
export const common = {
  appName: "Innoverse",
  cancel: "Cancel",
  retry: "Retry",
  settings: "Settings",
  signOut: "Sign out",
};

export const auth = {
  login: "Login",
  setup: "Setup",
};

export default { common, auth };
