// Shared by the User Activity page and its detail panel.

// JSON times are UTC; the report shows them in platform time (IST).
const PLATFORM_TZ = "Asia/Kolkata";
export const atIst = (value) =>
  value ? new Date(value).toLocaleString("en-IN", { timeZone: PLATFORM_TZ, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-";

// "22 Sep – 28 Sep 2026" for the resolved range (YYYY-MM-DD days).
const day = (iso, withYear) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
export const rangeLabel = (range) => {
  if (!range?.from) return "";
  const to = range.to ?? range.from;
  const sameYear = range.from.slice(0, 4) === to.slice(0, 4);
  return range.from === to ? day(to, true) : `${day(range.from, !sameYear)} – ${day(to, true)}`;
};

export const PERIODS = ["TODAY", "YESTERDAY", "THIS_WEEK", "LAST_WEEK", "THIS_MONTH", "LAST_MONTH", "THIS_YEAR", "CUSTOM"];
export const ROLES = ["MAKER", "CHECKER", "DIRECT"];

const ROLE_TONES = {
  MAKER: "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary",
  CHECKER: "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success",
  DIRECT: "bg-amber-50 text-amber-700",
};
export function RoleBadge({ role, name }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${ROLE_TONES[role] ?? "bg-muted text-muted-foreground"}`}>{name ?? role}</span>;
}

// A record's label, or #id, or just its type.
export const recordText = (row) => row?.record_label ?? (row?.record_id != null ? `#${row.record_id}` : row?.entity_name ?? "-");

// Database field names as words: min_match_score -> "Min match score".
export const fieldWords = (field) => {
  const text = String(field ?? "").replace(/_/g, " ").trim();
  return text ? text[0].toUpperCase() + text.slice(1) : "";
};

// Text, numbers, booleans, null, or lists/objects (as indented JSON).
export function ValueCell({ value }) {
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">—</span>;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted/60 p-1.5 text-[11px]">{JSON.stringify(value, null, 2)}</pre>;
  return <span className="break-words">{String(value)}</span>;
}
