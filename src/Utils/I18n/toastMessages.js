import { i18n } from "./i18n";

// Toasts written by the frontend (form checks, request timeouts...) have no
// backend message behind them, so they are translated here, in
// notifications.jsx, by their English text (the `toasts` translations). A
// backend message is already in the user's language and passes through, as
// does any text not listed. A new frontend toast: add it to `toasts`.
const BY_TEXT = { ns: "toasts", keySeparator: false, nsSeparator: false };

// Messages with a variable part; the captured label was already translated
// where it was written.
const PATTERNS = [
  [/^Please select an? (.+)$/, "pattern_select", (m) => ({ what: m[1] })],
  [/^Please enter an? (.+)$/, "pattern_enter", (m) => ({ what: m[1] })],
  [/^Request failed with status (\d+)$/, "pattern_status", (m) => ({ status: m[1] })],
  [/^Password does not meet policy: (.+)$/s, "pattern_policy", (m) => ({ rules: m[1] })],
  [/^(.+) must be a valid hex color \(e\.g\. (#[0-9A-Fa-f]+)\)$/, "pattern_hex", (m) => ({ field: m[1], example: m[2] })],
];

export function translateToast(message) {
  if (typeof message !== "string" || !i18n.language || i18n.language.toLowerCase().startsWith("en")) return message;
  if (i18n.exists(message, BY_TEXT)) return i18n.t(message, BY_TEXT);
  for (const [pattern, key, values] of PATTERNS) {
    const match = message.match(pattern);
    if (match) return i18n.t(key, { ns: "toasts", ...values(match), interpolation: { escapeValue: false } });
  }
  return message;
}
