import { useCallback, useEffect, useState } from "react";
import { PagedList } from "@/Components/Common/Pager";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Pencil, Plus, Send, XCircle } from "lucide-react";
import { AmountInput } from "@/Components/Common/AmountInput";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListPanel } from "@/Components/Common/ListPanel";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { Toggle } from "@/Components/Common/Toggle";
import { ActionButtons, NarrationDialog, Problems, Section, inputClass, labelClass } from "@/Components/Finance/Deposits/depositShared";
import { useInstitutionScope } from "@/Components/Finance/Loans/loanShared";
import { useListSearch } from "@/Hooks/useListSearch";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { useHasUserAction } from "@/Hooks/UserManagement/userHooks";
import { txnLimitApi } from "@/Services/UserManagement/txnLimit.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { listPage } from "@/Hooks/useServerList";
import { formatDateTime } from "@/Utils/Lib/dateFormat";
import { notifications } from "@/Utils/Lib/notifications";
import { formatNumber } from "@/Utils/Lib/numberFormat";
import { cn } from "@/Utils/Lib/utils";

// The API takes plain decimals with at most 4 places; blank is no limit.
const DECIMALS = 4;

// A limit as shown: "50,000 AED", or "No limit" when blank.
function useAmount(code) {
  const { t } = useTranslation("users");
  return (value) => (value === "" || value == null ? t("noLimit") : `${formatNumber(value, { min: 0, max: DECIMALS })} ${code}`);
}

// "Make 50,000 AED · Authorise 20,000 AED", or one shared amount.
function LimitsText({ limits, code, set = true }) {
  const { t } = useTranslation("users");
  const amount = useAmount(code);
  if (!set || !limits) return <span className="text-muted-foreground">{t("noLimit")}</span>;
  if (limits.is_shared) return <span>{t("sharedLimitX", { value: amount(limits.txn_limit) })}</span>;
  return <span>{t("splitLimitsX", { make: amount(limits.initiate_limit), auth: amount(limits.auth_limit) })}</span>;
}

// User Management > Users > Transaction limits: every user, their limits
// in force per currency and any change waiting for a checker.
export function TxnLimits() {
  const { t } = useTranslation(["users", "common"]);
  const { scope } = useInstitutionScope();
  const [pending, setPending] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const { term, bind } = useListSearch(() => setPage(1));
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      setData(listPage(await txnLimitApi.list(scope({ page, limit, ...(term ? { search: term } : {}), ...(pending ? { pending: true } : {}) }))));
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [scope, page, limit, term, pending]);
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(txnLimitApi.listPath, () => void load({ silent: true }));

  const columns = [
    {
      key: "username",
      label: t("user"),
      align: "left",
      render: (u) => (
        <button type="button" onClick={() => setOpenId(u.user_id)} className="text-left">
          <p className="text-xs font-bold text-primary hover:underline">{u.username}</p>
          {u.full_name && <p className="text-[10px] text-muted-foreground">{u.full_name}</p>}
        </button>
      ),
    },
    { key: "profile_name", label: t("profile"), render: (u) => <span className="text-xs">{u.profile_name || "—"}</span> },
    { key: "inst_profile_name", label: t("institution"), render: (u) => <span className="text-xs">{u.inst_profile_name}</span> },
    {
      key: "limits",
      label: t("limitsInForce"),
      sortable: false,
      render: (u) => {
        const set = (u.currencies ?? []).filter((c) => c.is_set);
        if (!set.length) return <span className="text-xs text-muted-foreground">{t("noLimit")}</span>;
        return (
          <ul className="grid gap-0.5 text-xs tabular-nums">
            {set.map((c) => (
              <li key={c.currency_id}>
                <LimitsText limits={c.limits} code={c.currency_code} />
              </li>
            ))}
          </ul>
        );
      },
    },
    {
      key: "pending",
      label: t("changeWaiting"),
      sortable: false,
      render: (u) => {
        const waiting = (u.currencies ?? []).filter((c) => c.pending);
        if (!waiting.length) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <span className="flex flex-wrap gap-1">
            {waiting.map((c) => (
              <span key={c.currency_id} className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                {c.currency_code}
              </span>
            ))}
          </span>
        );
      },
    },
    { key: "actions", label: t("common:actions"), sortable: false, render: (u) => <RowActions buttons={{ view: true }} onView={() => setOpenId(u.user_id)} /> },
  ];

  return (
    <>
      <ListPanel
        tabs={[]}
        {...bind}
        searchPlaceholder={t("searchLimitUsers")}
        filters={<Toggle showLabel label={t("onlyWaiting")} checked={pending} onChange={(v) => (setPending(v), setPage(1))} />}
      >
        <DataTable
          bare
          columns={columns}
          rows={data.items}
          rowKey={(u) => u.user_id}
          isLoading={loading}
          title={t("txnLimits")}
          emptyTitle={t("noLimitUsers")}
          serverSorted
          serverPagination={{
            page,
            totalPages: Math.max(1, Math.ceil(data.total / limit)),
            totalRecords: data.total,
            onPageChange: setPage,
            limit,
            onLimitChange: (n) => {
              setLimit(Math.min(n, 100));
              setPage(1);
            },
          }}
        />
      </ListPanel>
      {openId && <LimitDetail userId={openId} onClose={() => setOpenId(null)} onChanged={() => void load({ silent: true })} />}
    </>
  );
}

