// "Response messages — what to show the user" (2026-09), app-wide rule:
//   - `message`            — the outcome, in the caller's language: ALWAYS the
//                            headline/toast.
//   - `data[0].problems`   — the reasons behind a multi-reason refusal, also
//                            translated: shown as a list under the headline.
//   - `remark`             — English technical detail for developers/logs:
//                            NEVER shown to users (not even as a fallback).
// Every request helper throws `new Error(getApiErrorMessage(payload, ...))`
// and every screen toasts `error.message`, so the problems travel inside the
// message string: headline, then one "• problem" line each.
// CompactPulseToast splits that back into a headline plus a list.
export const PROBLEM_BULLET = "• ";

export function getApiProblems(payload) {
  const data = payload?.data;
  const list = Array.isArray(data) ? data.find((item) => Array.isArray(item?.problems))?.problems : data?.problems;
  return Array.isArray(list) ? list.filter((p) => typeof p === "string" && p.trim()) : [];
}

export function getApiErrorMessage(payload, fallback) {
  const readable = (value) => {
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) {
      const messages = value.map(readable).filter(Boolean);
      return messages.length ? messages.join(", ") : null;
    }
    if (value && typeof value === "object") {
      // `remark` deliberately absent — see the rule above.
      for (const key of ["message", "detail", "error", "errors"]) {
        const message = readable(value[key]);
        if (message) return message;
      }
      return null;
    }
    return null;
  };
  const headline = readable(payload) || fallback;
  const problems = getApiProblems(payload);
  return problems.length ? [headline, ...problems.map((p) => PROBLEM_BULLET + p)].join("\n") : headline;
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
