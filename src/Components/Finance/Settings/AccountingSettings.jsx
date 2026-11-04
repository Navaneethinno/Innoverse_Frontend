import { useTranslation } from "react-i18next";
import { labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field } from "@/Components/InnoCBS/Loans/loanShared";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { GlMultiPick, useAllGls } from "@/Components/InnoCBS/coreBankingShared";
import { accountingSettingsApi } from "@/Services/Accounting/accounting.api";

const CASH_FLOW_LISTS = ["cash_gl_ids", "investing_gl_ids", "financing_gl_ids"];
const BALANCE_SHEET = ["ASSET", "LIABILITY", "EQUITY"];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const toValue = (s) => ({
  fiscal_year_end_month: Number(s.fiscal_year_end_month) || 12,
  // What the cash flow statement counts as cash, investing and financing.
  ...Object.fromEntries(CASH_FLOW_LISTS.map((k) => [k, (s[k] ?? []).map(Number)])),
});

// Finance > Settings > Accounting Settings (menu 212): the fiscal year-end
// month and the cash flow statement's GL groups.
export function AccountingSettings() {
  const { t } = useTranslation("corebank");
  const gls = useAllGls(true);
  return (
    <SectionScreen api={accountingSettingsApi} fallbackTitle={t("tab_accounting")} toValue={toValue}>
      {({ shown, editing, setForm }) => {
        const set = (patch) => setForm((f) => ({ ...f, ...patch }));
        return (
          <>
            <label className={`${labelClass} block max-w-xs`}>
              {t("fiscalYearEnd")}
              <Field
                field={{ type: "select", options: MONTHS.map((m) => ({ value: String(m), label: new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" }) })) }}
                disabled={!editing}
                value={String(shown?.fiscal_year_end_month ?? 12)}
                onChange={(fiscal_year_end_month) => set({ fiscal_year_end_month })}
              />
            </label>
            <p className="mb-2 mt-5 text-sm font-bold">{t("cashFlowGls")}</p>
            <p className="mb-3 text-xs text-muted-foreground">{t("cashFlowHint")}</p>
            <div className="grid gap-3 lg:grid-cols-3">
              {CASH_FLOW_LISTS.map((key) => (
                <div key={key} className={labelClass}>
                  {t(`cf_${key}`)}
                  <GlMultiPick gls={(gls ?? []).filter((g) => BALANCE_SHEET.includes(g.gl_type))} disabled={!editing} value={shown?.[key] ?? []} onChange={(ids) => set({ [key]: ids })} />
                </div>
              ))}
            </div>
          </>
        );
      }}
    </SectionScreen>
  );
}
