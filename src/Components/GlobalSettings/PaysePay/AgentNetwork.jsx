import { useTranslation } from "react-i18next";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { Facts, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field } from "@/Components/InnoCBS/Loans/loanShared";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { agentNetworkApi } from "@/Services/Merchant/ops.api";

const TIERS = ["AGENT", "SUPER_AGENT"];

function problemOf(t, f, data) {
  const cap = data?.choices?.max_depth_cap ?? 5;
  const depth = Number(f.max_depth);
  if (!Number.isInteger(depth) || depth < 1 || depth > cap) return t("an_badDepth", { max: cap });
  if (Object.values(f.tiers).some((x) => String(x.float_overdraft_limit ?? "") === "" || String(x.parent_commission_pct ?? "") === "")) return t("fillRequired");
  return "";
}

// InnoMMS > Agent Banking > Agent Network (menu 250): how deep the agent
// hierarchy goes, each tier's float overdraft and the share of commission
// passed up. One document under maker-checker.
export function AgentNetwork() {
  const { t } = useTranslation("ops");
  return (
    <SectionScreen
      api={agentNetworkApi}
      ns="ops"
      valueKey="setup"
      fallbackTitle={t("an_title")}
      subtitle={t("an_subtitle")}
      toForm={(s) => ({ max_depth: String(s?.max_depth ?? ""), tiers: structuredClone(s?.tiers ?? {}) })}
      bodyOf={(f) => ({
        max_depth: Number(f.max_depth),
        tiers: Object.fromEntries(Object.entries(f.tiers).map(([k, v]) => [k, { float_overdraft_limit: String(v.float_overdraft_limit), parent_commission_pct: String(v.parent_commission_pct) }])),
      })}
      problemOf={problemOf}
    >
      {({ data, shown, editing, setForm }) => {
        const tiers = data?.choices?.tiers ?? TIERS;
        const of = (tier) => shown?.tiers?.[tier] ?? {};
        const setTier = (tier, patch) => setForm({ ...shown, tiers: { ...shown.tiers, [tier]: { ...of(tier), ...patch } } });
        const name = (tier) => t(`an_tier_${tier}`, { defaultValue: tier });
        if (editing)
          return (
            <div className="grid gap-4">
              <label className={`${labelClass} max-w-xs`}>
                {t("an_depth")}
                <Field field={{ type: "int" }} value={shown.max_depth} onChange={(v) => setForm({ ...shown, max_depth: v })} />
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("an_depthHint", { max: data?.choices?.max_depth_cap ?? 5 })}</span>
              </label>
              {tiers.map((tier) => (
                <div key={tier} className="rounded-xl border border-border p-3">
                  <p className="mb-2 text-sm font-bold">{name(tier)}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={labelClass}>
                      {t("an_overdraft")}
                      <Field field={{ type: "amount" }} value={of(tier).float_overdraft_limit} onChange={(v) => setTier(tier, { float_overdraft_limit: v })} />
                    </label>
                    <label className={labelClass}>
                      {t("an_commission")}
                      <Field field={{ type: "percent" }} value={of(tier).parent_commission_pct} onChange={(v) => setTier(tier, { parent_commission_pct: v })} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          );
        return (
          <div className="grid gap-3">
            <Facts rows={[[t("an_depth"), shown?.max_depth]]} />
            <div className="overflow-x-auto rounded-xl border border-border">
              <SimpleTable columns={[t("an_tier"), t("an_overdraft"), t("an_commission")]}>
                <tbody>
                  {tiers.map((tier) => (
                    <tr key={tier} className="border-t border-border">
                      <td className="px-3 py-2 font-semibold">{name(tier)}</td>
                      <td className="px-3 py-2 tabular-nums">{of(tier).float_overdraft_limit ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{of(tier).parent_commission_pct ?? "—"}%</td>
                    </tr>
                  ))}
                </tbody>
              </SimpleTable>
            </div>
          </div>
        );
      }}
    </SectionScreen>
  );
}
