import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Pencil, Send, XCircle } from "lucide-react";
import { AmountInput } from "@/Components/Common/AmountInput";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { ListPanel } from "@/Components/Common/ListPanel";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { Toggle } from "@/Components/Common/Toggle";
import { InstitutionField } from "@/Components/GlobalSettings/Notifications/notificationShared";
import { ActionButtons, NarrationDialog, Problems, Section, inputClass, labelClass } from "@/Components/Finance/Deposits/depositShared";
import { useInstitutionScope } from "@/Components/Finance/Loans/loanShared";
import { useListSearch } from "@/Hooks/useListSearch";
import { useHasUserAction } from "@/Hooks/UserManagement/userHooks";
import { txnLimitApi } from "@/Services/UserManagement/txnLimit.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { formatDateTime } from "@/Utils/Lib/dateFormat";
import { notifications } from "@/Utils/Lib/notifications";
import { formatNumber } from "@/Utils/Lib/numberFormat";
import { cn } from "@/Utils/Lib/utils";

// The API takes plain decimals with at most 4 places; blank is no limit.
const DECIMALS = 4;

// A limit as shown: formatted, or "No limit" when blank.
function useAmount() {
  const { t } = useTranslation("users");
  return (value) => (value === "" || value == null ? t("noLimit") : formatNumber(value, { min: 0, max: DECIMALS }));
}

// "Make 50,000 · Authorise 20,000", or one shared amount.
function LimitsText({ limits, set = true }) {
  const { t } = useTranslation("users");
  const amount = useAmount();
  if (!set || !limits) return <span className="text-muted-foreground">{t("noLimit")}</span>;
  if (limits.is_shared) return <span>{t("sharedLimitX", { value: amount(limits.txn_limit) })}</span>;
  return <span>{t("splitLimitsX", { make: amount(limits.initiate_limit), auth: amount(limits.auth_limit) })}</span>;
}

// User Management > Users > Transaction limits: every user, their limits
// in force and any change waiting for a checker.
export function TxnLimits() {
  const { t } = useTranslation(["users", "common"]);
  const { chooser, institution, setInstitution, scope } = useInstitutionScope();
  const [pending, setPending] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const { term, bind } = useListSearch(() => setPage(1));
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const row = rowsOf(await txnLimitApi.list(scope({ page, page_size: limit, ...(term ? { search: term } : {}), ...(pending ? { pending: true } : {}) })))[0];
      setData({ items: row?.items ?? [], total: row?.total ?? 0 });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [scope, page, limit, term, pending]);
  useEffect(() => {
    void load();
  }, [load]);

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
    { key: "limits", label: t("limitsInForce"), sortable: false, render: (u) => <span className="text-xs tabular-nums"><LimitsText limits={u.limits} set={u.is_set} /></span> },
    {
      key: "pending",
      label: t("changeWaiting"),
      sortable: false,
      render: (u) => (u.pending ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800"><LimitsText limits={u.pending} /></span> : <span className="text-xs text-muted-foreground">—</span>),
    },
    { key: "updated_time", label: t("lastChange"), render: (u) => <span className="whitespace-nowrap text-xs">{u.updated_by ? `${u.updated_by} · ${formatDateTime(u.updated_time)}` : "—"}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (u) => <RowActions buttons={{ view: true }} onView={() => setOpenId(u.user_id)} /> },
  ];

  return (
    <>
      {chooser && (
        <div className="mb-4 max-w-sm">
          <InstitutionField value={institution} onChange={(v) => (setInstitution(v), setPage(1))} />
        </div>
      )}
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
      {openId && <LimitDetail userId={openId} onClose={() => setOpenId(null)} onChanged={() => void load()} />}
    </>
  );
}

