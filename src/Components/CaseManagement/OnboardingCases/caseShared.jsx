import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { cn } from "@/Utils/Lib/utils";

// Small pieces shared by the case queue and the case screen.

export const caseDate = (value) => (value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");

// "5h" / "3d 4h" from the case's age in hours.
export function ageText(hours) {
  const h = Number(hours);
  if (!Number.isFinite(h)) return "—";
  if (h < 24) return `${Math.max(0, Math.round(h))}h`;
  const days = Math.floor(h / 24);
  return `${days}d ${Math.round(h - days * 24)}h`;
}

export function CaseStatus({ status, outcome }) {
  const { t } = useTranslation("cases");
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <StatusBadge status={status} variant="subtle" />
      {status === "CLOSED" && outcome && <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", OUTCOME_TONE[outcome])}>{t(`outcome_${outcome}`)}</span>}
    </span>
  );
}

// A proposal's or decision's outcome may come as APPROVE or APPROVED (and
// REJECT / REJECTED): anything starting with APPROV is an approval.
export const isApproval = (outcome) => /^APPROV/i.test(String(outcome ?? ""));

export const OUTCOME_TONE = {
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  WITHDRAWN: "bg-muted text-muted-foreground",
};

const REASON_TONE = {
  RISK_REJECT: "border-red-200 bg-red-50 text-red-700",
  AML_REJECT: "border-red-200 bg-red-50 text-red-700",
  AML_ERROR: "border-orange-200 bg-orange-50 text-orange-700",
  PRODUCT_NOT_ELIGIBLE: "border-orange-200 bg-orange-50 text-orange-700",
  RISK_REVIEW: "border-amber-200 bg-amber-50 text-amber-800",
  AML_REVIEW: "border-amber-200 bg-amber-50 text-amber-800",
};

export function ReasonChips({ reasons, className }) {
  const { t } = useTranslation("cases");
  if (!reasons?.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {reasons.map((code) => (
        <span key={code} title={t(`reasonHint_${code}`, { defaultValue: "" }) || undefined} className={cn("whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold", REASON_TONE[code] ?? "border-border bg-muted text-muted-foreground")}>
          {t(`reason_${code}`, { defaultValue: code })}
        </span>
      ))}
    </span>
  );
}

export function PriorityFlag({ priority }) {
  const { t } = useTranslation("cases");
  if (priority !== "HIGH") return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
      <AlertTriangle size={10} /> {t("high")}
    </span>
  );
}

export function OverdueFlag({ overdue }) {
  const { t } = useTranslation("cases");
  if (!overdue) return null;
  return <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-700 ring-1 ring-red-200">{t("overdue")}</span>;
}

// The risk level (from case.risk or a snapshot's risk).
export function RiskPill({ risk }) {
  const { t } = useTranslation("cases");
  if (!risk || !Object.keys(risk).length) return <span className="text-xs text-muted-foreground">{t("notScored")}</span>;
  const tone = { HIGH: "text-red-700 bg-red-50 border-red-200", MEDIUM: "text-amber-800 bg-amber-50 border-amber-200", LOW: "text-emerald-700 bg-emerald-50 border-emerald-200" }[String(risk.level_code ?? "").toUpperCase()];
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold", tone ?? "border-border bg-muted text-foreground")}>
      {risk.level_name ?? risk.level_code ?? t("noLevel")}
      {risk.risk_score != null && <span className="tabular-nums opacity-70">· {risk.risk_score}</span>}
    </span>
  );
}

// The AML band (from case.aml or a snapshot's aml).
export function AmlPill({ aml }) {
  const { t } = useTranslation("cases");
  if (!aml || !Object.keys(aml).length) return <span className="text-xs text-muted-foreground">{t("notScreened")}</span>;
  if (aml.status === "ERROR") return <span className="whitespace-nowrap rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-700">{t("screeningFailed")}</span>;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
      {aml.band_name ?? aml.band_code ?? t("noBand")}
      {aml.score != null && <span className="tabular-nums opacity-70">· {aml.score}</span>}
    </span>
  );
}

// The subject's kind: Customer / Merchant · Individual / Corporate.
export function subjectKind(t, subject) {
  return `${t(subject?.party === "MERCHANT" ? "merchant" : "customer")} · ${t(subject?.ownership === "CORPORATE" ? "corporate" : "individual")}`;
}
