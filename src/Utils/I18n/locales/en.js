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

// The Login page's own visible strings — separate from `auth` above
// (which is a nav/route-label namespace, not this page's actual copy) so
// adding "Welcome back" etc. doesn't collide with those existing keys.
export const login = {
  tagline: "Fintech Administration Platform",
  welcomeBack: "Welcome back",
  username: "Username",
  password: "Password",
  forgotPassword: "Forgot Password?",
  signInSecurely: "Sign in securely",
  authenticating: "Authenticating…",
  showPassword: "Show password",
  hidePassword: "Hide password",
  enterCredentials: "Please enter your username and password",
  invalidCredentials: "Invalid credentials. Please try again.",
};

export default { common, auth, login };