// One user's limits: in force, the change waiting, propose / decide, and
// the history.
function LimitDetail({ userId, onClose, onChanged }) {
  const { t } = useTranslation(["users", "common"]);
  const canEdit = useHasUserAction("Edit");
  const canAuthorize = useHasUserAction("Authorize");
  const [record, setRecord] = useState(null);
  const [audit, setAudit] = useState([]);
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

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

  const decide = async (verb, narration) => {
    setBusy(true);
    try {
      const response = await txnLimitApi[verb]({ user_id: userId, ...(narration ? { narration } : {}) });
      notifications.success(response?.message ?? t("done"));
      setDialog(null);
      onChanged();
      await reload();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const a = record?.actions ?? {};
  const buttons = [
    a.edit && canEdit && { key: "edit", label: t("changeLimits"), icon: Pencil, run: () => setEditing(true) },
    a.deauth && canAuthorize && { key: "deauth", label: t("reject"), icon: XCircle, variant: "danger", run: () => setDialog("deauth") },
    a.auth && canAuthorize && { key: "auth", label: t("approve"), icon: CheckCircle2, variant: "primary", run: () => setDialog("auth") },
  ];

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
            <ActionButtons buttons={buttons} busy={busy} />
          </div>
          <div className={cn("grid gap-3", record.pending && "sm:grid-cols-2")}>
            <Section title={t("limitsInForce")}>
              <p className="text-sm font-semibold tabular-nums">
                <LimitsText limits={record.limits} set={record.is_set} />
              </p>
              {!record.is_set && <p className="mt-1 text-[11px] text-muted-foreground">{t("neverSetHint")}</p>}
            </Section>
            {record.pending && (
              <Section title={t("changeWaiting")} className="border-amber-300 ring-1 ring-amber-200">
                <p className="text-sm font-semibold tabular-nums">
                  <LimitsText limits={record.pending} />
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t("proposedByX", { name: record.pending.proposed_userid_name || record.pending.proposed_by, date: formatDateTime(record.pending.proposed_time) })}
                  {record.pending.proposed_narration ? ` · “${record.pending.proposed_narration}”` : ""}
                </p>
              </Section>
            )}
          </div>
          <Section title={t("history")}>
            <ol className="relative grid gap-3 border-l border-border pl-4">
              {audit.map((entry) => (
                <li key={entry.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-[var(--primary-light)]" />
                  <p className="text-xs font-bold">{t(`limitAudit_${entry.action}`, { defaultValue: entry.action })}</p>
                  <p className="text-xs tabular-nums"><LimitsText limits={entry.limits} /></p>
                  <p className="text-[11px] text-muted-foreground">{entry.actor_userid_name || entry.actor} · {formatDateTime(entry.created_time)}</p>
                  {entry.narration?.trim() && <p className="mt-0.5 text-xs italic">“{entry.narration}”</p>}
                </li>
              ))}
              {!audit.length && <li className="text-sm text-muted-foreground">{t("noLimitHistory")}</li>}
            </ol>
          </Section>
        </div>
      )}
      {editing && record && (
        <LimitForm
          record={record}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
            void reload();
          }}
        />
      )}
      {dialog && (
        <NarrationDialog
          title={t(dialog === "auth" ? "approveLimitTitle" : "rejectLimitTitle")}
          hint={t(dialog === "auth" ? "approveLimitHint" : "rejectLimitHint")}
          confirmLabel={t(dialog === "auth" ? "approve" : "reject")}
          variant={dialog === "auth" ? "primary" : "danger"}
          required={dialog === "deauth"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => decide(dialog, narration)}
        />
      )}
    </Modal>
  );
}

// Propose new limits: one shared amount, or separate make / authorise
// amounts. Blank means no limit.
function LimitForm({ record, onClose, onSaved }) {
  const { t } = useTranslation(["users", "common"]);
  const start = record.limits ?? {};
  const [form, setForm] = useState({
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

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await txnLimitApi.edit({
        user_id: record.user_id,
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
      title={t("changeLimitsOfX", { name: record.username })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button icon={Send} loading={busy} disabled={invalid} onClick={save}>
            {t("proposeChange")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Toggle showLabel label={t("sameLimit")} checked={form.is_shared} onChange={set("is_shared")} />
        {form.is_shared ? amountField("txn_limit", t("txnLimit")) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {amountField("initiate_limit", t("initiateLimit"))}
            {amountField("auth_limit", t("authLimit"))}
          </div>
        )}
        <p className={cn("text-[11px]", invalid ? "font-semibold text-amber-700" : "text-muted-foreground")}>{t(invalid ? "limitMustBePositive" : "limitBlankHint")}</p>
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
