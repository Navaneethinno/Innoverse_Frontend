import i18n from "i18next";
import store from "@/Redux/Store";

// The institution's date format (login / refresh `formats.date_format`, set
// on Institution > Profile). Display only: the API always gets YYYY-MM-DD.
const DATE_FORMATS = ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "DD.MM.YYYY", "DD MMM YYYY"];

const dateFormat = () => {
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

// Every time on screen is in Asia/Kolkata, whatever the browser's zone.
const IST_CLOCK = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
const istParts = (date) => Object.fromEntries(IST_CLOCK.formatToParts(date).map((x) => [x.type, x.value]));

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const NO_ZONE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;
const ZONED = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}.*(Z|[+-]\d{2}(:?\d{2})?)$/i;
const isDateOnly = (value) => typeof value === "string" && DATE_ONLY.test(value.trim());

// The API's date-time form: UTC, Z and six fractional digits. For generic
// renderers (audit values, change diffs) that only have the text to go on.
export const isApiDateTime = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(value);

// A value as an instant. One with no zone is platform time (IST), never the
// browser's.
function instantOf(value) {
  if (value instanceof Date) return value;
  const text = typeof value === "string" ? value.trim() : value;
  return new Date(typeof text === "string" && NO_ZONE.test(text) ? `${text.replace(" ", "T")}+05:30` : text);
}

// A calendar date. A date-only value (or a value with no zone) as written;
// a timestamp or Date is the day it falls on in IST.
export function formatDay(value) {
  if (!value) return "—";
  if (value instanceof Date || (typeof value === "string" && ZONED.test(value.trim()))) {
    const d = instantOf(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const p = istParts(d);
    return ymd(Number(p.year), Number(p.month) - 1, Number(p.day));
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (match) return ymd(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : ymd(d.getFullYear(), d.getMonth(), d.getDate());
}

// A timestamp in IST: the date in the institution's format, then HH:mm
// (24-hour) and the label. A date-only value stays a date, unshifted.
export function formatDateTime(value) {
  if (!value) return "—";
  if (isDateOnly(value)) return formatDay(value);
  const d = instantOf(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const p = istParts(d);
  return `${ymd(Number(p.year), Number(p.month) - 1, Number(p.day))} ${p.hour}:${p.minute} IST`;
}

// The same to the second with no label, for files; null when it isn't a time.
export function formatIstPlain(value) {
  if (!value) return null;
  if (isDateOnly(value)) return formatDay(value);
  const d = instantOf(value);
  if (Number.isNaN(d.getTime())) return null;
  const p = istParts(d);
  return `${ymd(Number(p.year), Number(p.month) - 1, Number(p.day))} ${p.hour}:${p.minute}:${p.second}`;
}

// A timestamp as the "YYYY-MM-DDTHH:mm" of a datetime box, in IST.
export function istInputValue(value) {
  if (!value) return "";
  const d = instantOf(value);
  if (Number.isNaN(d.getTime())) return "";
  const p = istParts(d);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// A "YYYY-MM-DDTHH:mm[:ss]" typed on the IST clock, as a UTC ISO string.
export const istToUtc = (text) => new Date(`${text}+05:30`).toISOString();

// A value for a generic renderer: an API date-time in IST, anything else untouched.
export const istIfDateTime = (value) => (isApiDateTime(value) ? formatDateTime(value) : value);

// Calendar dates (YYYY-MM-DD) as the user sees them: their own day, not UTC's.
export const localDay = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const todayDate = () => localDay(new Date());
export const tomorrowDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return localDay(date);
};
export const monthStartDate = () => `${todayDate().slice(0, 8)}01`;

// Today on the platform's calendar (Asia/Kolkata), whatever the browser's zone:
// the default for teller dates and manual journal posting dates.
const PLATFORM_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });
export const platformToday = () => PLATFORM_DAY.format(new Date());
