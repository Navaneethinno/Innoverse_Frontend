import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, Calculator, CheckCircle2, Eye, Pencil, Plus, Power, Receipt, RefreshCw, RotateCcw, Save, Search, Send, Trash2, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { RowActions } from "@/Components/Common/RowActions";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { InstitutionField } from "@/Components/Epurse/NotificationCenter/notificationShared";
import { accountDate, money } from "@/Components/Epurse/Accounts/accountShared";
import { ActionButtons, NarrationDialog, Problems, Section, inputClass, labelClass, ratePct } from "@/Components/TermDeposits/depositShared";
import { ProductStatus } from "@/Components/TermDeposits/DepositProducts/productShared";
import { Field, MiniTable, RowsEditor, loanLabel, useInstitutionScope } from "@/Components/Loans/loanShared";
import { PlanCard } from "@/Components/Transactions/txnShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { feeSchedulesApi } from "@/Services/Transactions/transactions.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";

const STATUSES = [
  [1, "Active"],
  [9, "Draft"],
  [2, "PendingAdd"],
  [5, "RejectedAdd"],
  [13, "Inactive"],
];
const blankRule = () => ({ rule_code: "", fee_name: "", txn_type_id: "", channel_id: "", digital_product_id: "", minimum_amount: "0", maximum_amount: "0", calculation_type: "FIXED", fixed_amount: "0", percent_value: "0", minimum_fee: "0", maximum_fee: "0", pay_from: "SENDER", tax_percent: "0", shares: [] });
const str = (v, d = "0") => String(v ?? "").trim() || d;
const idOrNull = (v) => (v === "" || v == null ? null : Number(v));

// The configuration as the server takes it; shares left empty give the
// whole fee to TXN_FEE_INCOME.
const toBody = (c) => ({
  schedule_name: str(c.schedule_name, ""),
  description: str(c.description, ""),
  effective_from: c.effective_from ?? "",
  effective_to: c.effective_to ?? "",
  rules: (c.rules ?? []).map((r) => ({
    ...(r.id ? { id: r.id } : {}),
    rule_code: str(r.rule_code, "").toUpperCase(),
    fee_name: str(r.fee_name, ""),
    txn_type_id: Number(r.txn_type_id),
    channel_id: idOrNull(r.channel_id),
    digital_product_id: idOrNull(r.digital_product_id),
    minimum_amount: str(r.minimum_amount),
    maximum_amount: str(r.maximum_amount),
    calculation_type: r.calculation_type,
    fixed_amount: str(r.fixed_amount),
    percent_value: str(r.percent_value),
    minimum_fee: str(r.minimum_fee),
    maximum_fee: str(r.maximum_fee),
    pay_from: r.pay_from,
    tax_percent: str(r.tax_percent),
    shares: (r.shares ?? []).filter((s) => s.purpose).map((s) => ({ purpose: s.purpose, percent: str(s.percent) })),
  })),
});

