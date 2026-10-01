// Every request body is trimmed before it is sent: leading/trailing spaces
// come off each text value, at any depth (objects and arrays). Passwords are
// the exception and go exactly as typed (a space can be part of one).
const KEEP_AS_TYPED = /pass(word)?|pwd|secret/i;

export function trimPayload(value, key = "") {
  if (typeof value === "string") return KEEP_AS_TYPED.test(key) ? value : value.trim();
  if (Array.isArray(value)) return value.map((item) => trimPayload(item, key));
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, trimPayload(v, k)]));
  }
  return value;
}
