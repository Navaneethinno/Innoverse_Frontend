import { useTranslation } from "react-i18next";
import { ArrowRight, CornerDownLeft } from "lucide-react";

// How a change travels: draft, submitted, the approval levels, in force;
// a rejection sends it back to the maker.
const STAGES = [
  ["flowDraft", "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"],
  ["flowSubmitted", "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"],
  ["flowLevels", "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300"],
  ["flowActive", "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"],
];

export function ApprovalFlow() {
  const { t } = useTranslation("guide");
  return (
    <div className="mt-3 rounded-xl border bg-muted/40 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {STAGES.map(([key, tone], i) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${tone}`}>{t(key)}</span>
            {i < STAGES.length - 1 && <ArrowRight size={12} className="text-muted-foreground" />}
          </span>
        ))}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
        <CornerDownLeft size={12} /> {t("flowRejected")}
      </p>
      <dl className="mt-2 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
        <div>
          <dt className="inline font-bold text-foreground">{t("flowMaker")}</dt> <dd className="inline">{t("flowMakerBody")}</dd>
        </div>
        <div>
          <dt className="inline font-bold text-foreground">{t("flowChecker")}</dt> <dd className="inline">{t("flowCheckerBody")}</dd>
        </div>
      </dl>
    </div>
  );
}
