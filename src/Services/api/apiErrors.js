export function getApiErrorMessage(payload, fallback) {
  if (typeof payload === "object" && payload !== null && "detail" in payload) {
    return String(payload.detail);
  }
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    return String(payload.message);
  }
  if (typeof payload === "string" && payload.length > 0) {
    return payload;
  }
  return fallback;
}
export function getStatusErrorMessage(status) {
  if (status === 403) {
    return "Permission denied. You do not have access to this resource.";
  }
  if (status === 405) {
    return "Method not allowed on this endpoint (405).";
  }
  return null;
}
