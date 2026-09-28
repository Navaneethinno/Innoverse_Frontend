import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { Spinner } from "@/Components/Common/Spinner";
import { saveBlob } from "@/Services/api/fileTransfer";
import { notifications } from "@/Utils/Lib/notifications";

// Shared by every Reports screen (read-only; handoffs 08–09).

export const glassCard = { background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" };
export const dateInput = "rounded-lg border px-2.5 py-1.5 text-xs";

// JSON times are UTC; reports show them in platform time (IST).
export const atIst = (value) =>
  value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-";

// "22 Sep – 28 Sep 2026" for a resolved range of YYYY-MM-DD days.
const day = (iso, withYear) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
export const rangeLabel = (range) => {
  if (!range?.from) return "";
  const to = range.to ?? range.from;
  const sameYear = range.from.slice(0, 4) === to.slice(0, 4);
  return range.from === to ? day(to, true) : `${day(range.from, !sameYear)} – ${day(to, true)}`;
};

export const PERIODS = ["TODAY", "YESTERDAY", "THIS_WEEK", "LAST_WEEK", "THIS_MONTH", "LAST_MONTH", "THIS_YEAR", "CUSTOM"];

// The period part of a report filter body: nothing for "" (all time, where
// the report allows it), a preset, or CUSTOM with from/to. null while a
// Custom period has no From day yet (the report can't run).
export function periodBody({ period, from, to }) {
  if (!period) return {};
  if (period !== "CUSTOM") return { period };
  if (!from) return null;
  return { period, from, ...(to ? { to } : {}) };
}

// Period chips (+ From/To for Custom). `allTime` adds a leading chip for
// "no period" on reports where the period is optional.
export function PeriodChips({ value, onChange, allTime = false }) {
  const { t } = useTranslation("reports");
  const chip = (active) =>
    `rounded-full border px-3 py-1 text-xs font-bold transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:border-primary hover:text-primary"}`;
  const options = allTime ? ["", ...PERIODS] : PERIODS;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((p) => (
        <button key={p || "ALL"} type="button" aria-pressed={value.period === p} onClick={() => onChange({ period: p })} className={chip(value.period === p)}>
          {t(p ? `period_${p}` : "allTime")}
        </button>
      ))}
      {value.period === "CUSTOM" && (
        <span className="ml-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          {t("from")} <input type="date" value={value.from} onChange={(e) => onChange({ from: e.target.value })} className={dateInput} />
          {t("to")} <input type="date" value={value.to} min={value.from || undefined} onChange={(e) => onChange({ to: e.target.value })} className={dateInput} />
        </span>
      )}
    </div>
  );
}

// Excel / CSV buttons. `exportFile(format)` resolves to { blob, fileName };
// a JSON error (e.g. over 100,000 rows) shows its message instead of a file.
export function ExportButtons({ exportFile, disabled = false, children }) {
  const { t } = useTranslation("reports");
  const [busy, setBusy] = useState("");
  const run = async (format) => {
    setBusy(format);
    try {
      const { blob, fileName } = await exportFile(format);
      saveBlob(blob, fileName);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {children}
      {["XLSX", "CSV"].map((format) => (
        <button
          key={format}
          type="button"
          disabled={disabled || Boolean(busy)}
          onClick={() => void run(format)}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {busy === format ? <Spinner size={12} /> : <Download size={13} />} {t(format === "XLSX" ? "excel" : "csv")}
        </button>
      ))}
    </div>
  );
}

// A band as a pill in its colour; neutral when it has none.
export function BandChip({ name, color }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold"
      style={color ? { borderColor: color, background: `${color}1a` } : undefined}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: color || "var(--muted-foreground)" }} />
      {name || "-"}
    </span>
  );
}
