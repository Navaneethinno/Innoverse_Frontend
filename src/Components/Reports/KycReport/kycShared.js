// A risk / AML summary only counts when it carries a score: a customer never
// scored or screened gets the object with every field null.
export const scoredRisk = (r) => (r && r.risk_score != null ? r : null);
export const screenedAml = (a) => (a && (a.effective_score ?? a.score) != null ? a : null);
