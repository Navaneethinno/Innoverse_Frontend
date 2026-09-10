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

function findAuditEntries(value, depth = 0) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object" || depth > 3) return [];

  for (const key of AUDIT_ARRAY_KEYS) {
    if (Array.isArray(value[key])) return value[key];
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
