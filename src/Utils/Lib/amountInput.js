// An amount typed by staff: digits and one point, at most `decimals`
// decimals (the currency's). Kept a string, as the server wants it.
export const amountInput = (value, decimals = 2) => {
  const clean = String(value ?? "").replace(/[^\d.]/g, "");
  // A leading 0 goes once a digit is typed after it ("05" -> "5", "0.5" stays).
  const [whole, ...rest] = clean.split(".").map((part, i) => (i === 0 ? part.replace(/^0+(?=\d)/, "") : part));
  return rest.length ? `${whole}.${rest.join("").slice(0, decimals)}` : whole;
};

// A percent being typed: like a rate (6 decimals), never above 100.
export const percentInput = (value) => {
  const clean = amountInput(value, 6);
  return Number(clean) > 100 ? "100" : clean;
};
