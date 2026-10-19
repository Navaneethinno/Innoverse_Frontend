// What a phone number field keeps while typing: digits, and one "+" only
// as the first character (the country code, e.g. +258841234567). Letters,
// spaces and other symbols are dropped. At most 15 digits (E.164).
export function phoneInput(value) {
  const text = String(value ?? "");
  const digits = text.replace(/\D/g, "").slice(0, 15);
  return text.trimStart().startsWith("+") ? `+${digits}` : digits;
}
