import { DateInput } from "@/Components/Common/DateInput";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download } from "lucide-react";
import { Spinner } from "@/Components/Common/Spinner";
import { saveBlob } from "@/Services/api/fileTransfer";
import { notifications } from "@/Utils/Lib/notifications";
import { useBrandTheme } from "@/Hooks/Providers/BrandThemeProvider";

// Shared by every Reports screen (read-only; handoffs 08–09).

export const glassCard = { background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" };
export const dateInput = "w-auto min-w-[8.5rem] rounded-lg border px-2.5 py-1.5 text-xs";

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
          {t("from")} <DateInput value={value.from} onChange={(e) => onChange({ from: e.target.value })} className={dateInput} />
          {t("to")} <DateInput value={value.to} min={value.from || undefined} onChange={(e) => onChange({ to: e.target.value })} className={dateInput} />
        </span>
      )}
    </div>
  );
}

// Excel / CSV buttons. `exportFile(format)` resolves to { blob, fileName };
// a JSON error (e.g. over 100,000 rows) shows its message instead of a file.
// Excel / CSV download the server's file. PDF takes the same export as CSV
// and opens a preview page in a new tab (the institution's logo, the report
// box, the table, a logo watermark) whose Download PDF saves the same
// layout (reportPdf.js).
export function ExportButtons({ exportFile, disabled = false, children }) {
  const { t } = useTranslation("reports");
  const { paper } = useBrandTheme();
  const [busy, setBusy] = useState("");
  const run = async (format) => {
    // The tab opens on the click itself (a popup opened after the await
    // would be blocked), showing a short note until the PDF is ready.
    const tab = format === "PDF" ? window.open("", "_blank") : null;
    if (tab) tab.document.write(`<title>${t("pdfPreparing")}</title><p style="font:14px system-ui;color:#64748b;padding:24px">${t("pdfPreparing")}</p>`);
    setBusy(format);
    try {
      const { blob, fileName } = await exportFile(format === "PDF" ? "CSV" : format);
      if (format !== "PDF") return saveBlob(blob, fileName);
      const { loadLogo, previewHtml, reportModel, reportPdf } = await import("./reportPdf");
      const base = String(fileName ?? t("report")).replace(/\.[^.]+$/, "");
      // "card_summary_2026-10-01_2026-10-05" -> "Card Summary (01 Oct 2026 – 05 Oct 2026)".
      const dates = [...base.matchAll(/(\d{4})-(\d{2})-(\d{2})/g)].map(([iso]) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }));
      const words = base.replace(/\d{4}-\d{2}-\d{2}/g, " ").replace(/[_-]+/g, " ").trim().replace(/\s+/g, " ").replace(/(^|\s)\w/g, (c) => c.toUpperCase());
      const title = dates.length ? `${words} (${dates.join(" – ")})` : words;
      const model = reportModel(await blob.text(), {
        title,
        generatedOn: atIst(new Date().toISOString()),
        color: paper?.color,
        logo: await loadLogo(paper?.logoUrl),
        labels: { reportName: t("reportName"), generatedOn: t("generatedOn"), download: t("downloadPdf"), empty: t("noRowsInReport") },
      });
      const pdf = await reportPdf(model);
      if (!tab) return saveBlob(pdf, `${base}.pdf`);
      // The preview stays open as long as the user wants: its PDF link is not revoked.
      const html = previewHtml(model, { pdfUrl: URL.createObjectURL(pdf), fileName: `${base}.pdf` });
      tab.document.open();
      tab.document.write(html);
      tab.document.close();
    } catch (error) {
      tab?.close();
      notifications.error(error.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {children}
      {["XLSX", "CSV", "PDF"].map((format) => (
        <button
          key={format}
          type="button"
          disabled={disabled || Boolean(busy)}
          onClick={() => void run(format)}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {busy === format ? <Spinner size={12} /> : <Download size={13} />} {t({ XLSX: "excel", CSV: "csv", PDF: "pdf" }[format])}
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

// A report row's detail as a full page instead of a pop-up: Back (or Esc)
// returns to the list. The list stays mounted (hidden) behind it — see
// useReportDetail — so its filters, page and scroll position survive.
export function ReportDetailPage({ title, onBack, children }) {
  const { t } = useTranslation("reports");
  useEffect(() => {
    window.scrollTo({ top: 0 });
    const onKey = (e) => e.key === "Escape" && onBack();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);
  return (
    <div className="pt-1 pb-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-primary hover:text-primary"
        >
          <ArrowLeft size={14} /> {t("back")}
        </button>
        <h1 className="min-w-0 truncate text-xl font-black text-slate-800">{title}</h1>
      </div>
      <div className="rounded-2xl p-5" style={glassCard}>
        {children}
      </div>
    </div>
  );
}

// Which row's detail is open, remembering the list's scroll position so
// Back lands where the user was.
export function useReportDetail() {
  const [open, setOpen] = useState(null);
  const scrollY = useRef(0);
  const show = useCallback((row) => {
    scrollY.current = window.scrollY;
    setOpen(row);
  }, []);
  const back = useCallback(() => {
    setOpen(null);
    window.requestAnimationFrame(() => window.scrollTo({ top: scrollY.current }));
  }, []);
  return { open, show, back };
}
