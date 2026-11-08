import { useTranslation } from "react-i18next";
import { EmptyNote } from "@/Components/Common/EmptyNote";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { DocFields, asForm, typed } from "@/Components/GlobalSettings/PaysePay/docShared";
import { Section } from "@/Components/InnoCBS/Deposits/depositShared";
import { RowsEditor } from "@/Components/InnoCBS/Loans/loanShared";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { rewardsProgramApi } from "@/Services/Campaigns/campaigns.api";
import { byId, useRewardOptions } from "./rewardsShared";

const pointFields = (t, options) => [
  { key: "points_enabled", label: t("points_enabled"), type: "bool" },
  { key: "currency_id", label: t("currency_id"), type: "select", blank: t("choose"), options: byId(options?.currencies).map((o) => ({ ...o, value: String(o.value) })) },
  { key: "earn_txn_type_ids", label: t("earn_txn_type_ids"), type: "multi", options: byId(options?.txn_types), hint: t("emptyMeansAll") },
  { key: "points_per_unit", label: t("points_per_unit"), type: "amount", hint: t("pointsPerUnitHint") },
  { key: "unit_amount", label: t("unit_amount"), type: "amount" },
  { key: "point_value", label: t("point_value"), type: "amount", hint: t("pointValueHint") },
  { key: "min_redeem_points", label: t("min_redeem_points"), type: "amount" },
  { key: "expiry_days", label: t("expiry_days"), type: "int" },
];
const referralFields = (t, options) => [
  { key: "enabled", label: t("referralEnabled"), type: "bool" },
  { key: "referrer_reward", label: t("referrer_reward"), type: "amount" },
  { key: "referee_reward", label: t("referee_reward"), type: "amount" },
  { key: "txn_type_ids", label: t("txn_type_ids"), type: "multi", options: byId(options?.txn_types), hint: t("emptyMeansAll") },
  { key: "min_amount", label: t("min_amount"), type: "amount" },
  { key: "window_days", label: t("window_days"), type: "int" },
  { key: "max_per_referrer", label: t("max_per_referrer"), type: "int" },
];

const numbersOf = (fields, form) => {
  const out = typed(fields, form);
  for (const f of fields) if (f.type === "int") out[f.key] = out[f.key] ?? 0;
  return out;
};

// EPURSE > Loyalty & Referral (menu 227): one program per institution:
// earning and redeeming points, tiers (by points earned in the last 365
// days) and referral rewards. Maker-checker.
export function LoyaltyReferral() {
  const { t } = useTranslation(["campaigns", "common"]);
  const options = useRewardOptions();
  const points = pointFields(t, options);
  const referral = referralFields(t, options);
  const toForm = (s) => ({
    ...asForm(points, s ?? {}),
    currency_id: s?.currency_id ? String(s.currency_id) : "",
    earn_txn_type_ids: s?.earn_txn_type_ids ?? [],
    tiers: (s?.tiers ?? []).map((x) => ({ ...x, min_points: x.min_points != null ? String(x.min_points) : "", multiplier: x.multiplier != null ? String(x.multiplier) : "" })),
    referral: asForm(referral, { txn_type_ids: [], ...(s?.referral ?? {}) }),
  });
  const problemOf = (_, f) => {
    if (!f.currency_id) return t("common:blockedFillRequired");
    if (f.tiers.some((x) => !String(x.code ?? "").trim() || !String(x.name ?? "").trim() || x.min_points === "" || x.multiplier === "")) return t("common:blockedFillRequired");
    if (new Set(f.tiers.map((x) => x.code.trim())).size !== f.tiers.length) return t("tierCodeOnce");
    return "";
  };
  const bodyOf = (f) => ({
    setup: {
      ...numbersOf(points, f),
      currency_id: Number(f.currency_id),
      earn_txn_type_ids: (f.earn_txn_type_ids ?? []).map(Number),
      tiers: f.tiers.map((x) => ({ code: x.code.trim(), name: x.name.trim(), min_points: String(x.min_points), multiplier: String(x.multiplier) })),
      referral: { ...numbersOf(referral, f.referral ?? {}), txn_type_ids: (f.referral?.txn_type_ids ?? []).map(Number) },
    },
  });
  return (
    <SectionScreen api={rewardsProgramApi} ns="campaigns" valueKey="setup" framed={false} fallbackTitle={t("loyaltyTitle")} subtitle={t("loyaltySubtitle")} toForm={toForm} bodyOf={bodyOf} problemOf={problemOf}>
      {({ shown, editing, setForm }) => {
        const s = shown ?? {};
        const tiers = s.tiers ?? [];
        return (
          <>
            {!shown && !editing && <EmptyNote>{t("noProgramYet")}</EmptyNote>}
            <Section title={t("pointsSection")}>
              <DocFields fields={points} value={s} editing={editing} onChange={setForm} />
            </Section>
            <Section title={t("tiersSection")}>
              <p className="mb-2 text-[11px] text-muted-foreground">{t("tiersHint")}</p>
              {editing ? (
                <RowsEditor
                  rows={tiers}
                  onChange={(rows) => setForm((f) => ({ ...f, tiers: rows }))}
                  blank={() => ({ code: "", name: "", min_points: "", multiplier: "1" })}
                  addLabel={t("addTier")}
                  columns="lg:grid-cols-4"
                  fields={[
                    { key: "code", label: t("code"), type: "code", placeholder: "GOLD" },
                    { key: "name", label: t("name"), placeholder: "Gold" },
                    { key: "min_points", label: t("min_points"), type: "amount" },
                    { key: "multiplier", label: t("multiplier"), type: "amount" },
                  ]}
                />
              ) : tiers.length ? (
                <SimpleTable columns={[t("code"), t("name"), t("min_points"), t("multiplier")]}>
                  <tbody>
                    {tiers.map((x) => (
                      <tr key={x.code} className="border-t border-border">
                        <td className="px-3 py-2 font-mono">{x.code}</td>
                        <td className="px-3 py-2 font-semibold">{x.name}</td>
                        <td className="px-3 py-2 tabular-nums">{x.min_points}</td>
                        <td className="px-3 py-2 tabular-nums">{x.multiplier}</td>
                      </tr>
                    ))}
                  </tbody>
                </SimpleTable>
              ) : (
                <EmptyNote>{t("noTiers")}</EmptyNote>
              )}
            </Section>
            <Section title={t("referralSection")}>
              <DocFields fields={referral} value={s.referral ?? {}} editing={editing} onChange={(v) => setForm((f) => ({ ...f, referral: v }))} />
            </Section>
          </>
        );
      }}
    </SectionScreen>
  );
}