// GLOBAL SETTINGS > Fee Schedules (menu 190): one schedule per institution
// and currency, its rules approved or rejected as a whole.
export function FeeSchedules() {
  const { t } = useTranslation(["fees", "deposits", "common"]);
  const can = usePagePermission();
  const { chooser, institution, setInstitution, scope } = useInstitutionScope();
  const [tab, setTab] = useState("all");
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const body = scope({ page, page_size: limit, ...(applied.search.trim() ? { search: applied.search.trim() } : {}), ...(applied.status ? { status: Number(applied.status) } : {}) });
      const row = rowsOf(await (tab === "pending" ? feeSchedulesApi.pending(body) : feeSchedulesApi.list(body)))[0];
      setData({ items: row?.items ?? [], total: row?.total ?? 0 });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [tab, applied, page, limit, scope]);
  useEffect(() => {
    void load();
  }, [load]);

  const back = () => {
    setScreen(null);
    void load();
  };
  if (screen?.kind === "edit") return <ScheduleEditor schedule={screen.schedule} scope={scope} onClose={() => (screen.schedule ? setScreen({ kind: "view", id: screen.schedule.id }) : back())} onSaved={(id) => setScreen({ kind: "view", id })} onOpen={(id) => setScreen({ kind: "view", id })} />;
  if (screen?.kind === "view") return <ScheduleView id={screen.id} onBack={back} onEdit={(schedule) => setScreen({ kind: "edit", schedule })} />;

  const columns = [
    {
      key: "schedule_name",
      label: t("schedule"),
      align: "left",
      render: (s) => (
        <button type="button" onClick={() => setScreen({ kind: "view", id: s.id })} className="text-left">
          <p className="text-xs font-bold text-primary hover:underline">{s.schedule_name || s.schedule_code}</p>
          <p className="text-[10px] text-muted-foreground">{s.schedule_code}</p>
        </button>
      ),
    },
    { key: "currency", label: t("currency"), render: (s) => <span className="text-xs font-semibold">{s.currency_alpha_code ?? s.currency_code_name ?? s.currency_code}</span> },
    { key: "rule_count", label: t("rules"), render: (s) => <span className="text-xs tabular-nums">{s.rule_count ?? "—"}</span> },
    { key: "status", label: t("status"), render: (s) => <ProductStatus product={s} /> },
    { key: "inst_profile_name", label: t("institution"), render: (s) => <span className="text-xs">{s.inst_profile_name}</span> },
    { key: "updated_time", label: t("updated"), render: (s) => <span className="whitespace-nowrap text-xs">{accountDate(s.updated_time ?? s.created_time)}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (s) => <RowActions buttons={{ view: true }} onView={() => setScreen({ kind: "view", id: s.id })} /> },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Receipt size={22} className="text-primary" /> {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
            {t("refresh")}
          </Button>
          {can("Add") && (
            <Button size="sm" icon={Plus} disabled={chooser && !institution} onClick={() => setScreen({ kind: "edit", schedule: null })}>
              {t("newSchedule")}
            </Button>
          )}
        </div>
      </div>
      {chooser && (
        <div className="mb-4 max-w-sm">
          <InstitutionField value={institution} onChange={setInstitution} />
        </div>
      )}
      <div className="mb-3 flex w-fit gap-1 rounded-2xl border border-border bg-card p-1">
        {["all", "pending"].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setPage(1);
            }}
            className={cn("rounded-xl px-4 py-2 text-xs font-bold", tab === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-[var(--primary-light)] hover:text-primary")}
          >
            {t(`deposits:tab_${key}`)}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(filters);
          setPage(1);
        }}
        className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[2fr_1fr_auto]"
      >
        <input className={inputClass} placeholder={t("searchSchedules")} value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
        <FilterSelect value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} options={[{ value: "", label: t("anyStatus") }, ...STATUSES.map(([v, k]) => ({ value: String(v), label: t(`deposits:pstatus_${k}`) }))]} />
        <Button type="submit" size="sm" icon={Search}>
          {t("search")}
        </Button>
      </form>
      <DataTable
        columns={columns}
        rows={data.items}
        rowKey={(s) => s.id}
        isLoading={loading}
        title={t(`deposits:tab_${tab}`)}
        emptyTitle={t("noSchedules")}
        emptyDescription={t("noSchedulesHint")}
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
    </div>
  );
}

// The options lists, by id, for showing rules.
function useFeeOptions(instProfileId) {
  const [options, setOptions] = useState(null);
  useEffect(() => {
    feeSchedulesApi
      .options(instProfileId ? { inst_profile_id: instProfileId } : {})
      .then((r) => setOptions(rowsOf(r)[0] ?? {}))
      .catch((e) => {
        notifications.error(e.message);
        setOptions({});
      });
  }, [instProfileId]);
  return options;
}

const nameOf = (list, id) => (id == null || id === "" ? null : (list ?? []).find((x) => String(x.id) === String(id))?.name ?? `#${id}`);

// How a rule prices: "1.00 + 1% (min 2.00, max 50.00) · tax 5%".
function priceText(t, r, cur) {
  const fixed = money(r.fixed_amount, cur);
  const pct = ratePct(r.percent_value);
  const base = r.calculation_type === "FIXED" ? fixed : r.calculation_type === "PERCENT" ? pct : `${fixed} + ${pct}`;
  const bounds = [Number(r.minimum_fee) > 0 && `${t("min")} ${money(r.minimum_fee, cur)}`, Number(r.maximum_fee) > 0 && `${t("max")} ${money(r.maximum_fee, cur)}`].filter(Boolean).join(", ");
  return `${base}${bounds ? ` (${bounds})` : ""}${Number(r.tax_percent) > 0 ? ` · ${t("taxX", { pct: ratePct(r.tax_percent) })}` : ""}`;
}

