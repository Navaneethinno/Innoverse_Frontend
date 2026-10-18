import store from "@/Redux/Store";

// The institution's date format (login / refresh `formats.date_format`, set
// on Institution > Profile). Display only: the API always gets YYYY-MM-DD.
export const DATE_FORMATS = ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "DD.MM.YYYY", "DD MMM YYYY"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const dateFormat = () => {
  const value = store.getState()?.token?.user?.formats?.date_format;
  return DATE_FORMATS.includes(value) ? value : "YYYY-MM-DD";
};

const pad = (n) => String(n).padStart(2, "0");

function ymd(y, m, d) {
  const parts = { YYYY: String(y), MM: pad(m + 1), DD: pad(d), MMM: MONTHS[m] };
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
