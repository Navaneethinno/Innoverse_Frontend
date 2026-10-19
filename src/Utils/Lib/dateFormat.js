import i18n from "i18next";
import store from "@/Redux/Store";

// The institution's date format (login / refresh `formats.date_format`, set
// on Institution > Profile). Display only: the API always gets YYYY-MM-DD.
export const DATE_FORMATS = ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "DD.MM.YYYY", "DD MMM YYYY"];

export const dateFormat = () => {
  const value = store.getState()?.token?.user?.formats?.date_format;
  return DATE_FORMATS.includes(value) ? value : "YYYY-MM-DD";
};

const pad = (n) => String(n).padStart(2, "0");

// MMM: the short month name in the user's language ("Oct", "out").
const monthNames = {};
function monthName(m) {
  const lang = i18n.language || "en";
  monthNames[lang] ??= Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(lang, { month: "short", timeZone: "UTC" }).format(Date.UTC(2000, i, 1)));
  return monthNames[lang][m];
}

function ymd(y, m, d) {
  const parts = { YYYY: String(y), MM: pad(m + 1), DD: pad(d), MMM: monthName(m) };
  return dateFormat().replace(/YYYY|MMM|MM|DD/g, (token) => parts[token]);
}

// A date-only value ("2026-10-18", or the date part of a timestamp) as
// written, without a time-zone shift.
export function formatDay(value) {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (match) return ymd(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : ymd(d.getFullYear(), d.getMonth(), d.getDate());
}

// A timestamp in local time: the date in the institution's format, then
// HH:mm (24-hour).
export function formatDateTime(value) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${ymd(d.getFullYear(), d.getMonth(), d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