// The rules as a table; with `other`, rules new or changed are marked.
function RulesTable({ rules, options, currency, other }) {
  const { t } = useTranslation("fees");
  const sig = (r) => JSON.stringify(toBody({ rules: [{ ...r, id: undefined }] }).rules[0]);
  const before = other ? new Set(other.map(sig)) : null;
  return (
    <MiniTable
      rows={rules}
      empty={t("noRules")}
      rowClass={(r) => (before && !before.has(sig(r)) ? "bg-amber-50" : undefined)}
      columns={[
        { key: "rule_code", label: t("rule"), render: (r) => <span><b>{r.rule_code}</b> <span className="text-muted-foreground">{r.fee_name}</span></span> },
        { key: "txn_type_id", label: t("txnType"), render: (r) => nameOf(options?.txn_types, r.txn_type_id) },
        { key: "narrow", label: t("appliesTo"), render: (r) => [nameOf(options?.channels, r.channel_id), nameOf(options?.digital_products, r.digital_product_id)].filter(Boolean).join(" · ") || t("everything") },
        { key: "amounts", label: t("amounts"), render: (r) => `${money(r.minimum_amount, currency)} – ${Number(r.maximum_amount) === 0 ? t("noLimit") : money(r.maximum_amount, currency)}` },
        { key: "price", label: t("fee"), render: (r) => priceText(t, r, currency) },
        { key: "pay_from", label: t("paidBy"), render: (r) => loanLabel(t, r.pay_from) },
        { key: "shares", label: t("shares"), render: (r) => (r.shares?.length ? r.shares.map((s) => `${loanLabel(t, s.purpose)} ${ratePct(s.percent)}`).join(", ") : t("allToIncome")) },
      ]}
    />
  );
}

// One schedule: in effect, what waits for a checker, warnings, history, and
// a "try a fee" quote.
function ScheduleView({ id, onBack, onEdit }) {
  const { t } = useTranslation(["fees", "deposits"]);
  const can = usePagePermission();
  const [s, setS] = useState(null);
  const [audit, setAudit] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const options = useFeeOptions(s?.inst_profile_id);

  const reload = useCallback(async () => {
    try {
      const [got, history] = await Promise.all([feeSchedulesApi.get({ id }), feeSchedulesApi.audit({ id }).catch(() => null)]);
      setS(rowsOf(got)[0] ?? null);
      setAudit(history ? rowsOf(history) : []);
    } catch (error) {
      notifications.error(error.message);
    }
  }, [id]);
  useEffect(() => {
    void reload();
  }, [reload]);

  const act = async (verb, narration) => {
    setBusy(true);
    try {
      const response = await feeSchedulesApi[verb]({ id, ...(narration ? { narration } : {}) });
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      if (verb === "delete" && Number(s.status) === 9) return onBack();
      await reload();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!s) {
    return (
      <PageSkeleton />
    );
  }

  const a = s.actions ?? {};
  const cur = s.currency_alpha_code ?? s.config?.currency_alpha_code;
  const ask = (verb) => () => setDialog(verb);
  const buttons = [
    a.edit && can("Edit") && { key: "edit", label: t("edit"), icon: Pencil, run: () => onEdit(s) },
    a.submit && can("Add") && { key: "submit", label: t("submit"), icon: Send, variant: "outline", run: ask("submit") },
    a.deactivate && can("Deactivate") && { key: "deactivate", label: t("deactivate"), icon: Power, run: ask("deactivate") },
    a.reactivate && can("Reactivate") && { key: "reactivate", label: t("reactivate"), icon: RotateCcw, run: ask("reactivate") },
    a.delete && can("Delete") && { key: "delete", label: t("delete"), icon: Trash2, variant: "danger", run: ask("delete") },
    a.deauth && can("Authorize") && { key: "deauth", label: t("reject"), icon: XCircle, variant: "danger", run: ask("deauth") },
    a.auth && can("Authorize") && { key: "auth", label: t("approve"), icon: CheckCircle2, variant: "primary", run: ask("auth") },
  ];
  const shown = s.draft ?? s.config;

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {t("backToSchedules")}
      </button>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black">{s.schedule_name || s.schedule_code}</h1>
              <ProductStatus product={s} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {s.schedule_code} · {cur} · {s.inst_profile_name}
              {shown?.effective_from ? ` · ${t("fromDate", { date: shown.effective_from })}` : ""}
            </p>
          </div>
          <ActionButtons buttons={buttons} busy={busy} />
        </div>
        {s.warnings?.length > 0 && (
          <ul className="mt-3 grid gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            {s.warnings.map((w) => (
              <li key={w} className="flex items-start gap-1.5">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {w}
              </li>
            ))}
          </ul>
        )}
      </div>

      {s.pending ? (
        <div className="mb-4 grid gap-4">
          <Section title={t("inEffect")}>
            <RulesTable rules={s.config?.rules} options={options} currency={cur} />
          </Section>
          <Section title={t("deposits:proposedBy", { action: t(`deposits:pending_${s.pending.action}`, { defaultValue: s.pending.action }), name: s.pending.proposed_by?.name ?? s.pending.proposed_by ?? "—", date: accountDate(s.pending.proposed_at) })} className="border-amber-300 ring-1 ring-amber-200">
            {s.pending.config ? <RulesTable rules={s.pending.config.rules} options={options} currency={cur} other={s.config?.rules} /> : <p className="text-sm text-muted-foreground">{t(`deposits:pendingHint_${s.pending.action}`, { defaultValue: "" })}</p>}
          </Section>
        </div>
      ) : (
        <Section title={s.draft ? t("draft") : t("inEffect")} className="mb-4">
          <RulesTable rules={shown?.rules} options={options} currency={cur} />
        </Section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {s.config && options && <FeeQuote schedule={s} options={options} />}
        <Section title={t("history")}>
          <ol className="relative grid gap-3 border-l border-border pl-4">
            {audit.map((e, i) => (
              <li key={`${e.at}-${i}`} className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-[var(--primary-light)]" />
                <p className="text-xs font-bold">
                  {t(`deposits:audit_${e.action}`, { defaultValue: e.action })} <span className="font-medium text-muted-foreground">· {e.process_status_name ?? e.status_name}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {e.actor} · {accountDate(e.at)}
                </p>
                {e.narration?.trim() && <p className="mt-0.5 text-xs italic">“{e.narration}”</p>}
              </li>
            ))}
            {!audit.length && <li className="text-sm text-muted-foreground">{t("nothingYet")}</li>}
          </ol>
        </Section>
      </div>

      {dialog && (
        <NarrationDialog
          title={t(`confirm_${dialog}`)}
          hint={t(`confirmHint_${dialog}`)}
          confirmLabel={t(dialog === "auth" ? "approve" : dialog === "deauth" ? "reject" : dialog)}
          variant={["delete", "deauth", "deactivate"].includes(dialog) ? "danger" : "primary"}
          required={dialog === "deauth"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => act(dialog, narration)}
        />
      )}
    </div>
  );
}

