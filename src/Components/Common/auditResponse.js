// User Management audit endpoints use the common API envelope, but deployed
// services return pagination either beside `data` or inside it. Normalize
// both forms before handing history to the shared AuditModal.
export function mapAuditResponse(payload) {
  if (payload?.status && String(payload.status).toLowerCase() === "fail") {
    throw new Error(payload.remark || payload.message || "Failed to load audit history");
  }

  const data = payload?.data;
  const entries = Array.isArray(payload)
    ? payload
    : Array.isArray(data)
      ? data
      : data?.data ?? data?.audit_array ?? data?.user_audit_array ?? data?.profile_audit_array ?? [];
  const pagination = payload?.pagination ?? data?.pagination ?? {};

  return {
    entries: Array.isArray(entries) ? entries : [],
    totalPages: Math.max(1, Number(pagination.totalPages) || 1),
  };
}
