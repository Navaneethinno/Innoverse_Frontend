import { useTranslation } from "react-i18next";
import { Toggle } from "@/Components/Common/Toggle";
import { cbsWithholdingTaxApi } from "@/Services/Accounting/accounting.api";
import { labelClass } from "../Deposits/depositShared";
import { Field } from "../Loans/loanShared";
import { SectionScreen } from "./SectionScreen";

const toValue = (s) => ({ ...s, enabled: Boolean(s.enabled), deposit_rate: s.deposit_rate || "0", wallet_rate: s.wallet_rate || "0", exempt_below: s.exempt_below || "0" });

// InnoCBS > Settings > Withholding Tax (menu 207).
export function WithholdingTax() {
  const { t } = useTranslation("corebank");
  return (
    <SectionScreen api={cbsWithholdingTaxApi} fallbackTitle={t("tab_withholding_tax")} toValue={toValue}>
      {({ shown, editing, setForm }) => {
        const set = (patch) => setForm((f) => ({ ...f, ...patch }));
        return (
          <>
            <p className="mb-3 text-xs text-muted-foreground">{t("whtHint")}</p>
            <Toggle showLabel label={t("whtEnabled")} disabled={!editing} checked={Boolean(shown?.enabled)} onChange={(enabled) => set({ enabled })} />
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                ["deposit_rate", "percent"],
                ["wallet_rate", "percent"],
                ["exempt_below", "amount"],
              ].map(([key, type]) => (
                <label key={key} className={labelClass}>
                  {t(`wht_${key}`)}
                  <Field field={{ type }} disabled={!editing} value={shown?.[key]} onChange={(v) => set({ [key]: v })} />
                </label>
              ))}
            </div>
          </>
        );
      }}
    </SectionScreen>
  );
}
