import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Pencil, Plus, Radar, Send, ShieldAlert, Trash2, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DateInput } from "@/Components/Common/DateInput";
import { Modal } from "@/Components/Common/Modal";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { SearchPicker } from "@/Components/Common/SearchPicker";
import { Toggle } from "@/Components/Common/Toggle";
import { accountDate, money } from "@/Components/Finance/Accounts/accountShared";
import {
  ActionButtons,
  Facts,
  NarrationDialog,
  Problems,
  Section,
  inputClass,
  labelClass,
} from "@/Components/Finance/Deposits/depositShared";
import { Field, MiniTable, Tabs } from "@/Components/Finance/Loans/loanShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { amlMonitoringApi } from "@/Services/InnoAML/aml.api";
import { recordOf } from "@/Services/Loans/loans.api";
import { usersApi } from "@/Services/UserManagement/users.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";

const SEVERITY_TONE = {
  HIGH: "bg-red-50 text-red-700",
  MEDIUM: "bg-amber-50 text-amber-800",
  LOW: "bg-slate-100 text-slate-700",
};
export const SeverityBadge = ({ value }) => {
  const { t } = useTranslation("monitoring");
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold", SEVERITY_TONE[value] ?? SEVERITY_TONE.LOW)}>
      {t(`severity_${value}`, { defaultValue: value })}
    </span>
  );
};

// What each rule kind needs (the rest of its fields are hidden).
const NEEDS = {
  LARGE_TXN: ["amount"],
  VELOCITY_COUNT: ["count", "window_minutes"],
  VELOCITY_AMOUNT: ["amount", "window_minutes"],
  STRUCTURING: ["amount", "count", "window_minutes", "near_percent"],
  PASS_THROUGH: ["amount", "window_minutes", "near_percent"],
};

