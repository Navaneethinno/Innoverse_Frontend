import { EmptyNote } from "@/Components/Common/EmptyNote";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Plus, X } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { fatfCountriesApi, rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { Spinner } from "@/Components/Common/Spinner";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { percentInput } from "@/Components/InnoCBS/Deposits/depositShared";
import { round2 } from "./riskShared";
import { LinkButton } from "@/Components/Common/TextButtons";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";

const scoreInput = "w-20 rounded-lg border px-2 py-1.5 text-right text-sm tabular-nums";

const ComputedTag = () => {
  const { t } = useTranslation("risk");
  return <span className="shrink-0 rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold text-primary">{t("computed")}</span>;
};

// The FATF list the @fatf criterion reads (read-only; System keeps it).
function FatfList({ onClose }) {
  const { t } = useTranslation("risk");
  const [rows, setRows] = useState(null);
  useEffect(() => {
    fatfCountriesApi()
      .then((r) => setRows(rowsOf(r)))
      .catch((error) => {
        setRows([]);
        notifications.error(error.message);
      });
  }, []);
  return (
    <Modal open size="lg" onClose={onClose} title={t("fatfListTitle")}>
      {!rows ? (
        <div className="flex justify-center py-6">
          <Spinner size={18} />
        </div>
      ) : !rows.length ? (
        <EmptyNote>{t("fatfListEmpty")}</EmptyNote>
      ) : (
        <ul className="grid max-h-[60vh] gap-1.5 overflow-y-auto">
          {rows.map((c) => (
            <li key={c.country_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              <span className="font-semibold text-slate-700">{c.country_name}</span>
              <span className="text-right text-[11px] text-muted-foreground">
                <span className={c.list_code === "BLACK" ? "font-bold text-red-600" : "font-bold text-amber-700"}>{c.list_name}</span>
                <span className="block">{[c.listed_on, c.source].filter(Boolean).join(" · ")}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

// Bands of years, each with a score. The upper end is exclusive; left empty
// (only on the last band) it means no upper end.
function BandEditor({ bands, onChange }) {
  const { t } = useTranslation("risk");
  const put = (i, patch) => onChange(bands.map((b, n) => (n === i ? { ...b, ...patch } : b)));
  const cell = "w-full rounded-lg border px-2 py-1.5 text-right text-sm tabular-nums";
  return (
    <div className="grid gap-1.5">
      <p className="text-[11px] text-muted-foreground">{t("bandsHint")}</p>
      <div className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2 text-[11px] font-semibold text-muted-foreground">
        <span>{t("bandFrom")}</span>
        <span>{t("bandTo")}</span>
        <span>{t("score")}</span>
        <span />
      </div>
      {bands.map((b, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2rem] items-center gap-2">
          <input type="number" min="0" aria-label={t("bandFrom")} className={cell} value={b.from_years} onChange={(e) => put(i, { from_years: e.target.value })} />
          <input type="number" min="0" aria-label={t("bandTo")} placeholder={t("bandNoEnd")} className={cell} value={b.to_years} onChange={(e) => put(i, { to_years: e.target.value })} />
          <input type="number" min="0" max="100" step="any" aria-label={t("score")} className={cell} value={b.score} onChange={(e) => put(i, { score: percentInput(e.target.value) })} />
          <ActionIconButton label={t("removeBand")} intent="delete" icon={X} onClick={() => onChange(bands.filter((_, n) => n !== i))} />
        </div>
      ))}
      <Button size="sm" variant="secondary" icon={Plus} className="w-fit" onClick={() => onChange([...bands, { from_years: bands[bands.length - 1]?.to_years ?? "", to_years: "", score: "" }])}>
        {t("addBand")}
      </Button>
    </div>
  );
}

// Criteria: each an onboarding field from `options` with a weight (the
// weights total 100) and a 0–100 score per option; an unscored option
// counts as 0. `risk` is useRiskOptions' result.
export function CriteriaEditor({ risk, criteria, onChange }) {
  const { t } = useTranslation("risk");
  const [open, setOpen] = useState(() => criteria[0]?.field_code ?? null);
  const total = round2(criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0));
  const used = new Set(criteria.map((c) => c.field_code));
  const available = risk.options.fields.filter((f) => !used.has(f.field_code));
  const fieldOf = (code) => risk.options.fields.find((f) => f.field_code === code);
  const [showFatf, setShowFatf] = useState(false);

  // Options of every criterion on the record, and of each one added (loaded once per field).
  const { loadValues } = risk;
  useEffect(() => {
    criteria.forEach((c) => loadValues(c.field_code));
  }, [criteria, loadValues]);

  const set = (index, patch) => onChange(criteria.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  const add = (fieldCode) => {
    if (!fieldCode) return;
    const banded = fieldOf(fieldCode)?.banded;
    if (!banded) risk.loadValues(fieldCode);
    onChange([...criteria, { field_code: fieldCode, weight: criteria.length ? "" : "100", scores: {}, ...(banded ? { bands: [{ from_years: "0", to_years: "", score: "" }] } : {}) }]);
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
            <Button onClick={spreadEvenly} variant="outline" size="xs">
              {t("spreadEvenly")}
            </Button>
          )}
          <div data-tour="risk-add-criterion">
          <FilterSelect
            size="sm"
            className="w-56"
            value=""
            disabled={!available.length}
            onChange={add}
            options={[{ value: "", label: t("addCriterion") }, ...available.map((f) => ({
              value: f.field_code,
              searchText: f.name,
              label: f.computed ? (
                <span className="flex items-center justify-between gap-2">
                  {f.name} <ComputedTag />
                </span>
              ) : (
                f.name
              ),
            }))]}
          />
          </div>
        </div>
      </div>

      {!criteria.length && <p className="mt-2 rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">{t("noCriteria")}</p>}

      <div className="mt-2 space-y-2">
        {criteria.map((c, index) => {
          const values = risk.values[c.field_code];
          const expanded = open === c.field_code;
          const field = fieldOf(c.field_code);
          const banded = Boolean(c.bands) || field?.banded;
          const scored = Object.values(c.scores).filter((s) => String(s).trim() !== "").length;
          return (
            <div key={c.field_code} className="rounded-xl border">
              <div className="flex items-center gap-2 p-2">
                <button type="button" onClick={() => setOpen(expanded ? null : c.field_code)} aria-expanded={expanded} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <ChevronDown size={15} className={`shrink-0 text-muted-foreground transition-transform ${expanded ? "" : "-rotate-90"}`} />
                  <span className="truncate text-sm font-semibold">{risk.fieldName(c.field_code)}</span>
                  {field?.computed && <ComputedTag />}
                  <span className="shrink-0 text-[11px] text-muted-foreground">{banded ? t("bandsCount", { count: c.bands?.length ?? 0 }) : t("scoredCount", { count: scored, total: values?.length ?? "…" })}</span>
                </button>
                {c.field_code === "@fatf" && (
                  <LinkButton onClick={() => setShowFatf(true)} className="shrink-0">
                    {t("viewList")}
                  </LinkButton>
                )}
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  {t("weight")}
                  <input type="number" min="0" max="100" step="any" value={c.weight} onChange={(e) => set(index, { weight: percentInput(e.target.value) })} className={scoreInput} />
                  %
                </label>
                <UiTooltip label={t("removeCriterion")}>
                  <ActionIconButton label={t("common:remove")} intent="delete" icon={X} onClick={() => onChange(criteria.filter((_, i) => i !== index))} />
                </UiTooltip>
              </div>
              {expanded && (
                <div className="border-t p-2">
                  {banded ? (
                    <BandEditor bands={c.bands ?? []} onChange={(bands) => set(index, { bands })} />
                  ) : !values ? (
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
                            onChange={(e) => set(index, { scores: { ...c.scores, [v.id]: percentInput(e.target.value) } })}
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
      {showFatf && <FatfList onClose={() => setShowFatf(false)} />}
    </section>
  );
}
