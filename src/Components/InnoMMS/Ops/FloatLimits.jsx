import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyNote } from "@/Components/Common/EmptyNote";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { money } from "@/Components/InnoCBS/Accounts/accountShared";
import { Section, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field, RowsEditor, Tabs } from "@/Components/InnoCBS/Loans/loanShared";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { floatLimitApi } from "@/Services/Merchant/ops.api";
import { PagedTable, usePagedCall } from "./opsShared";

const ROLES = ["AGENT", "SUPER_AGENT"];
const STATES = ["OVER_MAX", "NEAR_MAX", "BELOW_MIN", "ATTENTION", "OK", "NO_LIMIT"];
const STATE_TONE = { OVER_MAX: "REJECTED", NEAR_MAX: "PENDING", BELOW_MIN: "PENDING", ATTENTION: "PENDING", OK: "ACTIVE", NO_LIMIT: "INACTIVE" };
const num = (v) => (v === "" || v == null ? null : Number(v));

function problemOf(t, form) {
  const pct = Number(form.alert_pct);
  if (!(pct >= 1 && pct <= 100)) return t("alertPctRange");
  for (const r of [...form.tiers, ...form.agents]) {
    if (!r.currency_code) return t("fillRequired");
    if (r.max_balance !== "" && r.min_balance !== "" && r.max_balance != null && r.min_balance != null && Number(r.min_balance) > Number(r.max_balance)) return t("minAboveMax");
  }
  if (form.tiers.some((r) => !r.role)) return t("fillRequired");
  if (form.agents.some((r) => !r.entity_type || !r.entity_id)) return t("fillRequired");
  const seen = new Set(form.tiers.map((r) => `${r.role}-${r.currency_code}`));
  if (seen.size !== form.tiers.length) return t("tierOnce");
  return "";
}

// InnoMMS > Agent Float Limits (240): ceilings and floors on agents' float
// wallets, per tier and per agent (an agent's own entry wins), plus the
// near-limit report.
export function FloatLimits() {
  const { t } = useTranslation("ops");
  return (
    <SectionScreen
      api={floatLimitApi}
      ns="ops"
      valueKey="setup"
      fallbackTitle={t("floatTitle")}
      subtitle={t("floatSubtitle")}
      toForm={(s) => ({ alert_pct: s?.alert_pct ?? 90, tiers: (s?.tiers ?? []).map((r) => ({ ...r })), agents: (s?.agents ?? []).map((r) => ({ ...r })) })}
      bodyOf={(f) => ({
        alert_pct: Number(f.alert_pct),
        tiers: f.tiers.map((r) => ({ role: r.role, currency_code: r.currency_code, max_balance: num(r.max_balance), min_balance: num(r.min_balance) })),
        agents: f.agents.map((r) => ({ entity_type: r.entity_type, entity_id: Number(r.entity_id), currency_code: r.currency_code, max_balance: num(r.max_balance), min_balance: num(r.min_balance) })),
      })}
      problemOf={(_, form) => problemOf(t, form)}
      before={() => <NearLimitReport />}
    >
      {({ shown, editing, setForm }) => <FloatDoc doc={shown ?? {}} editing={editing} setForm={setForm} />}
    </SectionScreen>
  );
}