// InnoAML › Transaction Monitoring (menu 199): the alerts the institution's
// rules raise on posted transactions, and the rules themselves (one setup
// under maker-checker, with the nightly currency transaction reports).
export function TransactionMonitoring() {
  const { t } = useTranslation("monitoring");
  const [tab, setTab] = useState("alerts");
  return (
    <div className="pb-8 pt-4">
      <div className="mb-5" data-tour="page-title">
        <PageTitle icon={Radar}>{t("title")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Tabs tabs={[{ key: "alerts" }, { key: "setup" }]} value={tab} onChange={setTab} labelOf={(k) => t(`tab_${k}`)} />
      {tab === "alerts" ? <Alerts /> : <Setup />}
    </div>
  );
}

// ---------------------------------------------------------------- alerts

const EMPTY_FILTERS = { status: "OPEN", severity: "", rule_code: "", search: "", from: "", to: "" };

function Alerts() {
  const { t } = useTranslation("monitoring");
  const can = usePagePermission();
  const navigate = useNavigate();
  // Opened from a customer's report: that party's alerts, any status.
  const party = useLocation().state?.party;
  const [filters, setFilters] = useState(() => (party ? { ...EMPTY_FILTERS, status: "", entity_type: party.entity_type, entity_id: party.entity_id } : EMPTY_FILTERS));
  const [rows, setRows] = useState(null);
  const [picked, setPicked] = useState([]);
  const [open, setOpen] = useState(null);
  const [escalating, setEscalating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const body = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), [filters]);
  const load = useCallback(
    () =>
      amlMonitoringApi.alerts
        .list(body)
        .then((r) => setRows(Array.isArray(r?.data) ? r.data : []))
        .catch((e) => {
          setRows([]);
          notifications.error(e.message);
        }),
    [body],
  );
  useEffect(() => {
    setPicked([]);
    void load();
  }, [load]);
  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));
  // Escalation is for one party only: once a row is picked, only that
  // party's open alerts can join it.
  const pickedParty = picked[0] && `${picked[0].entity_type}-${picked[0].entity_id}`;
  const toggle = (row) =>
    setPicked((list) => (list.some((x) => x.id === row.id) ? list.filter((x) => x.id !== row.id) : [...list, row]));
  const scan = async () => {
    setScanning(true);
    try {
      const r = recordOf(await amlMonitoringApi.scan({}));
      notifications.success(t("scanned", { txns: r?.txns_read ?? 0, alerts: r?.alerts_raised ?? 0 }));
      await load();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setScanning(false);
    }
  };
  const escalate = async (grounds) => {
    try {
      const str = recordOf(await amlMonitoringApi.alerts.escalate({ ids: picked.map((a) => a.id), grounds }));
      notifications.success(t("escalated", { reference: str?.reference }));
      navigate("/regulatoryreports", { state: { str: str?.id } });
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setEscalating(false);
    }
  };

  return (
    <div className="grid gap-3">
      {party && (
        <p className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs font-semibold">
          {t("partyAlerts", { name: party.name })}
          <button type="button" className="text-primary hover:underline" onClick={() => setFilters(EMPTY_FILTERS)}>
            {t("allAlerts")}
          </button>
        </p>
      )}
      <div className="flex flex-wrap items-end gap-2" data-tour="monitoring-filters">
        {[
          ["status", ["OPEN", "ESCALATED", "CLOSED"], "anyStatus", "alertStatus_"],
          ["severity", ["HIGH", "MEDIUM", "LOW"], "anySeverity", "severity_"],
        ].map(([key, values, blank, prefix]) => (
          <div key={key} className="w-40">
            <Field
              field={{ type: "select", blank: t(blank), options: values.map((v) => ({ value: v, label: t(`${prefix}${v}`) })) }}
              value={filters[key]}
              onChange={set(key)}
            />
          </div>
        ))}
        <input className={cn(inputClass, "w-36")} placeholder={t("ruleCode")} value={filters.rule_code} onChange={(e) => set("rule_code")(e.target.value.toUpperCase())} />
        <input className={cn(inputClass, "w-48")} placeholder={t("searchParty")} value={filters.search} onChange={(e) => set("search")(e.target.value)} />
        <DateInput className={cn(inputClass, "w-40")} value={filters.from} onChange={(e) => set("from")(e.target.value)} />
        <DateInput className={cn(inputClass, "w-40")} value={filters.to} onChange={(e) => set("to")(e.target.value)} />
        <div className="ml-auto flex gap-2">
          {can("Edit") && picked.length > 0 && (
            <Button size="sm" variant="danger" icon={ShieldAlert} onClick={() => setEscalating(true)}>
              {t("escalateN", { count: picked.length })}
            </Button>
          )}
          {can("Edit") && (
            <Button size="sm" variant="outline" icon={Radar} loading={scanning} onClick={() => void scan()}>
              {t("runScan")}
            </Button>
          )}
        </div>
      </div>
      {!rows ? (
        <PageSkeleton />
      ) : (
        <MiniTable
          rows={rows}
          rowKey={(r) => r.id}
          empty={t("noAlerts")}
          columns={[
            can("Edit") && {
              key: "pick",
              label: "",
              render: (r) =>
                r.status === "OPEN" ? (
                  <input
                    type="checkbox"
                    aria-label={t("pick")}
                    checked={picked.some((x) => x.id === r.id)}
                    disabled={Boolean(pickedParty) && pickedParty !== `${r.entity_type}-${r.entity_id}`}
                    onChange={() => toggle(r)}
                  />
                ) : null,
            },
            { key: "severity", label: t("severity"), render: (r) => <SeverityBadge value={r.severity} /> },
            {
              key: "rule_code",
              label: t("rule"),
              render: (r) => (
                <span className="text-xs leading-tight">
                  <b className="block font-mono">{r.rule_code}</b>
                  <span className="text-muted-foreground">{t(`kind_${r.rule_kind}`, { defaultValue: r.rule_kind })}</span>
                </span>
              ),
            },
            {
              key: "party_name",
              label: t("party"),
              render: (r) => (
                <button type="button" className="text-left text-xs font-bold text-primary hover:underline" onClick={() => setOpen(r.id)}>
                  {r.party_name}
                </button>
              ),
            },
            { key: "amount", label: t("amount"), align: "right", render: (r) => <b className="tabular-nums">{money(r.amount, r.currency)}</b> },
            { key: "txn_count", label: t("txns"), align: "right" },
            { key: "reason", label: t("reason"), wrap: true, render: (r) => <span className="text-xs">{r.reason}</span> },
            {
              key: "status",
              label: t("status"),
              render: (r) => (
                <span className="text-xs leading-tight">
                  <b className="block">{t(`alertStatus_${r.status}`, { defaultValue: r.status })}</b>
                  {r.assigned_to && <span className="text-muted-foreground">{r.assigned_to}</span>}
                </span>
              ),
            },
            { key: "created_at", label: t("raised"), render: (r) => <span className="text-xs">{accountDate(r.created_at)}</span> },
          ].filter(Boolean)}
        />
      )}
      {open && <AlertDetail id={open} onClose={() => setOpen(null)} onChanged={load} />}
      {escalating && (
        <NarrationDialog
          title={t("escalateTitle", { name: picked[0]?.party_name, count: picked.length })}
          hint={t("escalateHint")}
          label={t("grounds")}
          maxLength={20000}
          confirmLabel={t("escalate")}
          variant="danger"
          required
          onClose={() => setEscalating(false)}
          onSave={escalate}
        />
      )}
    </div>
  );
}

