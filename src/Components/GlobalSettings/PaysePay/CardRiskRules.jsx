import { useTranslation } from "react-i18next";
import { EmptyNote } from "@/Components/Common/EmptyNote";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { Section } from "@/Components/InnoCBS/Deposits/depositShared";
import { RowsEditor } from "@/Components/InnoCBS/Loans/loanShared";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { cardRiskApi } from "@/Services/PaysePay/paysePay.api";
import { DocFields, asForm, rangeProblem, typed } from "./docShared";

const BLOCK_TYPES = ["MERCHANT_ID", "MCC", "TERMINAL", "MERCHANT_ACCT"];
const LEVELS = ["LOW", "MEDIUM", "HIGH", "PROHIBITED"];

const mainFields = (t) => [
  { key: "home_country", label: t("cr_homeCountry"), type: "code", placeholder: "US", hint: t("cr_homeCountryHint") },
  { key: "preauth_hold_days", label: t("cr_preauthDays"), type: "int", min: 0, max: 31, hint: t("cr_preauthDaysHint") },
  { key: "completion_tolerance_pct", label: t("cr_tolerance"), type: "percent", hint: t("cr_toleranceHint"), emptyText: t("cr_toleranceNone") },
];

function problemOf(t, form) {
  const range = rangeProblem(t, mainFields(t), form);
  if (range) return range;
  const pct = form.completion_tolerance_pct;
  if (pct !== "" && pct != null && !(Number(pct) >= 0 && Number(pct) <= 50)) return t("outOfRange", { field: t("cr_tolerance"), min: 0, max: 50 });
  if (form.merchant_blocks.some((b) => !b.type || !String(b.value ?? "").trim())) return t("cr_blockRequired");
  if (form.mcc_risk.some((m) => !/^\d{4}$/.test(String(m.mcc ?? "")) || !m.level)) return t("cr_mccRequired");
  if (new Set(form.mcc_risk.map((m) => m.mcc)).size !== form.mcc_risk.length) return t("cr_mccOnce");
  return "";
}

// CARDS > Settings > Card Risk Rules (menu 233): the home country, blocked
// merchants, MCC risk levels and pre-authorisation holds. One document under
// maker-checker. A blocked merchant or PROHIBITED MCC is declined.
export function CardRiskRules() {
  const { t } = useTranslation("paysePay");
  const fields = mainFields(t);
  return (
    <SectionScreen
      api={cardRiskApi}
      ns="paysePay"
      valueKey="setup"
      framed={false}
      fallbackTitle={t("cr_title")}
      subtitle={t("cr_subtitle")}
      toForm={(setup) => ({
        ...asForm(fields, setup ?? {}),
        merchant_blocks: (setup?.merchant_blocks ?? []).map((b) => ({ ...b })),
        mcc_risk: (setup?.mcc_risk ?? []).map((m) => ({ ...m })),
      })}
      bodyOf={(form) => ({
        ...typed(fields, form),
        home_country: String(form.home_country ?? "").trim(),
        merchant_blocks: form.merchant_blocks.map((b) => ({ type: b.type, value: String(b.value).trim(), reason: String(b.reason ?? "").trim() })),
        mcc_risk: form.mcc_risk.map((m) => ({ mcc: String(m.mcc), level: m.level })),
      })}
      problemOf={(_, form) => problemOf(t, form)}
    >
      {({ data, shown, editing, setForm }) => <Rules data={data} shown={shown ?? {}} editing={editing} setForm={setForm} />}
    </SectionScreen>
  );
}

function Rules({ data, shown, editing, setForm }) {
  const { t } = useTranslation("paysePay");
  const types = (Array.isArray(data?.block_types) && data.block_types.length ? data.block_types : BLOCK_TYPES).map((v) => ({ value: v, label: t(`cr_block_${v}`, { defaultValue: v }) }));
  const levels = (Array.isArray(data?.levels) && data.levels.length ? data.levels : LEVELS).map((v) => ({ value: v, label: t(`cr_level_${v}`, { defaultValue: v }) }));
  const label = (opts, v) => opts.find((o) => o.value === v)?.label ?? v;
  const blocks = shown.merchant_blocks ?? [];
  const mcc = shown.mcc_risk ?? [];
  return (
    <>
      <Section title={t("cr_general")}>
        <DocFields fields={mainFields(t)} value={shown} editing={editing} onChange={setForm} />
      </Section>
      <Section title={t("cr_blocks")}>
        {editing ? (
          <RowsEditor
            rows={blocks}
            onChange={(merchant_blocks) => setForm((f) => ({ ...f, merchant_blocks }))}
            blank={() => ({ type: types[0]?.value ?? "", value: "", reason: "" })}
            addLabel={t("cr_addBlock")}
            columns="lg:grid-cols-3"
            fields={[
              { key: "type", label: t("cr_blockType"), type: "select", options: types },
              { key: "value", label: t("cr_blockValue"), placeholder: "M123" },
              { key: "reason", label: t("cr_blockReason"), placeholder: "fraud" },
            ]}
          />
        ) : blocks.length ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <SimpleTable columns={[t("cr_blockType"), t("cr_blockValue"), t("cr_blockReason")]}>
              <tbody>
                {blocks.map((b, i) => (
                  <tr key={`${b.type}-${b.value}-${i}`} className="border-t border-border">
                    <td className="px-3 py-2 text-xs font-semibold">{label(types, b.type)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{b.value}</td>
                    <td className="px-3 py-2 text-xs">{b.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </SimpleTable>
          </div>
        ) : (
          <EmptyNote>{t("cr_noBlocks")}</EmptyNote>
        )}
      </Section>
      <Section title={t("cr_mccRisk")}>
        {editing ? (
          <RowsEditor
            rows={mcc}
            onChange={(mcc_risk) => setForm((f) => ({ ...f, mcc_risk }))}
            blank={() => ({ mcc: "", level: "HIGH" })}
            addLabel={t("cr_addMcc")}
            columns="lg:grid-cols-2"
            fields={[
              { key: "mcc", label: t("cr_mcc"), type: "code", placeholder: "7995" },
              { key: "level", label: t("cr_level"), type: "select", options: levels },
            ]}
          />
        ) : mcc.length ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <SimpleTable columns={[t("cr_mcc"), t("cr_level")]}>
              <tbody>
                {mcc.map((m) => (
                  <tr key={m.mcc} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{m.mcc}</td>
                    <td className="px-3 py-2 text-xs font-semibold">{label(levels, m.level)}</td>
                  </tr>
                ))}
              </tbody>
            </SimpleTable>
          </div>
        ) : (
          <EmptyNote>{t("cr_noMcc")}</EmptyNote>
        )}
      </Section>
    </>
  );
}
