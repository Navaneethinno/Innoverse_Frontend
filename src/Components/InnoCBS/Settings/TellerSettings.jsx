import { useTranslation } from "react-i18next";
import { MenuLink } from "@/Components/Common/MenuLink";
import { cbsTellerApi } from "@/Services/Accounting/accounting.api";
import { labelClass } from "../Deposits/depositShared";
import { Field } from "../Loans/loanShared";
import { SectionScreen } from "./SectionScreen";

// The chart-of-accounts groups every till's and vault's GL sits under.
const toValue = (s) => ({ till_cash_gl_id: Number(s.till_cash_gl_id) || 0, vault_cash_gl_id: Number(s.vault_cash_gl_id) || 0 });

// InnoCBS > Settings > Teller Settings (menu 211): till and vault cash GL parents.
export function TellerSettings() {
  const { t } = useTranslation("corebank");
  return (
    <SectionScreen api={cbsTellerApi} fallbackTitle={t("tab_teller")} toValue={toValue}>
      {({ data, shown, editing, setForm }) => (
        <>
          <p className="mb-3 text-xs text-muted-foreground">{t("tellerGlHint")}</p>
          {!(data.gl_parents ?? []).length && (
            <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              {t("noAssetGroups")} <MenuLink slug="chartofaccounts" label={t("openChartOfAccounts")} />
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {["till_cash_gl_id", "vault_cash_gl_id"].map((key) => (
              <label key={key} className={labelClass}>
                {t(`gl_${key}`)}
                <Field
                  field={{ type: "select", blank: t("notSet"), options: (data.gl_parents ?? []).map((g) => ({ value: String(g.id), label: [g.gl_code, g.name].filter(Boolean).join(" · ") })) }}
                  disabled={!editing}
                  value={Number(shown?.[key]) ? String(shown[key]) : ""}
                  onChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
                />
              </label>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{t("countsMustMatch")}</p>
        </>
      )}
    </SectionScreen>
  );
}
