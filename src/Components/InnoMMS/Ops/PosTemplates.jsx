import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyNote } from "@/Components/Common/EmptyNote";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { money } from "@/Components/InnoCBS/Accounts/accountShared";
import { RowsEditor } from "@/Components/InnoCBS/Loans/loanShared";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { floatLimitApi, posTemplateApi } from "@/Services/Merchant/ops.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";

// Amounts stay strings so they never pass through floating point.
const text = (v) => (v === "" || v == null ? null : String(v));
const num = (v) => (v === "" || v == null ? null : Number(v));
const toBody = (f) => ({
  templates: f.templates.map((x) => ({
    code: String(x.code ?? "").trim(),
    name: String(x.name ?? "").trim(),
    description: String(x.description ?? "").trim(),
    currency_code: x.currency_code,
    daily_debit_limit: text(x.daily_debit_limit),
    daily_credit_limit: text(x.daily_credit_limit),
    manager_assignable: Boolean(x.manager_assignable),
    active: Boolean(x.active),
    transactions: (x.transactions ?? []).map((r) => ({ txn_type: r.txn_type, max_amount: text(r.max_amount), daily_count: num(r.daily_count), daily_amount: text(r.daily_amount) })),
  })),
});

function problemOf(t, f) {
  if (f.templates.some((x) => !String(x.code ?? "").trim() || !String(x.name ?? "").trim() || !x.currency_code)) return t("fillRequired");
  if (new Set(f.templates.map((x) => x.code.trim())).size !== f.templates.length) return t("codeOnce");
  if (f.templates.some((x) => !(x.transactions ?? []).length)) return t("templateNeedsTxn");
  if (f.templates.some((x) => (x.transactions ?? []).some((r) => !r.txn_type))) return t("fillRequired");
  return "";
}

// InnoMMS > POS Profile Templates (263): profiles merchants start a POS
// user profile from (pos_profile/from_template in the merchant portal).
export function PosTemplates() {
  const { t } = useTranslation("ops");
  const [types, setTypes] = useState([]);
  useEffect(() => {
    posTemplateApi
      .txn_types()
      .then((r) => setTypes(rowsOf(r).flat().map((x) => (typeof x === "string" ? { value: x, label: x } : { value: x.txn_type ?? x.code, label: x.name ?? x.txn_type ?? x.code }))))
      .catch(() => setTypes([]));
  }, []);
  const [currencies, setCurrencies] = useState([]);
  useEffect(() => {
    floatLimitApi
      .get({})
      .then((r) => setCurrencies(rowsOf(r)[0]?.choices?.currencies ?? []))
      .catch(() => setCurrencies([]));
  }, []);
  const typeLabel = (v) => types.find((x) => x.value === v)?.label ?? v;
  return (
    <SectionScreen
      api={posTemplateApi}
      ns="ops"
      valueKey="setup"
      fallbackTitle={t("templatesTitle")}
      subtitle={t("templatesSubtitle")}
      toForm={(s) => ({ templates: structuredClone(s?.templates ?? []) })}
      bodyOf={toBody}
      problemOf={(_, f) => problemOf(t, f)}
    >
      {({ shown, editing, setForm }) => {
        const templates = shown?.templates ?? [];
        if (editing)
          return (
            <RowsEditor
              rows={templates}
              onChange={(rows) => setForm({ templates: rows })}
              blank={() => ({ code: "", name: "", description: "", currency_code: "", daily_debit_limit: "", daily_credit_limit: "", manager_assignable: true, active: true, transactions: [] })}
              addLabel={t("addTemplate")}
              fields={[
                { key: "code", label: t("code"), placeholder: "CASHIER" },
                { key: "name", label: t("name"), placeholder: "Cashier" },
                { key: "currency_code", label: t("currency"), ...(currencies.length ? { type: "select", blank: t("choose"), options: currencies.map((c) => ({ value: c, label: c })) } : { placeholder: "USD" }) },
                { key: "description", label: t("description") },
                { key: "daily_debit_limit", label: t("dailyDebitLimit"), type: "amount" },
                { key: "daily_credit_limit", label: t("dailyCreditLimit"), type: "amount" },
                { key: "manager_assignable", label: t("managerAssignable"), type: "bool" },
                { key: "active", label: t("active"), type: "bool" },
              ]}
              renderExtra={(row, set) => (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-bold">{t("templateTxns")}</p>
                  <RowsEditor
                    rows={row.transactions ?? []}
                    onChange={(transactions) => set({ transactions })}
                    blank={() => ({ txn_type: "", max_amount: "", daily_count: "", daily_amount: "" })}
                    addLabel={t("addTxnType")}
                    fields={[
                      { key: "txn_type", label: t("txnType"), type: types.length ? "select" : "text", options: types },
                      { key: "max_amount", label: t("maxAmount"), type: "amount" },
                      { key: "daily_count", label: t("dailyCount"), type: "int" },
                      { key: "daily_amount", label: t("dailyAmount"), type: "amount" },
                    ]}
                  />
                </div>
              )}
            />
          );
        if (!templates.length) return <EmptyNote>{t("noTemplates")}</EmptyNote>;
        return (
          <div className="grid gap-3">
            {templates.map((x) => (
              <div key={x.code} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <b>{x.name}</b>
                  <span className="font-mono text-xs text-muted-foreground">{x.code}</span>
                  <StatusBadge status={x.active ? "ACTIVE" : "INACTIVE"} />
                  {x.manager_assignable && <span className="text-[11px] text-muted-foreground">{t("managerAssignable")}</span>}
                </div>
                {x.description && <p className="mt-1 text-xs text-muted-foreground">{x.description}</p>}
                <p className="mt-1 text-xs">
                  {t("dailyDebitLimit")}: {money(x.daily_debit_limit, x.currency_code)} · {t("dailyCreditLimit")}: {money(x.daily_credit_limit, x.currency_code)}
                </p>
                {(x.transactions ?? []).length > 0 && (
                  <SimpleTable className="mt-2" columns={[t("txnType"), t("maxAmount"), t("dailyCount"), t("dailyAmount")]}>
                    <tbody>
                      {x.transactions.map((r) => (
                        <tr key={r.txn_type} className="border-t border-border">
                          <td className="px-3 py-1.5">{typeLabel(r.txn_type)}</td>
                          <td className="px-3 py-1.5 tabular-nums">{money(r.max_amount)}</td>
                          <td className="px-3 py-1.5 tabular-nums">{r.daily_count ?? "—"}</td>
                          <td className="px-3 py-1.5 tabular-nums">{money(r.daily_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </SimpleTable>
                )}
              </div>
            ))}
          </div>
        );
      }}
    </SectionScreen>
  );
}
