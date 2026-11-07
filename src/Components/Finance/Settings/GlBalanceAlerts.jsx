import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { ArrowLeft, BellRing, CheckCircle2, Pencil, Plus, Power, RotateCcw, Save, Trash2, XCircle } from "lucide-react";
import { BackButton } from "@/Components/Common/TextButtons";
import { Button } from "@/Components/Common/Button";
import { ListTable, TabButton } from "@/Components/Common/ListView";
import { Modal } from "@/Components/Common/Modal";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RequiredMark } from "@/Components/Common/RequiredMark";
import { RowActions } from "@/Components/Common/RowActions";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { VerbDialog, VersionSections } from "@/Components/MakerChecker/SetupDocument";
import { accountDate, money } from "@/Components/InnoCBS/Accounts/accountShared";
import { ActionButtons, AuditTimeline, Facts, Section, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { ProductStatus } from "@/Components/InnoCBS/Settings/DepositProducts/productShared";
import { Field, Tabs, useInstitutionScope } from "@/Components/InnoCBS/Loans/loanShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { glThresholdAlertsPath, glThresholdPendingPath, glThresholdsApi } from "@/Services/Accounting/accounting.api";
import { notifications } from "@/Utils/Lib/notifications";

const VIEWS = ["setups", "pending", "alerts"];

// ACCOUNTING > Settings > GL Balance Alerts (menu 219): a low and/or high
// balance limit on one GL in one currency, and who is told when a posting
// crosses it. Maker-checker like Fee Schedules; Self applies at once.
export function GlBalanceAlerts() {
  const { t } = useTranslation(["accounting", "common"]);
  const can = usePagePermission();
  const { chooser, institution, scope } = useInstitutionScope();
  const location = useLocation();
  // An inbox message (GL_THRESHOLD_LOW / _HIGH) opens its alert.
  const [openId, setOpenId] = useState(location.state?.recordId ?? null);
  const [view, setView] = useState("setups");
  const [editing, setEditing] = useState(null);

  const setups = useServerList({ api: glThresholdsApi.listPath, call: glThresholdsApi.list, enabled: !openId && view === "setups" });
  const pending = useServerList({ api: glThresholdPendingPath, call: glThresholdsApi.pending, prefix: "p_", enabled: !openId && view === "pending" });
  const alerts = useServerList({ api: glThresholdAlertsPath, call: glThresholdsApi.alerts, prefix: "a_", enabled: !openId && view === "alerts" });

  if (openId) {
    return (
      <ThresholdView
        id={openId}
        onBack={() => {
          setOpenId(null);
          setups.reload();
          pending.reload();
        }}
        onEdit={(record) => setEditing({ record })}
        editing={editing}
        onCloseEdit={() => setEditing(null)}
      />
    );
  }

  const columns = [
    {
      key: "gl_account_name",
      label: t("gta_glAccount"),
      align: "left",
      render: (r) => (
        <button type="button" onClick={() => setOpenId(r.id)} className="text-left">
          <p className="text-xs font-bold text-primary hover:underline">{r.gl_account_name}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{[r.gl_account_number, r.gl_purpose].filter(Boolean).join(" · ")}</p>
        </button>
      ),
    },
    { key: "currency_code", label: t("gta_currency"), render: (r) => <span className="text-xs font-semibold">{r.currency_code}</span> },
    { key: "low_balance", label: t("gta_low"), render: (r) => <span className="text-xs tabular-nums">{r.low_balance ? money(r.low_balance, r.currency_code) : "—"}</span> },
    { key: "high_balance", label: t("gta_high"), render: (r) => <span className="text-xs tabular-nums">{r.high_balance ? money(r.high_balance, r.currency_code) : "—"}</span> },
    { key: "state", label: t("gta_state"), sortable: false, render: (r) => <FiredBadge record={r} /> },
    { key: "status", label: t("gta_status"), render: (r) => <ProductStatus product={r} /> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpenId(r.id)} /> },
  ];

  const addButton = can("Add") && (
    <Button size="sm" icon={Plus} disabled={chooser && !institution} disabledReason={t("common:blockedNeedsInstitution")} onClick={() => setEditing({ record: null })}>
      {t("gta_add")}
    </Button>
  );

  return (
    <div className="pt-1 pb-6">
      <div className="mb-4">
        <PageTitle>{t("gta_title")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("gta_subtitle")}</p>
      </div>
      <div className="mb-3 flex flex-wrap gap-1">
        {VIEWS.map((v) => (
          <TabButton key={v} active={view === v} onClick={() => setView(v)}>
            {t(`gta_view_${v}`)}
          </TabButton>
        ))}
      </div>
      {view === "setups" && <ListTable list={setups} actions={addButton} columns={columns} rowKey={(r) => r.id} title={t("gta_title")} emptyTitle={t("gta_none")} emptyDescription={t("gta_noneHint")} />}
      {view === "pending" && <ListTable list={pending} columns={columns} rowKey={(r) => r.id} title={t("gta_view_pending")} emptyTitle={t("gta_nonePending")} emptyDescription={t("gta_nonePendingHint")} />}
      {view === "alerts" && <AlertsTable list={alerts} onOpen={setOpenId} />}
      {editing && (
        <ThresholdDialog
          record={editing.record}
          scope={scope}
          onClose={() => setEditing(null)}
          onSaved={(id) => {
            setEditing(null);
            setups.reload();
            if (id) setOpenId(id);
          }}
        />
      )}
    </div>
  );
}