// One user's limits: a card per currency (in force, the change waiting,
// propose / decide), a currency to add, and the history.
function LimitDetail({ userId, onClose, onChanged }) {
  const { t } = useTranslation(["users", "common"]);
  const canEdit = useHasUserAction("Edit");
  const [record, setRecord] = useState(null);
  const [audit, setAudit] = useState([]);
  // { entry } to change one currency, {} to add a currency.
  const [editing, setEditing] = useState(null);

  const reload = useCallback(async () => {
    try {
      const [got, history] = await Promise.all([txnLimitApi.get({ user_id: userId }), txnLimitApi.audit({ user_id: userId }).catch(() => null)]);
      setRecord(rowsOf(got)[0] ?? null);
      setAudit(history ? rowsOf(history) : []);
    } catch (error) {
      notifications.error(error.message);
    }
  }, [userId]);
  useEffect(() => {
    void reload();
  }, [reload]);
  useLiveChannel(txnLimitApi.listPath, (_action, records) => (!records.length || records.some((r) => String(r.user_id) === String(userId))) && void reload());

  const changed = () => {
    onChanged();
    void reload();
  };
  const currencies = record?.currencies ?? [];
  const unused = (record?.currency_options ?? []).filter((o) => !currencies.some((c) => c.currency_id === o.currency_id));

  return (
    <Modal open onClose={onClose} size="lg" title={record ? t("limitsOfX", { name: record.username }) : t("txnLimits")}>
      {!record ? (
        <div className="flex justify-center p-6">
          <Spinner size={18} />
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-xs text-muted-foreground">{[record.full_name, record.profile_name, record.inst_profile_name].filter(Boolean).join(" · ")}</p>
            {record.actions?.edit && canEdit && unused.length > 0 && (
              <Button size="sm" variant="outline" icon={Plus} onClick={() => setEditing({})}>
                {t("addCurrency")}
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{t(currencies.some((c) => c.is_set) ? "otherCurrenciesHint" : "noCurrencyLimitsHint")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {currencies.map((entry) => (
              <CurrencyCard key={entry.currency_id} userId={userId} entry={entry} onEdit={() => setEditing({ entry })} onChanged={changed} />
            ))}
          </div>
          <Section title={t("history")}>
            <PagedList items={audit}>
              {(page) => (
                <ol className="relative grid gap-3 border-l border-border pl-4">
                  {page.map((entry) => (
                    <li key={entry.id} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-[var(--primary-light)]" />
                      <p className="text-xs font-bold">
                        {t(`limitAudit_${entry.action}`, { defaultValue: entry.action })} · {entry.currency_code}
                      </p>
                      <p className="text-xs tabular-nums">
                        <LimitsText limits={entry.limits} code={entry.currency_code} />
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {entry.actor_userid_name || entry.actor} · {formatDateTime(entry.created_time)}
                      </p>
                      {entry.narration?.trim() && <p className="mt-0.5 text-xs italic">“{entry.narration}”</p>}
                    </li>
                  ))}
                  {!audit.length && <li className="text-sm text-muted-foreground">{t("noLimitHistory")}</li>}
                </ol>
              )}
            </PagedList>
          </Section>
        </div>
      )}
      {editing && record && (
        <LimitForm
          record={record}
          entry={editing.entry}
          options={unused}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            changed();
          }}
        />
      )}
    </Modal>
  );
}

// One currency: the limits in force, the change waiting, and its own
// Change / Approve / Reject buttons.
function CurrencyCard({ userId, entry, onEdit, onChanged }) {
  const { t } = useTranslation(["users", "common"]);
  const canEdit = useHasUserAction("Edit");
  const canAuthorize = useHasUserAction("Authorize");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const code = entry.currency_code;

  const decide = async (verb, narration) => {
    setBusy(true);
    try {
      const response = await txnLimitApi[verb]({ user_id: userId, currency_id: entry.currency_id, ...(narration ? { narration } : {}) });
      notifications.success(response?.message ?? t("done"));
      setDialog(null);
      onChanged();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const a = entry.actions ?? {};
  const buttons = [
    a.edit && canEdit && { key: "edit", label: t("change"), icon: Pencil, run: onEdit },
    a.deauth && canAuthorize && { key: "deauth", label: t("reject"), icon: XCircle, variant: "danger", run: () => setDialog("deauth") },
    a.auth && canAuthorize && { key: "auth", label: t("approve"), icon: CheckCircle2, variant: "primary", run: () => setDialog("auth") },
  ];

  return (
    <Section title={code} className={cn(entry.pending && "border-amber-300 ring-1 ring-amber-200")}>
      <div className="grid gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase text-muted-foreground">{t("limitsInForce")}</p>
          <p className="text-sm font-semibold tabular-nums">
            <LimitsText limits={entry.limits} code={code} set={entry.is_set} />
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{entry.is_set ? (entry.updated_by ? `${entry.updated_by} · ${formatDateTime(entry.updated_time)}` : "") : t("neverSetHint")}</p>
        </div>
        {entry.pending && (
          <div>
            <p className="text-[11px] font-bold uppercase text-amber-800">{t("changeWaiting")}</p>
            <p className="text-sm font-semibold tabular-nums">
              <LimitsText limits={entry.pending} code={code} />
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t("proposedByX", { name: entry.pending.proposed_userid_name || entry.pending.proposed_by, date: formatDateTime(entry.pending.proposed_time) })}
              {entry.pending.proposed_narration ? ` · “${entry.pending.proposed_narration}”` : ""}
            </p>
          </div>
        )}
        <ActionButtons buttons={buttons} busy={busy} />
      </div>
      {dialog && (
        <NarrationDialog
          title={t(dialog === "auth" ? "approveLimitTitle" : "rejectLimitTitle", { currency: code })}
          hint={t(dialog === "auth" ? "approveLimitHint" : "rejectLimitHint")}
          confirmLabel={t(dialog === "auth" ? "approve" : "reject")}
          variant={dialog === "auth" ? "primary" : "danger"}
          required={dialog === "deauth"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => decide(dialog, narration)}
        />
      )}
    </Section>
  );
}

// Propose limits in one currency: one shared amount, or separate make /
// authorise amounts. Blank means no limit in that currency. With no
// `entry`, the currency is picked from the ones not used yet.
function LimitForm({ record, entry, options, onClose, onSaved }) {
  const { t } = useTranslation(["users", "common"]);
  const start = entry?.limits ?? {};
  const [form, setForm] = useState({
    currency_id: entry ? String(entry.currency_id) : String(options[0]?.currency_id ?? ""),
    is_shared: start.is_shared ?? true,
    txn_limit: start.txn_limit ?? "",
    initiate_limit: start.initiate_limit ?? "",
    auth_limit: start.auth_limit ?? "",
    narration: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const amounts = form.is_shared ? [form.txn_limit] : [form.initiate_limit, form.auth_limit];
  const invalid = amounts.some((v) => v !== "" && !(Number(v) > 0));
  const code = entry?.currency_code ?? options.find((o) => String(o.currency_id) === form.currency_id)?.currency_code ?? "";

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await txnLimitApi.edit({
        user_id: record.user_id,
        currency_id: Number(form.currency_id),
        is_shared: form.is_shared,
        ...(form.is_shared ? { txn_limit: form.txn_limit } : { initiate_limit: form.initiate_limit, auth_limit: form.auth_limit }),
        ...(form.narration.trim() ? { narration: form.narration.trim() } : {}),
      });
      notifications.success(response?.message ?? t("done"));
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const amountField = (key, label) => (
    <label className={labelClass}>
      {label}
      <AmountInput className={cn(inputClass, "mt-1.5")} decimals={DECIMALS} placeholder={t("noLimit")} value={form[key]} onChange={set(key)} />
    </label>
  );
  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={t("changeLimitsOfX", { name: record.username, currency: code })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button icon={Send} loading={busy} disabled={invalid || !form.currency_id} onClick={save}>
            {t("proposeChange")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        {!entry && (
          <label className={labelClass}>
            {t("currency")}
            <FilterSelect className="mt-1.5" value={form.currency_id} onChange={set("currency_id")} options={options.map((o) => ({ value: String(o.currency_id), label: o.currency_code }))} />
          </label>
        )}
        <Toggle showLabel label={t("sameLimit")} checked={form.is_shared} onChange={set("is_shared")} />
        {form.is_shared ? amountField("txn_limit", t("txnLimit")) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {amountField("initiate_limit", t("initiateLimit"))}
            {amountField("auth_limit", t("authLimit"))}
          </div>
        )}
        <p className={cn("text-[11px]", invalid ? "font-semibold text-amber-700" : "text-muted-foreground")}>{t(invalid ? "limitMustBePositive" : "limitBlankHint", { currency: code })}</p>
        <label className={labelClass}>
          {t("narration")}
          <input className={cn(inputClass, "mt-1.5")} value={form.narration} onChange={(e) => set("narration")(e.target.value)} />
        </label>
        <p className="text-[11px] text-muted-foreground">{t("limitCheckerHint")}</p>
        <Problems message={error} />
      </div>
    </Modal>
  );
}
