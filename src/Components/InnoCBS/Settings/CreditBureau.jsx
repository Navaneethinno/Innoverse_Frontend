import { useTranslation } from "react-i18next";
import { Toggle } from "@/Components/Common/Toggle";
import { cbsCreditBureauApi } from "@/Services/Accounting/accounting.api";
import { labelClass } from "../Deposits/depositShared";
import { Field } from "../Loans/loanShared";
import { SectionScreen } from "./SectionScreen";

const toValue = (s) => ({ ...s, enabled: Boolean(s.enabled), minimum_score: Number(s.minimum_score) || 0, valid_days: Number(s.valid_days) || 0, required_for_approval: Boolean(s.required_for_approval) });
const problemOf = (t, s) => (s.enabled && s.provider === "HTTP" && (!/^https:\/\//.test(s.url ?? "") || !s.api_key_env) ? t("bureauHttpNeeds") : "");

// InnoCBS > Settings > Credit Bureau (menu 209): provider and connection.
export function CreditBureau() {
  const { t } = useTranslation("corebank");
  return (
    <SectionScreen api={cbsCreditBureauApi} fallbackTitle={t("tab_credit_bureau")} toValue={toValue} problemOf={problemOf}>
      {({ data, shown, editing, setForm }) => {
        const set = (patch) => setForm((f) => ({ ...f, ...patch }));
        const providers = (data.options?.bureau_providers ?? ["SIMULATOR", "HTTP"]).map((value) => ({ value, label: data.names?.bureau_providers?.[value] ?? value }));
        return (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Toggle showLabel label={t("bureauEnabled")} disabled={!editing} checked={Boolean(shown?.enabled)} onChange={(enabled) => set({ enabled })} />
              <Toggle showLabel label={t("requiredForApproval")} disabled={!editing} checked={Boolean(shown?.required_for_approval)} onChange={(required_for_approval) => set({ required_for_approval })} />
              <label className={labelClass}>
                {t("provider")}
                <Field field={{ type: "select", options: providers }} disabled={!editing} value={shown?.provider} onChange={(provider) => set({ provider })} />
              </label>
              <label className={labelClass}>
                {t("memberCode")}
                <Field field={{}} disabled={!editing} value={shown?.member_code} onChange={(member_code) => set({ member_code })} />
              </label>
              <label className={labelClass}>
                {t("minimumScore")}
                <Field field={{ type: "int" }} disabled={!editing} value={String(shown?.minimum_score ?? "")} onChange={(minimum_score) => set({ minimum_score })} />
              </label>
              <label className={labelClass}>
                {t("validDays")}
                <Field field={{ type: "int" }} disabled={!editing} value={String(shown?.valid_days ?? "")} onChange={(valid_days) => set({ valid_days })} />
              </label>
            </div>
            {shown?.provider === "HTTP" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  {t("bureauUrl")}
                  <Field field={{ placeholder: "https://" }} disabled={!editing} value={shown?.url} onChange={(v) => set({ url: v.trim() })} />
                </label>
                <label className={labelClass}>
                  {t("apiKeyEnv")}
                  <Field field={{ placeholder: "BUREAU_API_KEY" }} disabled={!editing} value={shown?.api_key_env} onChange={(v) => set({ api_key_env: v.toUpperCase().replace(/[^A-Z0-9_]/g, "") })} />
                  <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("apiKeyEnvHint")}</span>
                </label>
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-900">{t("simulatorHint")}</p>
            )}
          </>
        );
      }}
    </SectionScreen>
  );
}