// "Try a fee": what a transaction of a type, channel, product and amount
// would pay under the schedules in effect.
function FeeQuote({ schedule, options }) {
  const { t } = useTranslation("fees");
  const [q, setQ] = useState({ txn_type_id: "", channel_id: "", digital_product_id: "", amount: "" });
  const [fee, setFee] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      const body = {
        inst_profile_id: schedule.inst_profile_id,
        currency_code: schedule.currency_code,
        txn_type_id: Number(q.txn_type_id),
        amount: q.amount,
        ...(q.channel_id ? { channel_id: Number(q.channel_id) } : {}),
        ...(q.digital_product_id ? { digital_product_id: Number(q.digital_product_id) } : {}),
      };
      setFee(rowsOf(await feeSchedulesApi.quote(body))[0] ?? null);
    } catch (e) {
      setFee(null);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const list = (rows, blank) => ({ type: "select", blank, options: (rows ?? []).map((x) => ({ value: String(x.id), label: x.name })) });
  const cur = schedule.currency_alpha_code;
  const f = fee;
  return (
    <Section title={t("tryAFee")}>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className={labelClass}>
          {t("txnType")}
          <Field field={list(options.txn_types, t("choose"))} value={q.txn_type_id} onChange={(v) => setQ((x) => ({ ...x, txn_type_id: v }))} />
        </label>
        <label className={labelClass}>
          {t("amount")}
          <Field field={{ type: "amount" }} value={q.amount} onChange={(v) => setQ((x) => ({ ...x, amount: v }))} />
        </label>
        <label className={labelClass}>
          {t("channel")}
          <Field field={list(options.channels, t("anyChannel"))} value={q.channel_id} onChange={(v) => setQ((x) => ({ ...x, channel_id: v }))} />
        </label>
        <label className={labelClass}>
          {t("digitalProduct")}
          <Field field={list(options.digital_products, t("anyProduct"))} value={q.digital_product_id} onChange={(v) => setQ((x) => ({ ...x, digital_product_id: v }))} />
        </label>
      </div>
      <Button icon={Calculator} className="mt-3" loading={busy} disabled={!q.txn_type_id || !(Number(q.amount) > 0)} onClick={run}>
        {t("getFee")}
      </Button>
      {error && <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>}
      {f && (
        <div className="mt-3">
          <PlanCard plan={{ currency_code: cur, amount: q.amount, fee: f, total_debit: f.pay_from === "SENDER" ? Number(q.amount) + Number(f.total_charge ?? 0) : q.amount, net_credit: f.pay_from === "RECEIVER" ? Number(q.amount) - Number(f.total_charge ?? 0) : q.amount }} />
        </div>
      )}
    </Section>
  );
}

