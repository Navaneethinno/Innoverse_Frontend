// What a risk action does to a new customer's onboarding (Case Management
// handoff): APPROVE goes through when auto-approve is on, REVIEW opens a
// case, REJECT rejects directly. REVIEW can't approve, and ALLOW / REVIEW
// can't reject.
const ALL = ["APPROVE", "REVIEW", "REJECT"];

export function outcomesForCode(code) {
  const c = String(code ?? "").trim().toUpperCase();
  return ALL.filter((o) => !(o === "APPROVE" && c === "REVIEW") && !(o === "REJECT" && (c === "ALLOW" || c === "REVIEW")));
}
