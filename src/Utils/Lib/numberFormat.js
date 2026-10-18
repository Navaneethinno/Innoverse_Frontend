import store from "@/Redux/Store";

// The institution's number format (login `formats.number_format`, set on
// Institution > Profile). Every amount on screen goes through it; the API
// always gets plain decimals ("1234567.89").
const LOCALES = {
  WESTERN: "en-US", // 1,234,567.89
  INDIAN: "en-IN", // 12,34,567.89
  EUROPEAN: "de-DE", // 1.234.567,89
  SPACE: "fr-FR", // 1 234 567,89
};
export const NUMBER_FORMATS = Object.keys(LOCALES);

export const numberFormat = () => {
  const value = store.getState()?.token?.user?.formats?.number_format;
  return LOCALES[value] ? value : "WESTERN";
};

// The decimal separator of the current format ("." or ",").
export const decimalSeparator = () => (["EUROPEAN", "SPACE"].includes(numberFormat()) ? "," : ".");

const cache = new Map();
function formatter(format, min, max) {
  const key = `${format}:${min}:${max}`;
  if (!cache.has(key)) cache.set(key, new Intl.NumberFormat(LOCALES[format], { minimumFractionDigits: min, maximumFractionDigits: max }));
  return cache.get(key);
}

// `value` in the institution's format, with min..max decimals.
export function formatNumber(value, { min = 2, max = 6 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "");
  return formatter(numberFormat(), min, Math.max(min, max)).format(n);
}

// What a user typed (in the institution's format) as a plain decimal
// string: grouping dropped, the decimal separator made ".".
export function plainDecimal(text, decimals = 2) {
  const sep = decimalSeparator();
  const cleaned = String(text ?? "")
    .replace(/[\s\u00a0\u202f]/g, "")
    .split("")
    .filter((c) => /\d/.test(c) || c === sep)
    .join("");
  const [whole, ...rest] = cleaned.split(sep);
  const fraction = rest.join("").slice(0, decimals);
  if (!whole && !fraction && !cleaned.includes(sep)) return "";
  return cleaned.includes(sep) && decimals > 0 ? `${whole || "0"}.${fraction}` : whole;
}