// Add or edit a schedule: the header and the rules (with their shares). A
// new one or a Draft / Rejected Add saves drafts and is submitted; an
// approved one proposes its changes in one edit.
function ScheduleEditor({ schedule, scope, onClose, onSaved, onOpen }) {
  const { t } = useTranslation(["fees", "deposits"]);
  const options = useFeeOptions(schedule?.inst_profile_id ?? scope().inst_profile_id);
  const [head, setHead] = useState({ schedule_code: "", currency_code: "" });
  const [config, setConfig] = useState(null);
  const [id, setId] = useState(schedule?.id ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const drafting = !schedule || [9, 5].includes(Number(schedule.status));
  const started = useRef(false);

  useEffect(() => {
    if (!options || started.current) return;
    started.current = true;
    const source = schedule ? (schedule.draft ?? schedule.pending?.config ?? schedule.config) : options.defaults;
    setConfig(structuredClone(source ?? { rules: [] }));
  }, [options, schedule]);

  const currency = options?.currencies?.find((c) => String(c.id) === String(schedule?.currency_code ?? head.currency_code));
  const cur = schedule?.currency_alpha_code ?? currency?.alpha_code ?? "";
  const shareProblem = config?.rules?.some((r) => r.shares?.length && r.shares.reduce((sum, s) => sum + Number(s.percent || 0), 0) !== 100);
  const ready = config && str(config.schedule_name, "") && (schedule || (/^[A-Z0-9_]+$/.test(head.schedule_code) && head.currency_code && !currency?.fee_schedule_id)) && config.rules?.every((r) => r.rule_code && r.fee_name && r.txn_type_id) && !shareProblem;

  const save = async (submit) => {
    setBusy(true);
    setError("");
    try {
      let savedId = id;
      if (drafting) {
        const body = { ...toBody(config), is_draft: true };
        const response = id ? await feeSchedulesApi.edit({ id, ...body }) : await feeSchedulesApi.add(scope({ schedule_code: head.schedule_code, currency_code: Number(head.currency_code), ...body }));
        savedId = rowsOf(response)[0]?.id ?? id;
        setId(savedId);
        if (!submit) {
          notifications.success(t("deposits:draftSaved"));
          return;
        }
      }
      const response = drafting ? await feeSchedulesApi.submit({ id: savedId }) : await feeSchedulesApi.edit({ id: savedId, ...toBody(config) });
      notifications.success(response?.message ?? t("deposits:submitted"));
      onSaved(savedId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!config || !options) {
    return (
      <PageSkeleton />
    );
  }
  const sel = (rows, blank) => ({ type: "select", blank, options: (rows ?? []).map((x) => ({ value: String(x.id), label: x.name })) });
  const codes = (list) => ({ type: "select", options: list ?? [] });

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onClose} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {t("backToSchedules")}
      </button>
      <h1 className="mb-1 text-2xl font-black tracking-tight text-slate-800">{schedule ? t("editX", { name: schedule.schedule_name || schedule.schedule_code }) : t("newSchedule")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{drafting ? t("draftHint") : t("proposeHint")}</p>

      <Section title={t("schedule")} className="mb-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className={labelClass}>
            {t("code")}
            <Field field={{ placeholder: "AED_FEES" }} disabled={Boolean(schedule)} value={schedule?.schedule_code ?? head.schedule_code} onChange={(v) => setHead((h) => ({ ...h, schedule_code: v.toUpperCase().replace(/[^A-Z0-9_]/g, "") }))} />
          </label>
          <label className={labelClass}>
            {t("currency")}
            <Field field={{ type: "select", blank: t("choose"), options: (options.currencies ?? []).map((c) => ({ value: String(c.id), label: `${c.alpha_code} · ${c.name}${c.fee_schedule_id ? ` (${t("hasSchedule")})` : ""}` })) }} disabled={Boolean(schedule)} value={String(schedule?.currency_code ?? head.currency_code)} onChange={(v) => setHead((h) => ({ ...h, currency_code: v }))} />
            {!schedule && currency?.fee_schedule_id && (
              <button type="button" onClick={() => onOpen(currency.fee_schedule_id)} className="mt-1 flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                <Eye size={12} /> {t("openExisting", { name: currency.fee_schedule_name })}
              </button>
            )}
          </label>
          <label className={labelClass}>
            {t("name")}
            <Field field={{}} value={config.schedule_name} onChange={(v) => setConfig((c) => ({ ...c, schedule_name: v }))} />
          </label>
          <label className={labelClass}>
            {t("effectiveFrom")}
            <Field field={{ type: "date" }} value={config.effective_from} onChange={(v) => setConfig((c) => ({ ...c, effective_from: v }))} />
          </label>
          <label className={cn(labelClass, "md:col-span-2 lg:col-span-4")}>
            {t("description")}
            <Field field={{}} value={config.description} onChange={(v) => setConfig((c) => ({ ...c, description: v }))} />
          </label>
        </div>
      </Section>

      <Section title={t("rules")}>
        <p className="mb-3 text-xs text-muted-foreground">{t("rulesHint")}</p>
        <RowsEditor
          rows={config.rules ?? []}
          onChange={(rules) => setConfig((c) => ({ ...c, rules }))}
          blank={blankRule}
          addLabel={t("addRule")}
          decimals={currency?.amount_decimals ?? 2}
          columns="lg:grid-cols-5"
          fields={[
            { key: "rule_code", label: t("ruleCode"), placeholder: "P2P_STD" },
            { key: "fee_name", label: t("feeName"), placeholder: "Transfer fee" },
            { key: "txn_type_id", label: t("txnType"), ...sel(options.txn_types, t("choose")) },
            { key: "channel_id", label: t("channel"), ...sel(options.channels, t("anyChannel")) },
            { key: "digital_product_id", label: t("digitalProduct"), ...sel(options.digital_products, t("anyProduct")) },
            { key: "minimum_amount", label: t("amountFrom"), type: "amount" },
            { key: "maximum_amount", label: t("upToZero"), type: "amount" },
            { key: "calculation_type", label: t("calculation"), ...codes(options.calculation_types) },
            { key: "fixed_amount", label: cur ? t("fixedAmount", { currency: cur }) : t("fixed"), type: "amount" },
            { key: "percent_value", label: t("percent"), type: "rate" },
            { key: "minimum_fee", label: t("minimumFee"), type: "amount" },
            { key: "maximum_fee", label: t("maximumFee"), type: "amount" },
            { key: "tax_percent", label: t("taxPercent"), type: "rate" },
            { key: "pay_from", label: t("paidBy"), ...codes(options.pay_from) },
          ]}
          renderExtra={(rule, patch) => (
            <div className="mt-3 border-t border-dashed border-border pt-3">
              <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("sharesHint")}</p>
              <RowsEditor
                rows={rule.shares ?? []}
                onChange={(shares) => patch({ shares })}
                blank={() => ({ purpose: options.share_purposes?.[0] ?? "", percent: "" })}
                addLabel={t("addShare")}
                columns="lg:grid-cols-2"
                fields={[
                  { key: "purpose", label: t("purpose"), ...codes(options.share_purposes) },
                  { key: "percent", label: t("percent"), type: "rate" },
                ]}
              />
            </div>
          )}
        />
        {shareProblem && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">{t("sharesMustTotal")}</p>}
      </Section>

      {error && (
        <div className="mt-4">
          <Problems message={error} />
        </div>
      )}
      <div className="sticky bottom-0 mt-4 flex flex-wrap justify-end gap-2 border-t border-border bg-[var(--background)] py-3">
        <Button variant="ghost" onClick={onClose}>
          {t("cancel")}
        </Button>
        {drafting && (
          <Button variant="secondary" icon={Save} loading={busy} disabled={!ready} onClick={() => save(false)}>
            {t("deposits:saveDraft")}
          </Button>
        )}
        <Button icon={Send} loading={busy} disabled={!ready} onClick={() => save(true)}>
          {drafting ? t("deposits:submitForApproval") : t("proposeChanges")}
        </Button>
      </div>
    </div>
  );
}
