import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Toggle } from "@/Components/Common/Toggle";
import { cbsEclApi } from "@/Services/Accounting/accounting.api";
import { loanProductsApi } from "@/Services/Loans/loans.api";
import { labelClass } from "../Deposits/depositShared";
import { Field, RowsEditor, useInstitutionScope } from "../Loans/loanShared";
import { SectionScreen } from "./SectionScreen";
import { SimpleTable } from "@/Components/Common/SimpleTable";

const STAGES = [1, 2, 3];
const blankStages = () => STAGES.map(() => ({ pd: "", lgd: "" }));
const stagesBody = (stages) => stages.map((x) => ({ pd: x.pd || "0", lgd: x.lgd || "0" }));
const toValue = (s) => ({
  enabled: Boolean(s.enabled),
  stage2_days: Number(s.stage2_days) || 0,
  stage3_days: Number(s.stage3_days) || 0,
  restructured_stage2: Boolean(s.restructured_stage2),
  stages: stagesBody(s.stages),
  products: s.products.map((p) => ({ loan_product_id: Number(p.loan_product_id), stages: stagesBody(p.stages) })),
});
function problemOf(t, s) {
  if (s.enabled && Number(s.stage3_days) <= Number(s.stage2_days)) return t("stage3AfterStage2");
  if (s.products.some((p) => !p.loan_product_id)) return t("eclProductMissing");
  return "";
}

// InnoCBS > Settings > Expected Credit Loss (menu 208): IFRS 9 stages and rates.
export function ExpectedCreditLoss() {
  const { t } = useTranslation("corebank");
  const { chooser, institution, scope } = useInstitutionScope();
  const [products, setProducts] = useState([]);
  // Loan products, for the per-product overrides.
  useEffect(() => {
    if (chooser && !institution) return;
    loanProductsApi
      .list(scope({ limit: 200 }))
      .then((r) => setProducts((Array.isArray(r?.data) ? r.data : []).map((p) => ({ value: String(p.id), label: [p.code ?? p.product_code, p.name ?? p.product_name].filter(Boolean).join(" · ") }))))
      .catch(() => setProducts([]));
  }, [chooser, institution, scope]);
  return (
    <SectionScreen api={cbsEclApi} fallbackTitle={t("tab_ecl")} toValue={toValue} problemOf={problemOf}>
      {({ shown, editing, setForm }) => {
        const set = (patch) => setForm((f) => ({ ...f, ...patch }));
        return (
          <>
            <p className="mb-3 text-xs text-muted-foreground">{t("eclHint")}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Toggle showLabel label={t("eclEnabled")} disabled={!editing} checked={Boolean(shown?.enabled)} onChange={(enabled) => set({ enabled })} />
              <Toggle showLabel label={t("restructuredStage2")} disabled={!editing} checked={Boolean(shown?.restructured_stage2)} onChange={(restructured_stage2) => set({ restructured_stage2 })} />
              {["stage2_days", "stage3_days"].map((key) => (
                <label key={key} className={labelClass}>
                  {t(key)}
                  <Field field={{ type: "int" }} disabled={!editing} value={String(shown?.[key] ?? "")} onChange={(v) => set({ [key]: v })} />
                </label>
              ))}
            </div>
            <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("eclDefaults")}</h3>
            <StageGrid stages={shown?.stages ?? blankStages()} disabled={!editing} onChange={(stages) => set({ stages })} />
            <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("eclProducts")}</h3>
            <RowsEditor
              rows={(shown?.products ?? []).map((p) => ({ ...p, loan_product_id: p.loan_product_id ? String(p.loan_product_id) : "" }))}
              disabled={!editing}
              onChange={(list) => set({ products: list })}
              blank={() => ({ loan_product_id: "", stages: structuredClone(shown?.stages ?? blankStages()) })}
              addLabel={t("addProductOverride")}
              columns="lg:grid-cols-2"
              fields={[{ key: "loan_product_id", label: t("loanProduct"), type: "select", blank: t("choose"), options: products }]}
              renderExtra={(row, patch) => (
                <div className="mt-3">
                  <StageGrid stages={row.stages ?? blankStages()} disabled={!editing} onChange={(stages) => patch({ stages })} />
                </div>
              )}
            />
          </>
        );
      }}
    </SectionScreen>
  );
}

// PD / LGD per stage, as a 3-row grid (percents).
function StageGrid({ stages, disabled, onChange }) {
  const { t } = useTranslation("corebank");
  const set = (i, patch) => onChange(stages.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <SimpleTable className="text-sm" columns={[t("stage"), t("pd"), t("lgd")]}>
        <tbody>
          {stages.map((s, i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-3 py-2 font-bold">{t("stageN", { n: i + 1 })}</td>
              {["pd", "lgd"].map((key) => (
                <td key={key} className="px-3 py-1.5">
                  <Field field={{ type: "percent" }} disabled={disabled} value={s[key]} onChange={(v) => set(i, { [key]: v })} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </SimpleTable>
    </div>
  );
}
