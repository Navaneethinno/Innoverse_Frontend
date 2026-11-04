import { useTranslation } from "react-i18next";
import { Toggle } from "@/Components/Common/Toggle";
import { cbsTreasuryApi } from "@/Services/Accounting/accounting.api";
import { labelClass } from "../Deposits/depositShared";
import { RowsEditor } from "../Loans/loanShared";
import { GlMultiPick, glLabel, useAllGls } from "../coreBankingShared";
import { SectionScreen } from "./SectionScreen";

const toValue = (s) => ({
  inter_branch_suspense: Boolean(s.inter_branch_suspense),
  counterparties: (s.counterparties ?? []).map((c) => ({
    code: c.code,
    name: String(c.name ?? "").trim(),
    kind: c.kind,
    gl_account_id: Number(c.gl_account_id) || 0,
    obligation_gl_ids: (c.obligation_gl_ids ?? []).map(Number),
    minimum_balance: String(c.minimum_balance || "0"),
  })),
});

// InnoCBS > Settings > Treasury Settings (menu 210): inter-branch suspense and
// the counterparties (central bank, settlement banks, correspondents).
export function TreasurySettings() {
  const { t } = useTranslation("corebank");
  const gls = useAllGls(true);
  return (
    <SectionScreen api={cbsTreasuryApi} fallbackTitle={t("tab_treasury")} toValue={toValue}>
      {({ data, shown, editing, setForm }) => {
        const set = (patch) => setForm((f) => ({ ...f, ...patch }));
        return (
          <>
            <Toggle showLabel label={t("interBranchSuspense")} disabled={!editing} checked={Boolean(shown?.inter_branch_suspense)} onChange={(inter_branch_suspense) => set({ inter_branch_suspense })} />
            <p className="mb-4 mt-1 text-xs text-muted-foreground">{t("interBranchSuspenseHint")}</p>
            <p className="mb-1 text-sm font-bold">{t("counterparties")}</p>
            <p className="mb-3 text-xs text-muted-foreground">{t("counterpartiesHint")}</p>
            <RowsEditor
              rows={(shown?.counterparties ?? []).map((c) => ({ ...c, gl_account_id: Number(c.gl_account_id) ? String(c.gl_account_id) : "", minimum_balance: String(c.minimum_balance ?? "") }))}
              disabled={!editing}
              onChange={(counterparties) => set({ counterparties })}
              blank={() => ({ code: "", name: "", kind: "CENTRAL_BANK", gl_account_id: "", obligation_gl_ids: [], minimum_balance: "0" })}
              addLabel={t("addCounterparty")}
              columns="lg:grid-cols-5"
              fields={[
                { key: "code", label: t("code"), type: "code" },
                { key: "name", label: t("name") },
                { key: "kind", label: t("cpKind"), type: "select", options: (data.options?.counterparty_kinds ?? ["CENTRAL_BANK", "SETTLEMENT_BANK", "CORRESPONDENT"]).map((k) => ({ value: k, label: data.names?.counterparty_kinds?.[k] ?? t(`cpKind_${k}`) })) },
                { key: "gl_account_id", label: t("nostroGl"), type: "select", blank: t("choose"), options: (gls ?? []).filter((g) => g.is_account && g.gl_type === "ASSET").map((g) => ({ value: String(g.id), label: glLabel(g) })) },
                { key: "minimum_balance", label: t("minimumBalance"), type: "amount" },
              ]}
              renderExtra={(row, patch) => (
                <div className={`${labelClass} mt-2 block`}>
                  {t("obligationGls")}
                  <GlMultiPick gls={(gls ?? []).filter((g) => g.is_account)} disabled={!editing} value={row.obligation_gl_ids ?? []} onChange={(ids) => patch({ obligation_gl_ids: ids })} />
                </div>
              )}
            />
          </>
        );
      }}
    </SectionScreen>
  );
}
