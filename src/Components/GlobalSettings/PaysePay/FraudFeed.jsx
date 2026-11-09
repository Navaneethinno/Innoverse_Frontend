import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Facts, inputClass, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field } from "@/Components/InnoCBS/Loans/loanShared";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { masterApi } from "@/Services/Master/master.api";
import { fraudFeedApi } from "@/Services/Merchant/ops.api";

const txnKey = (x) => x.key ?? x.txn_type ?? x.transaction_key ?? x.code;

function problemOf(t, f) {
  const url = String(f.url ?? "").trim();
  if (f.enabled && !url) return t("ff_urlRequired");
  if (url && !url.startsWith("https://")) return t("ff_urlHttps");
  return "";
}

// GLOBAL SETTINGS > Security > Fraud Feed (menu 251): posted transactions sent,
// signed, to the institution's own fraud engine. One document under
// maker-checker; `choices` carries the queue counts and the signing key state.
export function FraudFeed() {
  const { t } = useTranslation("ops");
  const [types, setTypes] = useState([]);
  useEffect(() => {
    masterApi
      .transactionList()
      .then((rows) => setTypes(rows.map((x) => ({ value: txnKey(x), label: x.name ?? txnKey(x) }))))
      .catch(() => setTypes([]));
  }, []);
  const typeName = (key) => types.find((x) => x.value === key)?.label ?? key;
  return (
    <SectionScreen
      api={fraudFeedApi}
      ns="ops"
      valueKey="setup"
      fallbackTitle={t("ff_title")}
      subtitle={t("ff_subtitle")}
      toForm={(s) => ({ enabled: Boolean(s?.enabled), url: s?.url ?? "", txn_types: s?.txn_types ?? [], min_amount: String(s?.min_amount ?? "0") })}
      bodyOf={(f) => ({ enabled: Boolean(f.enabled), url: f.url.trim(), txn_types: f.txn_types, min_amount: String(f.min_amount || "0") })}
      problemOf={problemOf}
    >
      {({ data, shown, editing, setForm }) => {
        const c = data?.choices ?? {};
        const warn = c.signing_key_installed === false && (
          <p className="mb-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {t("ff_noKey")}
          </p>
        );
        if (editing)
          return (
            <div className="grid gap-3">
              {warn}
              <div className="max-w-sm">
                <Field field={{ type: "bool", label: t("ff_enabled") }} value={shown.enabled} onChange={(v) => setForm({ ...shown, enabled: v })} />
              </div>
              <label className={labelClass}>
                {t("ff_url")}
                <input type="url" maxLength={500} className={inputClass} placeholder="https://frm.bank.example/events" value={shown.url} onChange={(e) => setForm({ ...shown, url: e.target.value })} />
              </label>
              <label className={`${labelClass} max-w-xs`}>
                {t("ff_minAmount")}
                <Field field={{ type: "amount" }} value={shown.min_amount} onChange={(v) => setForm({ ...shown, min_amount: v })} />
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("ff_minAmountHint")}</span>
              </label>
              <div className={labelClass}>
                {t("ff_txnTypes")}
                <Field field={{ type: "multi", options: types }} value={shown.txn_types} onChange={(v) => setForm({ ...shown, txn_types: v })} />
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("ff_txnTypesHint")}</span>
              </div>
            </div>
          );
        return (
          <>
            {warn}
            <Facts
              className="mb-3 lg:grid-cols-3"
              rows={[
                [t("ff_queued"), c.pending ?? 0],
                [t("ff_failed"), c.failed ?? 0],
                [t("ff_sent"), c.sent ?? 0],
              ]}
            />
            <Facts
              className="lg:grid-cols-2"
              rows={[
                [t("ff_enabled"), shown?.enabled ? t("ff_on") : t("ff_off")],
                [t("ff_minAmount"), shown?.min_amount ?? "0"],
                [t("ff_url"), shown?.url || "—"],
                [t("ff_txnTypes"), (shown?.txn_types ?? []).length ? shown.txn_types.map(typeName).join(", ") : t("ff_allTypes")],
              ]}
            />
          </>
        );
      }}
    </SectionScreen>
  );
}
