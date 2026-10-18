import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, X } from "lucide-react";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Spinner } from "@/Components/Common/Spinner";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { round2 } from "./riskShared";

const scoreInput = "w-20 rounded-lg border px-2 py-1.5 text-right text-sm tabular-nums";

// Criteria: each an onboarding field from `options` with a weight (the
// weights total 100) and a 0–100 score per option; an unscored option
// counts as 0. `risk` is useRiskOptions' result.
export function CriteriaEditor({ risk, criteria, onChange }) {
  const { t } = useTranslation("risk");
  const [open, setOpen] = useState(() => criteria[0]?.field_code ?? null);
  const total = round2(criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0));
  const used = new Set(criteria.map((c) => c.field_code));
  const available = risk.options.fields.filter((f) => !used.has(f.field_code));

  // Options of every criterion already on the record (editing a setup).
  useEffect(() => {
    criteria.forEach((c) => risk.loadValues(c.field_code));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [risk.loadValues]);

  const set = (index, patch) => onChange(criteria.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  const add = (fieldCode) => {
    if (!fieldCode) return;
    risk.loadValues(fieldCode);
    onChange([...criteria, { field_code: fieldCode, weight: criteria.length ? "" : "100", scores: {} }]);
    setOpen(fieldCode);
  };
  const spreadEvenly = () => {
    const share = round2(100 / criteria.length);
    onChange(criteria.map((c, i) => ({ ...c, weight: String(i === criteria.length - 1 ? round2(100 - share * (criteria.length - 1)) : share) })));
  };

  return (
    <section data-tour="risk-criteria">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">
            {t("criteria")} <span className="text-red-500">*</span>
          </p>
          <p className="text-[11px] text-muted-foreground">{t("criteriaHint")}</p>
        </div>
        <div className="flex items-center gap-2">
          <span data-tour="risk-weight-total" className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${total === 100 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {t("weightTotal", { total })}
          </span>
          {criteria.length > 1 && (
            <button type="button" onClick={spreadEvenly} className="rounded-lg border px-2.5 py-1.5 text-xs font-bold text-primary">
              {t("spreadEvenly")}
            </button>
          )}
          <div data-tour="risk-add-criterion">
          <FilterSelect
            size="sm"
            className="w-56"
            value=""
            disabled={!available.length}
            onChange={add}
            options={[{ value: "", label: t("addCriterion") }, ...available.map((f) => ({ value: f.field_code, label: f.name }))]}
          />
          </div>
        </div>
      </div>

      {!criteria.length && <p className="mt-2 rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">{t("noCriteria")}</p>}

      <div className="mt-2 space-y-2">
        {criteria.map((c, index) => {
          const values = risk.values[c.field_code];
          const expanded = open === c.field_code;
          const scored = Object.values(c.scores).filter((s) => String(s).trim() !== "").length;
          return (
            <div key={c.field_code} className="rounded-xl border">
              <div className="flex items-center gap-2 p-2">
                <button type="button" onClick={() => setOpen(expanded ? null : c.field_code)} aria-expanded={expanded} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <ChevronDown size={15} className={`shrink-0 text-muted-foreground transition-transform ${expanded ? "" : "-rotate-90"}`} />
                  <span className="truncate text-sm font-semibold">{risk.fieldName(c.field_code)}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{t("scoredCount", { count: scored, total: values?.length ?? "…" })}</span>
                </button>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  {t("weight")}
                  <input type="number" min="0" max="100" step="any" value={c.weight} onChange={(e) => set(index, { weight: e.target.value })} className={scoreInput} />
                  %
                </label>
                <UiTooltip label={t("removeCriterion")}>
                  <button type="button" onClick={() => onChange(criteria.filter((_, i) => i !== index))} className="rounded-lg p-2 text-muted-foreground hover:text-destructive">
                    <X size={14} />
                  </button>
                </UiTooltip>
              </div>
              {expanded && (
                <div className="border-t p-2">
                  {!values ? (
                    <div className="flex justify-center py-3">
                      <Spinner size={16} />
                    </div>
                  ) : !values.length ? (
                    <p className="py-2 text-center text-xs text-muted-foreground">{t("noValues")}</p>
                  ) : (
                    <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                      {values.map((v) => (
                        <label key={v.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-sm hover:bg-muted/50">
                          <span className="truncate">{v.name}</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            placeholder="0"
                            value={c.scores[v.id] ?? ""}
                            onChange={(e) => set(index, { scores: { ...c.scores, [v.id]: e.target.value } })}
                            className={scoreInput}
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
