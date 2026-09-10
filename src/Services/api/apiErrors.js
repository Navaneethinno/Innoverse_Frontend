export function getApiErrorMessage(payload, fallback) {
  const readable = (value) => {
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) {
      const messages = value.map(readable).filter(Boolean);
      return messages.length ? messages.join(", ") : null;
    }
    if (value && typeof value === "object") {
      for (const key of ["detail", "message", "remark", "error", "errors"]) {
        const message = readable(value[key]);
        if (message) return message;
      }
      try {
        return JSON.stringify(value);
      } catch {
        return null;
      }
    }
    return null;
  };
  return readable(payload) || fallback;
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