// "Below low" / "Above high" while the balance is past a limit.
function FiredBadge({ record }) {
  const { t } = useTranslation("accounting");
  if (!record.low_fired && !record.high_fired) return <StatusBadge status="OK" label={t("gta_withinLimits")} variant="subtle" />;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {record.low_fired && <StatusBadge status="FAILED" label={t("gta_belowLow")} />}
      {record.high_fired && <StatusBadge status="OVERDUE" label={t("gta_aboveHigh")} />}
    </span>
  );
}

function AlertsTable({ list, onOpen, title }) {
  const { t } = useTranslation(["accounting", "common"]);
  const columns = [
    { key: "created_time", label: t("gta_when"), render: (a) => <span className="whitespace-nowrap text-xs">{accountDate(a.created_time)}</span> },
    {
      key: "gl_account_name",
      label: t("gta_glAccount"),
      align: "left",
      render: (a) =>
        onOpen ? (
          <button type="button" onClick={() => onOpen(a.gl_threshold_id)} className="text-left">
            <p className="text-xs font-bold text-primary hover:underline">{a.gl_account_name}</p>
            <p className="font-mono text-[10px] text-muted-foreground">{a.gl_account_number}</p>
          </button>
        ) : (
          <span className="text-xs">
            {a.gl_account_name} <span className="font-mono text-[10px] text-muted-foreground">{a.gl_account_number}</span>
          </span>
        ),
    },
    { key: "currency_code", label: t("gta_currency"), render: (a) => <span className="text-xs">{a.currency_code}</span> },
    { key: "side", label: t("gta_limit"), render: (a) => <span className="text-xs">{t(`gta_side_${a.side}`, { defaultValue: a.side })}</span> },
    { key: "event", label: t("gta_event"), render: (a) => <StatusBadge status={a.event === "FIRED" ? "SENT" : "OK"} label={t(`gta_event_${a.event}`, { defaultValue: a.event })} variant="subtle" /> },
    { key: "threshold", label: t("gta_threshold"), render: (a) => <span className="text-xs tabular-nums">{money(a.threshold, a.currency_code)}</span> },
    { key: "balance", label: t("gta_balance"), render: (a) => <span className="text-xs font-semibold tabular-nums">{money(a.balance, a.currency_code)}</span> },
    { key: "rrn", label: t("gta_rrn"), render: (a) => <span className="font-mono text-xs">{a.rrn || (a.txn_id ? `#${a.txn_id}` : "—")}</span> },
    { key: "recipients", label: t("gta_recipients"), render: (a) => <span className="text-xs tabular-nums">{a.recipients ?? 0}</span> },
  ];
  return <ListTable list={list} columns={columns} rowKey={(a) => a.id ?? `${a.gl_threshold_id}:${a.created_time}`} title={title ?? t("gta_view_alerts")} emptyTitle={t("gta_noAlerts")} emptyDescription={t("gta_noAlertsHint")} />;
}

const nameList = (list) => (list?.length ? list.map((x) => x.name).join(", ") : "—");

