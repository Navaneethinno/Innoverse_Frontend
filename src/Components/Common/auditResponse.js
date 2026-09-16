const AUDIT_ARRAY_KEYS = [
  "audit_array",
  "user_audit_array",
  "profile_audit_array",
  "kyc_audit_array",
  "password_policy_audit_array",
  "records",
  "items",
  "list",
  "data",
];

// Confirmed against a real POST /user/audit response: `data` is an array
// containing ONE wrapper object — `{ data: [{ user_audit_array: [...] }] }`
// — not the entries directly. Naively returning the first array found (the
// old behavior) handed the modal that single wrapper object as if it were
// the one audit entry, so every field looked blank. An array only counts as
// "wrapper" (needing one more unwrap) when every element is a plain object
// that itself holds one of AUDIT_ARRAY_KEYS as an array — a real leaf entry
// (e.g. { username, status, ... }) never does, so this never misfires on
// entities whose array already holds real entries directly.
function isWrapperArray(items) {
  return (
    items.length > 0 &&
    items.every(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        AUDIT_ARRAY_KEYS.some((key) => Array.isArray(item[key])),
    )
  );
}

function findAuditEntries(value, depth = 0) {
  if (Array.isArray(value)) {
    if (depth <= 4 && isWrapperArray(value)) {
      return value.flatMap((item) => findAuditEntries(item, depth + 1));
    }
    return value;
  }
  if (!value || typeof value !== "object" || depth > 4) return [];

  for (const key of AUDIT_ARRAY_KEYS) {
    if (Array.isArray(value[key])) return findAuditEntries(value[key], depth + 1);
  }
  for (const key of AUDIT_ARRAY_KEYS) {
    const entries = findAuditEntries(value[key], depth + 1);
    if (entries.length > 0) return entries;
  }
  return [];
}

function findPagination(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 3) return null;
  if (value.pagination && typeof value.pagination === "object") return value.pagination;
  for (const key of AUDIT_ARRAY_KEYS) {
    const pagination = findPagination(value[key], depth + 1);
    if (pagination) return pagination;
  }
  return null;
}

// User Management audit endpoints use the common API envelope, but services
// have returned the record array and pagination at different nested levels.
// Normalize all documented forms before handing history to AuditModal.
export function mapAuditResponse(payload) {
  if (payload?.status && String(payload.status).toLowerCase() === "fail") {
    throw new Error(payload.remark || payload.message || "Failed to load audit history");
  }

  const entries = findAuditEntries(payload);
  const pagination = findPagination(payload) ?? {};

  return {
    entries,
    totalPages: Math.max(1, Number(pagination.totalPages ?? pagination.total_pages) || 1),
  };
}