function FloatDoc({ doc, editing, setForm }) {
  const { t } = useTranslation("ops");
  const tiers = doc.tiers ?? [];
  const agents = doc.agents ?? [];
  const patch = (p) => setForm((f) => ({ ...f, ...p }));
  const money2 = [
    { key: "currency_code", label: t("currency"), placeholder: "USD" },
    { key: "max_balance", label: t("maxBalance"), type: "amount" },
    { key: "min_balance", label: t("minBalance"), type: "amount" },
  ];
  if (editing)
    return (
      <div className="grid gap-4">
        <label className={`${labelClass} max-w-xs`}>
          {t("alertPct")}
          <Field field={{ type: "percent" }} value={doc.alert_pct} onChange={(v) => patch({ alert_pct: v })} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("alertPctHint")}</span>
        </label>
        <p className="text-sm font-bold">{t("tiers")}</p>
        <RowsEditor rows={tiers} onChange={(rows) => patch({ tiers: rows })} blank={() => ({ role: "AGENT", currency_code: "", max_balance: "", min_balance: "" })} addLabel={t("addTier")} fields={[{ key: "role", label: t("role"), type: "select", options: ROLES.map((r) => ({ value: r, label: t(`role_${r}`) })) }, ...money2]} />
        <p className="text-sm font-bold">{t("agentOverrides")}</p>
        <RowsEditor
          rows={agents}
          onChange={(rows) => patch({ agents: rows })}
          blank={() => ({ entity_type: "", entity_id: "", currency_code: "", max_balance: "", min_balance: "" })}
          addLabel={t("addAgent")}
          columns="lg:grid-cols-5"
          fields={[{ key: "entity_type", label: t("entityType"), placeholder: "CORP" }, { key: "entity_id", label: t("entityId"), type: "int" }, ...money2]}
        />
      </div>
    );
  return (
    <div className="grid gap-4">
      <p className="text-sm">{t("alertPctShown", { pct: doc.alert_pct ?? 90 })}</p>
      <p className="text-sm font-bold">{t("tiers")}</p>
      {tiers.length ? (
        <SimpleTable columns={[t("role"), t("currency"), t("maxBalance"), t("minBalance")]}>
          <tbody>
            {tiers.map((r) => (
              <tr key={`${r.role}-${r.currency_code}`} className="border-t border-border">
                <td className="px-3 py-2 font-semibold">{t(`role_${r.role}`, { defaultValue: r.role })}</td>
                <td className="px-3 py-2">{r.currency_code}</td>
                <td className="px-3 py-2 tabular-nums">{money(r.max_balance)}</td>
                <td className="px-3 py-2 tabular-nums">{money(r.min_balance)}</td>
              </tr>
            ))}
          </tbody>
        </SimpleTable>
      ) : (
        <EmptyNote>{t("noTiers")}</EmptyNote>
      )}
      <p className="text-sm font-bold">{t("agentOverrides")}</p>
      {agents.length ? (
        <SimpleTable columns={[t("agent"), t("currency"), t("maxBalance"), t("minBalance")]}>
          <tbody>
            {agents.map((r) => (
              <tr key={`${r.entity_type}-${r.entity_id}-${r.currency_code}`} className="border-t border-border">
                <td className="px-3 py-2 font-mono">
                  {r.entity_type} {r.entity_id}
                </td>
                <td className="px-3 py-2">{r.currency_code}</td>
                <td className="px-3 py-2 tabular-nums">{money(r.max_balance)}</td>
                <td className="px-3 py-2 tabular-nums">{money(r.min_balance)}</td>
              </tr>
            ))}
          </tbody>
        </SimpleTable>
      ) : (
        <EmptyNote>{t("noAgentOverrides")}</EmptyNote>
      )}
    </div>
  );
}

// float_limit/list: agents by state, with a count per state.
function NearLimitReport() {
  const { t } = useTranslation("ops");
  const [state, setState] = useState("ALL");
  const [search, setSearch] = useState("");
  const paged = usePagedCall({ call: floatLimitApi.list, body: { ...(state !== "ALL" ? { state } : {}), ...(search.trim() ? { search: search.trim() } : {}) } });
  const summary = paged.summary ?? {};
  const total = Object.values(summary).reduce((a, b) => a + (Number(b) || 0), 0);
  return (
    <Section title={t("nearLimitReport")}>
      <Tabs tabs={[{ key: "ALL", count: total }, ...STATES.map((s) => ({ key: s, count: summary[s] ?? 0 }))]} value={state} onChange={setState} labelOf={(k) => t(`floatState_${k}`)} />
      <PagedTable
        paged={paged}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={t("searchAgent")}
        rowKey={(r, i) => `${r.wallet ?? r.wallet_id ?? i}-${i}`}
        empty={t("noFloatRows")}
        columns={[
          { label: t("agent"), render: (r) => (typeof r.agent === "object" ? r.agent?.name ?? `${r.agent?.entity_type} ${r.agent?.entity_id}` : r.agent ?? r.agent_name ?? "—") },
          { label: t("wallet"), render: (r) => <span className="font-mono">{typeof r.wallet === "object" ? r.wallet?.acct_num ?? r.wallet?.id : r.wallet ?? "—"}</span> },
          { label: t("balance"), render: (r) => <span className="tabular-nums">{money(r.balance, r.currency_code)}</span> },
          { label: t("maxBalance"), render: (r) => <span className="tabular-nums">{money(r.max_balance)}</span> },
          { label: t("minBalance"), render: (r) => <span className="tabular-nums">{money(r.min_balance)}</span> },
          { label: t("usedPct"), render: (r) => (r.used_pct == null ? "—" : `${r.used_pct}%`) },
          { label: t("state"), render: (r) => <StatusBadge status={STATE_TONE[r.state] ?? r.state} label={t(`floatState_${r.state}`, { defaultValue: r.state })} /> },
        ]}
      />
    </Section>
  );
}