// One setup (in effect, or proposed).
function SetupFacts({ setup, currency }) {
  const { t } = useTranslation("accounting");
  if (!setup) return null;
  const yes = (v) => t(v ? "gta_yes" : "gta_no");
  return (
    <Facts
      rows={[
        [t("gta_low"), setup.low_balance ? money(setup.low_balance, currency) : "—"],
        [t("gta_high"), setup.high_balance ? money(setup.high_balance, currency) : "—"],
        [t("gta_groups"), nameList(setup.groups)],
        [t("gta_users"), nameList(setup.users)],
        [t("gta_sendEmail"), yes(setup.send_email)],
        [t("gta_sendSms"), yes(setup.send_sms)],
        setup.remarks && [t("gta_remarks"), setup.remarks],
      ]}
    />
  );
}

function ThresholdView({ id, onBack, onEdit, editing, onCloseEdit }) {
  const { t } = useTranslation(["accounting", "common"]);
  const can = usePagePermission();
  const [r, setR] = useState(null);
  const [audit, setAudit] = useState([]);
  const [tab, setTab] = useState("history");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const alerts = useServerList({ api: glThresholdAlertsPath, call: glThresholdsApi.alerts, prefix: "da_", extra: { gl_threshold_id: Number(id) }, enabled: tab === "alerts" });

  const reload = useCallback(async () => {
    try {
      const [got, history] = await Promise.all([glThresholdsApi.get({ id }), glThresholdsApi.audit({ id }).catch(() => null)]);
      setR(rowsOf(got)[0] ?? null);
      setAudit(history ? rowsOf(history) : []);
    } catch (e) {
      notifications.error(e.message);
    }
  }, [id]);
  useEffect(() => {
    void reload();
  }, [reload]);

  const act = async (verb, narration) => {
    setBusy(true);
    try {
      const response = await glThresholdsApi[verb]({ id, narration: narration ?? "" });
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      await reload();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!r) return <PageSkeleton />;
  const a = r.actions ?? {};
  const ask = (verb) => () => setDialog(verb);
  const buttons = [
    a.edit && can("Edit") && { key: "edit", label: t("gta_edit"), icon: Pencil, run: () => onEdit(r) },
    a.deactivate && can("Change Status") && { key: "deactivate", label: t("gta_deactivate"), icon: Power, run: ask("deactivate") },
    a.reactivate && can("Change Status") && { key: "reactivate", label: t("gta_reactivate"), icon: RotateCcw, run: ask("reactivate") },
    a.delete && can("Delete") && { key: "delete", label: t("gta_delete"), icon: Trash2, variant: "danger", run: ask("delete") },
    a.deauth && can("Authorize") && { key: "deauth", label: t("gta_reject"), icon: XCircle, variant: "danger", run: ask("deauth") },
    a.auth && can("Authorize") && { key: "auth", label: t("gta_approve"), icon: CheckCircle2, variant: "primary", run: ask("auth") },
  ];
  const cur = r.currency_code;
  const record = { config: r.setup, pending: r.pending ? { ...r.pending, config: r.pending.setup } : null };
  const tg = (key, o) => t(`gta_${key}`, o);

  return (
    <div className="pt-1 pb-6">
      <BackButton onClick={onBack}>
        <ArrowLeft size={15} /> {t("gta_back")}
      </BackButton>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="flex items-center gap-2 text-xl font-black">
                <BellRing size={18} className="text-primary" /> {r.gl_account_name}
              </h1>
              <ProductStatus product={r} />
              <FiredBadge record={r} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{[r.gl_account_number, r.gl_purpose, cur, r.normal_balance && t("gta_normalSide", { side: r.normal_balance }), r.inst_profile_name].filter(Boolean).join(" · ")}</p>
          </div>
          <ActionButtons buttons={buttons} busy={busy} />
        </div>
        <Facts
          className="mt-3"
          rows={[
            [t("gta_currentBalance"), money(r.current_balance, cur)],
            [t("gta_lastBalance"), r.last_balance != null ? money(r.last_balance, cur) : "—"],
            [t("gta_lastChecked"), r.last_checked_time ? accountDate(r.last_checked_time) : "—"],
            [t("gta_updated"), accountDate(r.updated_time ?? r.created_time)],
          ]}
        />
      </div>

      {r.rejected && (
        <Section title={t("gta_rejectedSetup")} className="mb-4 border-red-200">
          <p className="mb-2 text-xs text-muted-foreground">{t("gta_rejectedHint")}</p>
          <SetupFacts setup={r.rejected} currency={cur} />
        </Section>
      )}
      {(record.config || record.pending) && <VersionSections side record={record} render={(setup) => <SetupFacts setup={setup} currency={cur} />} />}

      <Tabs tabs={[{ key: "history" }, { key: "alerts" }]} value={tab} onChange={setTab} labelOf={(k) => t(`gta_tab_${k}`)} />
      {tab === "history" && (
        <Section title={t("gta_tab_history")}>
          <AuditTimeline audit={audit} />
        </Section>
      )}
      {tab === "alerts" && <AlertsTable list={alerts} title={t("gta_tab_alerts")} />}

      <VerbDialog dialog={dialog} t={tg} busy={busy} onClose={() => setDialog(null)} onSave={(narration) => act(dialog, narration)} />
      {editing && (
        <ThresholdDialog
          record={editing.record}
          scope={(b) => b}
          onClose={onCloseEdit}
          onSaved={() => {
            onCloseEdit();
            void reload();
          }}
        />
      )}
    </div>
  );
}

// The problem texts of a gl_threshold.invalid refusal, by their stable keys.
function problemLines(t, e) {
  const keys = e?.problemKeys ?? e?.data?.problem_keys ?? [];
  const texts = e?.data?.problems ?? [];
  if (!keys.length) return [e?.message].filter(Boolean);
  return keys.map((k, i) => {
    const key = typeof k === "string" ? k : k?.key;
    const short = String(key ?? "").replace(/^gl_threshold\./, "");
    const field = typeof k === "object" ? k?.field : null;
    const fallback = typeof texts[i] === "string" ? texts[i] : (texts[i]?.message ?? key);
    return t(`gta_problem_${short}`, { defaultValue: fallback, field: field ? t(`gta_field_${field}`, { defaultValue: field }) : "" });
  });
}

// Add or edit: the form of the handoff. On edit the GL and currency stay.
function ThresholdDialog({ record, scope, onClose, onSaved }) {
  const { t } = useTranslation(["accounting", "common"]);
  const [options, setOptions] = useState(null);
  const base = record?.pending?.setup ?? record?.rejected ?? record?.setup ?? {};
  const [form, setForm] = useState(() => ({
    gl_account_id: record ? String(record.gl_account_id) : "",
    currency_id: record ? String(record.currency_id) : "",
    low_balance: base.low_balance ?? record?.low_balance ?? "",
    high_balance: base.high_balance ?? record?.high_balance ?? "",
    group_ids: base.group_ids ?? (base.groups ?? []).map((g) => g.id),
    user_ids: base.user_ids ?? (base.users ?? []).map((u) => u.id),
    send_email: Boolean(base.send_email),
    send_sms: Boolean(base.send_sms),
    remarks: base.remarks ?? "",
  }));
  const [narration, setNarration] = useState("");
  const [problems, setProblems] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    glThresholdsApi
      .options(record ? (record.inst_profile_id ? { inst_profile_id: record.inst_profile_id } : {}) : scope({}))
      .then((r) => setOptions(rowsOf(r)[0] ?? {}))
      .catch((e) => {
        notifications.error(e.message);
        setOptions({});
      });
  }, [record, scope]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const gl = (options?.gl_accounts ?? []).find((g) => String(g.id) === form.gl_account_id);
  const taken = (gl?.threshold_currency_ids ?? []).map(String);
  const currencyChoices = (gl?.currency_ids ?? [])
    .map(String)
    .filter((c) => !taken.includes(c))
    .map((c) => {
      const cur = (options?.currencies ?? []).find((x) => String(x.id) === c);
      return { value: c, label: cur ? [cur.code ?? cur.alpha_code, cur.name].filter(Boolean).join(" · ") : `#${c}` };
    });
  const glLabel = (g) => [g.name, g.number ?? g.gl_account_number ?? g.account_number, g.purpose ?? g.gl_purpose].filter(Boolean).join(" · ");
  const hasLimit = String(form.low_balance).trim() || String(form.high_balance).trim();
  const hasRecipient = form.group_ids.length || form.user_ids.length;
  const blocked = !form.gl_account_id || !form.currency_id ? t("common:blockedFillRequired") : !hasLimit ? t("gta_blockedNoLimit") : !hasRecipient ? t("gta_blockedNoRecipient") : null;

  const save = async () => {
    setBusy(true);
    setProblems([]);
    try {
      const fields = {
        low_balance: String(form.low_balance ?? "").trim(),
        high_balance: String(form.high_balance ?? "").trim(),
        group_ids: form.group_ids.map(Number),
        user_ids: form.user_ids.map(Number),
        send_email: form.send_email,
        send_sms: form.send_sms,
        remarks: form.remarks,
        narration: narration.trim(),
      };
      const response = record ? await glThresholdsApi.edit({ id: record.id, ...fields }) : await glThresholdsApi.add(scope({ gl_account_id: Number(form.gl_account_id), currency_id: Number(form.currency_id), ...fields }));
      notifications.success(response?.message ?? t("gta_saved"));
      onSaved(rowsOf(response)[0]?.id ?? record?.id);
    } catch (e) {
      setProblems(problemLines(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={record ? t("gta_editX", { name: record.gl_account_name }) : t("gta_add")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button icon={Save} loading={busy} disabled={Boolean(blocked) || !options} disabledReason={blocked ?? t("gta_loading")} onClick={save}>
            {t("gta_submit")}
          </Button>
        </>
      }
    >
      {!options ? (
        <PageSkeleton />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            {t("gta_glAccount")}
            <RequiredMark />
            <Field field={{ type: "select", blank: t("gta_choose"), options: (options.gl_accounts ?? []).map((g) => ({ value: String(g.id), label: glLabel(g) })) }} disabled={Boolean(record)} value={form.gl_account_id} onChange={(v) => setForm((f) => ({ ...f, gl_account_id: v, currency_id: "" }))} />
          </label>
          <label className={labelClass}>
            {t("gta_currency")}
            <RequiredMark />
            {record ? (
              <Field field={{ type: "select", options: [{ value: form.currency_id, label: record.currency_code }] }} disabled value={form.currency_id} onChange={() => {}} />
            ) : (
              <Field field={{ type: "select", blank: gl && !currencyChoices.length ? t("gta_noFreeCurrency") : t("gta_choose"), options: currencyChoices }} disabled={!gl} value={form.currency_id} onChange={set("currency_id")} />
            )}
          </label>
          {record && <p className="text-xs text-muted-foreground sm:col-span-2">{t("gta_currentBalanceX", { balance: money(record.current_balance, record.currency_code) })}</p>}
          <label className={labelClass}>
            {t("gta_low")}
            <Field field={{ type: "amount", placeholder: "10000" }} value={form.low_balance} onChange={set("low_balance")} />
          </label>
          <label className={labelClass}>
            {t("gta_high")}
            <Field field={{ type: "amount", placeholder: "500000" }} value={form.high_balance} onChange={set("high_balance")} />
          </label>
          <p className="-mt-1 text-[11px] text-muted-foreground sm:col-span-2">{t("gta_limitHint")}</p>
          <div className={`${labelClass} sm:col-span-2`}>
            {t("gta_groups")}
            <Field field={{ type: "multi", options: (options.groups ?? []).map((g) => ({ value: g.id, label: g.name })) }} value={form.group_ids} onChange={set("group_ids")} />
          </div>
          <div className={`${labelClass} sm:col-span-2`}>
            {t("gta_users")}
            <Field field={{ type: "multi", options: (options.users ?? []).map((u) => ({ value: u.id, label: u.name ?? u.user_name })) }} value={form.user_ids} onChange={set("user_ids")} />
          </div>
          <p className="-mt-1 text-[11px] text-muted-foreground sm:col-span-2">{t("gta_recipientHint")}</p>
          <Field field={{ type: "bool", label: t("gta_sendEmail") }} value={form.send_email} onChange={set("send_email")} />
          <Field field={{ type: "bool", label: t("gta_sendSms") }} value={form.send_sms} onChange={set("send_sms")} />
          <label className={`${labelClass} sm:col-span-2`}>
            {t("gta_remarks")}
            <Field field={{}} value={form.remarks} onChange={set("remarks")} />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            {t("gta_narration")}
            <Field field={{}} value={narration} onChange={setNarration} />
          </label>
          {problems.length > 0 && (
            <ul className="list-disc rounded-xl border border-red-200 bg-red-50 px-3 py-2 pl-7 text-xs font-semibold text-red-700 sm:col-span-2">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