// One alert: why, the transactions behind it, the notes, and what to do.
function AlertDetail({ id, onClose, onChanged }) {
  const { t } = useTranslation("monitoring");
  const can = usePagePermission();
  const navigate = useNavigate();
  const [alert, setAlert] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [reason, setReason] = useState("FALSE_POSITIVE");
  const [assignee, setAssignee] = useState(null);
  const load = useCallback(
    () =>
      amlMonitoringApi.alerts
        .get({ id })
        .then((r) => setAlert(recordOf(r)))
        .catch((e) => notifications.error(e.message)),
    [id],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const act = async (verb, body) => {
    try {
      const r = await amlMonitoringApi.alerts[verb]({ id, ...body });
      if (r?.message) notifications.success(r.message);
      setDialog(null);
      onChanged();
      if (verb === "escalate") {
        const str = recordOf(r);
        navigate("/regulatoryreports", { state: { str: str?.id } });
        return;
      }
      setAlert(recordOf(r) ?? alert);
    } catch (e) {
      notifications.error(e.message);
    }
  };
  const editable = alert?.status === "OPEN" && can("Edit");
  return (
    <Modal open size="xl" onClose={onClose} title={alert ? `${alert.rule_code} · ${alert.party_name}` : t("alert")}>
      {!alert ? (
        <PageSkeleton />
      ) : (
        <div className="grid gap-4">
          <p className="rounded-xl bg-muted/50 px-4 py-2.5 text-sm font-semibold">{alert.reason}</p>
          <Facts
            rows={[
              [t("severity"), <SeverityBadge key="s" value={alert.severity} />],
              [t("status"), t(`alertStatus_${alert.status}`, { defaultValue: alert.status })],
              [t("amount"), money(alert.amount, alert.currency), "font-black"],
              [t("window"), `${accountDate(alert.window_from)} – ${accountDate(alert.window_to)}`],
              [t("assignedTo"), alert.assigned_to || "—"],
              alert.closure_reason && [t("closedAs"), `${t(`closure_${alert.closure_reason}`)} · ${alert.closed_by ?? ""}`],
              alert.str_reference && [t("str"), alert.str_reference],
            ]}
          />
          {editable && (
            <ActionButtons
              buttons={[
                { key: "assign", label: t("assign"), icon: Pencil, run: () => setDialog("assign") },
                { key: "note", label: t("addNote"), icon: Plus, run: () => setDialog("note") },
                { key: "close", label: t("closeAlert"), icon: CheckCircle2, run: () => setDialog("close") },
                { key: "escalate", label: t("escalate"), icon: ShieldAlert, variant: "danger", run: () => setDialog("escalate") },
              ]}
            />
          )}
          <Section title={t("transactions")}>
            <TxnTable txns={alert.txns ?? []} />
          </Section>
          <Section title={t("notes")}>
            {(alert.notes ?? []).length ? (
              <ol className="grid gap-2">
                {alert.notes.map((n, i) => (
                  <li key={i} className="rounded-xl bg-muted/40 px-3 py-2 text-sm">
                    <span className="block text-[11px] font-semibold text-muted-foreground">
                      {n.by} · {accountDate(n.at)}
                    </span>
                    {n.text}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noNotes")}</p>
            )}
          </Section>
        </div>
      )}
      {dialog === "note" && (
        <NarrationDialog title={t("addNote")} label={t("note")} confirmLabel={t("addNote")} required onClose={() => setDialog(null)} onSave={(note) => act("note", { note })} />
      )}
      {dialog === "escalate" && (
        <NarrationDialog
          title={t("escalateTitle", { name: alert.party_name, count: 1 })}
          hint={t("escalateHint")}
          label={t("grounds")}
          maxLength={20000}
          confirmLabel={t("escalate")}
          variant="danger"
          required
          onClose={() => setDialog(null)}
          onSave={(grounds) => act("escalate", { grounds })}
        />
      )}
      {dialog === "close" && (
        <NarrationDialog
          title={t("closeAlert")}
          label={t("note")}
          confirmLabel={t("closeAlert")}
          required
          onClose={() => setDialog(null)}
          onSave={(note) => act("close", { reason, note })}
        >
          <label className={cn(labelClass, "mb-3 block")}>
            {t("closeReason")}
            <Field
              field={{ type: "select", options: ["FALSE_POSITIVE", "NO_ACTION"].map((v) => ({ value: v, label: t(`closure_${v}`) })) }}
              value={reason}
              onChange={setReason}
            />
          </label>
        </NarrationDialog>
      )}
      {dialog === "assign" && (
        <Modal
          open
          onClose={() => setDialog(null)}
          title={t("assign")}
          footer={
            <>
              <Button variant="ghost" onClick={() => act("assign", { user_id: 0 })}>
                {t("unassign")}
              </Button>
              <Button disabled={!assignee} onClick={() => act("assign", { user_id: assignee.user_id })}>
                {t("assign")}
              </Button>
            </>
          }
        >
          <SearchPicker
            value={assignee}
            onChange={setAssignee}
            rowKey={(u) => u.user_id}
            placeholder={t("searchUser")}
            empty={t("noUser")}
            search={(term) =>
              usersApi.list({ page: 1, limit: 20, search: term, status: 0 }).then((r) => (Array.isArray(r?.data) ? r.data : []))
            }
            renderItem={(u) => <span className="text-sm font-semibold">{u.username ?? u.user_name}</span>}
          />
        </Modal>
      )}
    </Modal>
  );
}

// The transactions behind an alert or a report.
export function TxnTable({ txns }) {
  const { t } = useTranslation("monitoring");
  return (
    <MiniTable
      rows={txns}
      rowKey={(x) => x.txn_id}
      empty={t("noTxns")}
      columns={[
        { key: "at", label: t("date"), render: (x) => <span className="text-xs">{accountDate(x.at)}</span> },
        { key: "txn_type", label: t("type"), render: (x) => <span className="text-xs font-semibold">{x.txn_type}</span> },
        { key: "channel", label: t("channel"), render: (x) => <span className="text-xs">{x.channel}</span> },
        {
          key: "direction",
          label: t("inOut"),
          render: (x) => <b className={cn("text-xs", x.direction === "OUT" ? "text-red-700" : "text-emerald-700")}>{t(`dir_${x.direction}`, { defaultValue: x.direction })}</b>,
        },
        { key: "amount", label: t("amount"), align: "right", render: (x) => <b className="tabular-nums">{money(x.amount, x.currency)}</b> },
        { key: "acct_num", label: t("account"), render: (x) => <span className="font-mono text-xs">{x.acct_num}</span> },
        { key: "rrn", label: "RRN", render: (x) => <span className="font-mono text-xs">{x.rrn}</span> },
      ]}
    />
  );
}

// ---------------------------------------------------------------- setup

const blankRule = (kind) => ({
  code: "",
  name: "",
  kind,
  enabled: false,
  severity: "MEDIUM",
  txn_types: [],
  channels: [],
  direction: "ANY",
  amount: "0",
  count: 0,
  window_minutes: 0,
  near_percent: "0",
});

// The setup as the server takes it: numbers as numbers, amounts as strings.
const toBody = (setup) => ({
  rules: setup.rules.map((r) => ({
    ...r,
    amount: String(r.amount || "0"),
    near_percent: String(r.near_percent || "0"),
    count: Number(r.count) || 0,
    window_minutes: Number(r.window_minutes) || 0,
    enabled: Boolean(r.enabled),
  })),
  ctr: { ...setup.ctr, enabled: Boolean(setup.ctr?.enabled), threshold: String(setup.ctr?.threshold || "0") },
});

// The rules and the currency transaction reports, one document under
// maker-checker (Self applies at once).
function Setup() {
  const { t } = useTranslation(["monitoring", "loans"]);
  const can = usePagePermission();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [showPending, setShowPending] = useState(true);
  const [selected, setSelected] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      setData(recordOf(await amlMonitoringApi.setup.get({})));
    } catch (e) {
      setData({ missing: true });
      notifications.error(e.message);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const act = async (verb, body = {}) => {
    setBusy(true);
    setError("");
    try {
      const r = await amlMonitoringApi.setup[verb](body);
      if (r?.message) notifications.success(r.message);
      setDialog(null);
      setForm(null);
      await load();
    } catch (e) {
      setDialog(null);
      if (verb === "edit") setError(e.message);
      else notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  if (!data) return <PageSkeleton />;
  if (data.missing) return null;
  const a = data.actions ?? {};
  const options = data.options ?? {};
  const pending = data.pending?.setup ?? null;
  const shown = form ?? (pending && showPending ? pending : data.setup);
  const editing = Boolean(form);
  const rules = shown?.rules ?? [];
  const rule = rules[selected];
  const setRule = (patch) => setForm((f) => ({ ...f, rules: f.rules.map((r, i) => (i === selected ? { ...r, ...patch } : r)) }));
  const setCtr = (patch) => setForm((f) => ({ ...f, ctr: { ...f.ctr, ...patch } }));
  const needs = NEEDS[rule?.kind] ?? [];
  const typeOptions = (options.txn_types ?? []).map((v) => ({ value: v, label: v }));
  const summary = (r) =>
    (NEEDS[r.kind] ?? [])
      .map((k) => (k === "window_minutes" ? t("minutesN", { count: Number(r[k]) }) : k === "near_percent" ? `${r[k]}%` : k === "count" ? `×${r[k]}` : r[k]))
      .join(" · ");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t(data.id ? "setupHint" : "setupExamplesHint")}</p>
        {!form && (
          <ActionButtons
            busy={busy}
            buttons={[
              a.edit && can("Edit") && { key: "edit", label: t("loans:edit"), icon: Pencil, run: () => (setForm(structuredClone(pending ?? data.setup)), setError("")) },
              a.deauth && can("Authorize") && { key: "deauth", label: t("loans:reject"), icon: XCircle, variant: "danger", run: () => setDialog("deauth") },
              a.auth && can("Authorize") && { key: "auth", label: t("loans:approve"), icon: CheckCircle2, variant: "primary", run: () => setDialog("auth") },
            ]}
          />
        )}
      </div>
      {pending && !form && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          <span>{t("pendingBy", { name: data.pending.proposed_by?.name ?? "—", date: accountDate(data.pending.proposed_at) })}</span>
          <Toggle showLabel label={t("showProposed")} checked={showPending} onChange={setShowPending} />
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <Section title={t("rules")}>
          <ul className="grid gap-1.5" data-tour="monitoring-rules">
            {rules.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setSelected(i)}
                  className={cn(
                    "flex w-full min-w-0 items-start gap-2 overflow-hidden rounded-xl border px-3 py-2 text-left transition-colors",
                    i === selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                  )}
                >
                  <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", r.enabled ? "bg-emerald-500" : "bg-slate-300")} aria-label={t(r.enabled ? "on" : "off")} />
                  <span className="min-w-0 flex-1 text-xs leading-tight">
                    <b className="block font-mono">{r.code || "—"}</b>
                    <span className="block truncate">{r.name}</span>
                    <span className="block truncate text-muted-foreground">
                      {t(`kind_${r.kind}`, { defaultValue: r.kind })} · {summary(r)}
                    </span>
                  </span>
                  <span className="shrink-0">
                    <SeverityBadge value={r.severity} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {editing && (
            <Button
              size="sm"
              variant="outline"
              icon={Plus}
              className="mt-2"
              onClick={() => {
                setForm((f) => ({ ...f, rules: [...f.rules, blankRule("LARGE_TXN")] }));
                setSelected(rules.length);
              }}
            >
              {t("addRule")}
            </Button>
          )}
        </Section>
        {rule ? (
          <Section
            title={rule.name || t("rule")}
            action={
              editing && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Trash2}
                  onClick={() => {
                    setForm((f) => ({ ...f, rules: f.rules.filter((_, i) => i !== selected) }));
                    setSelected(0);
                  }}
                >
                  {t("removeRule")}
                </Button>
              )
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                {t("ruleCode")}
                <Field field={{ type: "code" }} disabled={!editing} value={rule.code} onChange={(v) => setRule({ code: v })} />
              </label>
              <label className={labelClass}>
                {t("ruleName")}
                <Field field={{}} disabled={!editing} value={rule.name} onChange={(v) => setRule({ name: v })} />
              </label>
              <label className={labelClass}>
                {t("kind")}
                <Field
                  field={{ type: "select", options: (options.kinds ?? Object.keys(NEEDS)).map((k) => ({ value: k, label: t(`kind_${k}`) })) }}
                  disabled={!editing}
                  value={rule.kind}
                  onChange={(v) => setRule({ kind: v })}
                />
              </label>
              <label className={labelClass}>
                {t("severity")}
                <Field
                  field={{ type: "select", options: (options.severities ?? ["LOW", "MEDIUM", "HIGH"]).map((k) => ({ value: k, label: t(`severity_${k}`) })) }}
                  disabled={!editing}
                  value={rule.severity}
                  onChange={(v) => setRule({ severity: v })}
                />
              </label>
              {rule.kind !== "PASS_THROUGH" && (
                <label className={labelClass}>
                  {t("direction")}
                  <Field
                    field={{ type: "select", options: (options.directions ?? ["ANY", "IN", "OUT"]).map((k) => ({ value: k, label: t(`dir_${k}`) })) }}
                    disabled={!editing}
                    value={rule.direction}
                    onChange={(v) => setRule({ direction: v })}
                  />
                </label>
              )}
              <label className={cn(labelClass, "flex items-center justify-between gap-2 self-end rounded-xl border border-border px-3 py-2")}>
                {t("enabled")}
                <Field field={{ type: "bool" }} disabled={!editing} value={rule.enabled} onChange={(v) => setRule({ enabled: v })} />
              </label>
              {needs.map((key) => (
                <label key={key} className={labelClass}>
                  {t(`field_${key}`)}
                  <Field
                    field={{ type: key === "amount" ? "amount" : key === "near_percent" ? "percent" : "int" }}
                    disabled={!editing}
                    value={String(rule[key] ?? "")}
                    onChange={(v) => setRule({ [key]: v })}
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{t(`kindHint_${rule.kind}`)}</p>
            <div className="mt-3 grid gap-3">
              <label className={labelClass}>
                {t("txnTypes")} <span className="font-normal text-muted-foreground">{t("emptyMeansAll")}</span>
                <Field field={{ type: "multi", options: typeOptions }} disabled={!editing} value={rule.txn_types ?? []} onChange={(v) => setRule({ txn_types: v })} />
              </label>
              <label className={labelClass}>
                {t("channels")} <span className="font-normal text-muted-foreground">{t("emptyMeansAll")}</span>
                <Field
                  field={{ type: "multi", options: (options.channels ?? []).map((v) => ({ value: v, label: v })) }}
                  disabled={!editing}
                  value={rule.channels ?? []}
                  onChange={(v) => setRule({ channels: v })}
                />
              </label>
            </div>
          </Section>
        ) : (
          <Section title={t("rule")}>
            <p className="text-sm text-muted-foreground">{t("noRules")}</p>
          </Section>
        )}
      </div>
      <Section title={t("ctrTitle")}>
        <p className="mb-3 text-xs text-muted-foreground">{t("ctrHint")}</p>
        <div className="grid gap-3 sm:grid-cols-2" data-tour="monitoring-ctr">
          <label className={cn(labelClass, "flex items-center justify-between gap-2 self-end rounded-xl border border-border px-3 py-2")}>
            {t("ctrEnabled")}
            <Field field={{ type: "bool" }} disabled={!editing} value={shown?.ctr?.enabled} onChange={(v) => setCtr({ enabled: v })} />
          </label>
          <label className={labelClass}>
            {t("ctrThreshold")}
            <Field field={{ type: "amount" }} disabled={!editing} value={String(shown?.ctr?.threshold ?? "")} onChange={(v) => setCtr({ threshold: v })} />
          </label>
          <label className={cn(labelClass, "sm:col-span-2")}>
            {t("ctrTypes")}
            <Field field={{ type: "multi", options: typeOptions }} disabled={!editing} value={shown?.ctr?.txn_types ?? []} onChange={(v) => setCtr({ txn_types: v })} />
          </label>
        </div>
      </Section>
      {form ? (
        <>
          {error && <Problems message={error} />}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setForm(null)}>
              {t("loans:cancel")}
            </Button>
            <Button icon={Send} onClick={() => setDialog("edit")}>
              {t("loans:proposeChanges")}
            </Button>
          </div>
        </>
      ) : (
        <Section title={t("history")}>
          <MiniTable
            rows={data.history ?? []}
            empty={t("noHistory")}
            columns={[
              { key: "at", label: t("date"), render: (h) => <span className="text-xs">{accountDate(h.at)}</span> },
              { key: "action", label: t("action"), render: (h) => <span className="text-xs font-semibold">{h.action}</span> },
              { key: "actor", label: t("by"), render: (h) => <span className="text-xs">{h.actor}</span> },
              { key: "narration", label: t("note"), wrap: true, render: (h) => <span className="text-xs">{h.narration || "—"}</span> },
            ]}
          />
        </Section>
      )}
      {dialog && (
        <NarrationDialog
          title={t(`confirm_${dialog}`)}
          confirmLabel={t(dialog === "auth" ? "loans:approve" : dialog === "deauth" ? "loans:reject" : "loans:proposeChanges")}
          variant={dialog === "deauth" ? "danger" : "primary"}
          required={dialog === "deauth"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => act(dialog, { ...(dialog === "edit" ? toBody(form) : {}), ...(narration ? { narration } : {}) })}
        />
      )}
    </div>
  );
}
