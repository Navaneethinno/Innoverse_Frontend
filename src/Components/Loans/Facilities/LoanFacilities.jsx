import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Ban, CheckCircle2, Coins, FileX2, Handshake, HandCoins, Landmark, PhoneCall, RefreshCw, Repeat, Search, Send, Undo2, Wallet, XCircle } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { accountDate, money } from "@/Components/Epurse/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { loanFacilitiesApi, recordOf } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ActionButtons, Facts, NarrationDialog, Problems, Section, dayDate, inputClass, labelClass, ratePct } from "../../TermDeposits/depositShared";
import { CollateralTable, FeesTable, FormDialog, OneFieldDialog } from "../loanDialogs";
import { Field, MiniTable, ScheduleTable, StatusStrip, Tabs, Timeline, loanLabel } from "../loanShared";
import { useLiveChannel } from "@/Hooks/useLiveChannel";

const STATUSES = ["PENDING_DISBURSEMENT", "ACTIVE", "DELINQUENT", "SETTLED", "WRITTEN_OFF", "CANCELLED"];
const SOURCES = ["WALLET", "CASH"];
const TERM_UNITS = ["DAYS", "WEEKS", "MONTHS"];
const ACTION_TYPES = ["CALL", "SMS", "EMAIL", "LETTER", "VISIT", "LEGAL_NOTICE", "AGENCY", "OTHER"];
const OUTCOMES = ["CONTACTED", "NO_CONTACT", "PROMISE_TO_PAY", "REFUSED", "DISPUTED", "PAID", "OTHER"];
const MANDATE_TYPES = ["STANDING_INSTRUCTION", "DIRECT_DEBIT", "GLOBAL_STANDING_INSTRUCTION", "SALARY_DEDUCTION", "OTHER"];
const RISK_TONE = { CURRENT: "text-emerald-700", WATCH: "text-amber-700", SUBSTANDARD: "text-orange-700", DOUBTFUL: "text-red-700", LOSS: "text-red-700" };
const pick = (f) => Object.fromEntries(Object.entries(f).filter(([, v]) => String(v ?? "").trim() !== "").map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));

// LOANS > Loan Facilities (menu 187): the loans. Filters by status and
// search by loan or application number; each loan opens on its own page.
export function LoanFacilities() {
  const { t } = useTranslation(["loans", "common"]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const row = rowsOf(await loanFacilitiesApi.list({ page, page_size: limit, ...(status ? { status } : {}), ...(applied ? { search: applied } : {}) }))[0];
      setData({ items: row?.items ?? [], total: row?.total ?? 0 });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [status, applied, page, limit]);
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel("/config/loan/facility/list", () => void load({ silent: true }));

  if (openId) {
    return (
      <FacilityView
        id={openId}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
      />
    );
  }

  const columns = [
    {
      key: "facility_number",
      label: t("loan"),
      render: (f) => (
        <button type="button" onClick={() => setOpenId(f.id)} className="text-left">
          <span className="block font-mono text-xs font-bold text-primary hover:underline">{f.facility_number}</span>
          <span className="block font-mono text-[10px] text-muted-foreground">{f.application_number}</span>
        </button>
      ),
    },
    {
      key: "owner",
      label: t("borrower"),
      align: "left",
      render: (f) => (
        <div>
          <p className="text-xs font-semibold">{f.owner?.name}</p>
          <p className="text-[10px] text-muted-foreground">{loanLabel(t, f.owner?.kind ?? f.entity_type)}</p>
        </div>
      ),
    },
    { key: "product_name", label: t("product"), render: (f) => <span className="text-xs">{f.product_name}</span> },
    { key: "principal_disbursed", label: t("principal"), render: (f) => <span className="whitespace-nowrap text-xs font-bold tabular-nums">{money(Number(f.principal_disbursed) > 0 ? f.principal_disbursed : f.principal_approved, f.currency_alpha_code)}</span> },
    { key: "principal_outstanding", label: t("outstanding"), render: (f) => <span className="whitespace-nowrap text-xs tabular-nums">{money(f.principal_outstanding, f.currency_alpha_code)}</span> },
    { key: "days_past_due", label: t("dpd"), render: (f) => <span className={cn("text-xs font-bold tabular-nums", f.days_past_due > 0 && "text-red-700")}>{f.days_past_due ?? 0}</span> },
    { key: "risk_class", label: t("riskClass"), render: (f) => <span className={cn("text-xs font-bold", RISK_TONE[f.risk_class])}>{loanLabel(t, f.risk_class)}</span> },
    { key: "status", label: t("status"), render: (f) => <StatusBadge status={f.status} variant="subtle" /> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (f) => <RowActions buttons={{ view: true }} onView={() => setOpenId(f.id)} /> },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Landmark size={22} className="text-primary" /> {t("facilitiesTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("facilitiesSubtitle")}</p>
        </div>
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
          {t("refresh")}
        </Button>
      </div>
      <StatusStrip
        statuses={STATUSES}
        value={status}
        labelOf={(s) => t(`loanStatus_${s}`)}
        onChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(search.trim());
          setPage(1);
        }}
        className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_auto]"
      >
        <input className={inputClass} placeholder={t("searchLoans")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="submit" size="sm" icon={Search}>
          {t("search")}
        </Button>
      </form>
      <DataTable
        columns={columns}
        rows={data.items}
        rowKey={(f) => f.id}
        isLoading={loading}
        title={t("facilitiesTitle")}
        emptyTitle={t("noLoans")}
        emptyDescription={t("noLoansHint")}
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

// The get reply inside an action's reply: the reply itself, or its
// `facility` (repay / settle answer {repayment|settlement, facility}).
const fullOf = (r) => (r?.schedule ? r : r?.facility?.schedule ? r.facility : null);

// One loan: header (status, outstanding, days past due, risk class), the
// Due now card, the buttons `actions` allows, and the tabs.
function FacilityView({ id, onBack }) {
  const { t } = useTranslation(["loans", "common"]);
  const can = usePagePermission();
  const [loan, setLoan] = useState(null);
  const [tab, setTab] = useState("schedule");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setLoan(recordOf(await loanFacilitiesApi.get({ id })));
    } catch (error) {
      notifications.error(error.message);
    }
  }, [id]);
  useEffect(() => {
    void reload();
  }, [reload]);
  // The open record: reload when the push names it, or names nothing.
  useLiveChannel("/config/loan/facility/list", (_action, records) => (!records.length || records.some((r) => String(r.id) === String(id))) && void reload());

  const act = async (verb, body = {}) => {
    setBusy(true);
    try {
      const response = await loanFacilitiesApi[verb]({ id, ...body });
      const next = fullOf(recordOf(response));
      if (next) setLoan(next);
      else await reload();
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      return true;
    } catch (error) {
      notifications.error(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!loan) {
    return (
      <PageSkeleton />
    );
  }

  const f = loan.facility ?? {};
  const a = loan.actions ?? {};
  const cur = f.currency_alpha_code;
  const m = (v) => money(v, cur);
  const ask = (key) => () => setDialog(key);
  const pendingRestructure = loan.restructures?.find((r) => r.status === "PENDING");
  const pendingWriteOff = loan.write_offs?.find((w) => w.status === "PENDING");
  const buttons = [
    a.cancel && can("Delete") && { key: "cancel", label: t("cancelLoan"), icon: Ban, run: ask("cancel") },
    a.disburse && can("Authorize") && { key: "disburse", label: t("disburse"), icon: Send, variant: "primary", run: ask("disburse") },
    a.repay && can("Add") && { key: "repay", label: t("repay"), icon: Wallet, variant: "primary", run: ask("repay") },
    a.settle && can("Add") && { key: "settle", label: t("settle"), icon: Handshake, variant: "outline", run: ask("settle") },
    a.restructure && can("Add") && { key: "restructure", label: t("restructure"), icon: Repeat, run: ask("restructure") },
    a.restructure_decide && can("Authorize") && { key: "restructure_deauth", label: t("rejectRestructure"), icon: XCircle, variant: "danger", run: ask("restructure_deauth") },
    a.restructure_decide && can("Authorize") && { key: "restructure_auth", label: t("approveRestructure"), icon: CheckCircle2, variant: "primary", run: ask("restructure_auth") },
    a.write_off && can("Add") && { key: "write_off", label: t("writeOff"), icon: FileX2, variant: "danger", run: ask("write_off") },
    a.write_off_decide && can("Authorize") && { key: "write_off_deauth", label: t("rejectWriteOff"), icon: XCircle, variant: "danger", run: ask("write_off_deauth") },
    a.write_off_decide && can("Authorize") && { key: "write_off_auth", label: t("approveWriteOff"), icon: CheckCircle2, variant: "primary", run: ask("write_off_auth") },
    a.recover && can("Add") && { key: "recover", label: t("recover"), icon: Coins, variant: "primary", run: ask("recover") },
    a.collections && can("Edit") && { key: "collection", label: t("addCollectionAction"), icon: PhoneCall, run: ask("collection") },
    a.collections && can("Edit") && { key: "mandate", label: t("addMandate"), icon: HandCoins, run: ask("mandate") },
  ];
  // Only the latest posted repayment or recovery can be reversed.
  const reversible = [...(loan.transactions ?? [])].reverse().find((x) => ["REPAYMENT", "RECOVERY"].includes(x.transaction_type));
  const canReverse = reversible?.status === "POSTED" && can("Authorize");

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {t("backToLoans")}
      </button>

      <div className={cn("mb-4 rounded-2xl border bg-card p-4", f.status === "DELINQUENT" ? "border-red-300" : "border-border")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-black text-foreground">{f.facility_number}</h1>
              <StatusBadge status={f.status} />
              {f.restructure_count > 0 && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">{t("restructuredN", { count: f.restructure_count })}</span>}
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {f.owner?.name} <span className="ml-1 text-xs font-medium text-muted-foreground">{loanLabel(t, f.owner?.kind ?? f.entity_type)}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {f.product_name} · {f.term_value} {loanLabel(t, f.term_unit)} · {ratePct(f.annual_rate)} · {f.application_number} · {f.inst_profile_name}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-right">
            <Stat label={t("outstanding")} value={m(f.principal_outstanding)} />
            <Stat label={t("dpd")} value={f.days_past_due ?? 0} tone={f.days_past_due > 0 ? "text-red-700" : undefined} />
            <Stat label={t("riskClass")} value={loanLabel(t, f.risk_class)} tone={RISK_TONE[f.risk_class]} />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <ActionButtons buttons={buttons} busy={busy} />
        </div>
        {pendingRestructure && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">{t("restructureWaiting", { term: `${pendingRestructure.term_value} ${loanLabel(t, pendingRestructure.term_unit)}`, rate: ratePct(pendingRestructure.annual_rate) })}</p>}
        {pendingWriteOff && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{t("writeOffWaiting", { name: pendingWriteOff.proposed_by, reason: pendingWriteOff.reason })}</p>}
      </div>

      {loan.due && <DueCard due={loan.due} currency={cur} />}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "schedule" },
          { key: "summary" },
          { key: "transactions", count: loan.transactions?.length },
          { key: "fees", count: loan.fees_charged?.length },
          { key: "collateral", count: loan.collateral?.length },
          { key: "restructures", count: loan.restructures?.length },
          { key: "write_offs", count: loan.write_offs?.length },
          { key: "provisions", count: loan.provisions?.length },
          { key: "collections", count: (loan.collection_actions?.length ?? 0) + (loan.recovery_mandates?.length ?? 0) },
          { key: "history" },
        ]}
      />

      {tab === "schedule" && (loan.schedule?.length ? <ScheduleTable installments={loan.schedule} currency={cur} /> : <p className="text-sm text-muted-foreground">{t("scheduleOnPayout")}</p>)}
      {tab === "summary" && (
        <Facts
          rows={[
            [t("principalApproved"), m(f.principal_approved)],
            [t("principalDisbursed"), m(f.principal_disbursed)],
            [t("netDisbursed"), m(f.net_disbursed)],
            [t("provision"), m(f.provision_amount)],
            [t("disbursementWallet"), f.disbursement_acct_num],
            [t("repaymentWallet"), f.repayment_acct_num],
            [t("loanAccount"), f.loan_acct_num ?? "—"],
            [t("disbursementDate"), dayDate(f.disbursement_date)],
            [t("firstRepayment"), dayDate(f.first_repayment_date)],
            [t("maturity"), dayDate(f.maturity_date)],
            [t("interestAccruedTo"), dayDate(f.interest_accrued_to)],
            [t("scheduleVersion"), f.schedule_version ?? "—"],
            [t("repaymentFrequency"), loanLabel(t, f.repayment_frequency)],
            [t("installmentMethod"), loanLabel(t, f.installment_method)],
            [t("calculationMethod"), `${loanLabel(t, f.calculation_method)} · ${loanLabel(t, f.day_count_convention)}`],
            [t("gracePeriodDays"), t("daysN", { count: f.grace_period_days ?? 0 })],
            [t("earlySettlement"), t(f.early_settlement_allowed ? "yes" : "no")],
            [t("prepaymentCharge"), f.prepayment_charge_type === "NONE" ? t("none") : `${loanLabel(t, f.prepayment_charge_type)} ${f.prepayment_charge_value}`],
            [t("lateCharge"), f.late_charge_type === "NONE" ? t("none") : `${loanLabel(t, f.late_charge_type)} ${f.late_charge_value}`],
            [t("allocationOrder"), (f.repayment_allocation_order ?? []).map((x) => loanLabel(t, x)).join(" → ")],
            [t("autoDebit"), t(f.auto_debit_enabled ? "yes" : "no")],
            f.written_off_date && [t("writtenOff"), `${m(f.written_off_amount)} · ${dayDate(f.written_off_date)}`],
            f.written_off_date && [t("recovered"), m(f.recovered_amount)],
            f.settled_date && [t("settledOn"), dayDate(f.settled_date)],
            [t("createdBy"), `${f.created_by ?? "—"} · ${accountDate(f.created_time)}`],
            f.disbursed_by && [t("disbursedBy"), `${f.disbursed_by} · ${accountDate(f.disbursed_time)}`],
          ]}
        />
      )}
      {tab === "transactions" && (
        <MiniTable
          rows={loan.transactions}
          rowClass={(x) => (x.status === "REVERSED" ? "opacity-50 line-through" : undefined)}
          columns={[
            { key: "transaction_type", label: t("type"), render: (x) => <b>{loanLabel(t, x.transaction_type)}</b> },
            { key: "value_date", label: t("valueDate"), render: (x) => dayDate(x.value_date) },
            { key: "amount", label: t("amount"), align: "right", render: (x) => <b>{m(x.amount)}</b> },
            { key: "principal_component", label: t("principal"), align: "right", render: (x) => m(x.principal_component) },
            { key: "interest_component", label: t("interest"), align: "right", render: (x) => m(x.interest_component) },
            { key: "fee_component", label: t("fees"), align: "right", render: (x) => m(x.fee_component) },
            { key: "penalty_component", label: t("penalty"), align: "right", render: (x) => m(x.penalty_component) },
            { key: "source", label: t("source"), render: (x) => loanLabel(t, x.source) },
            { key: "rrn", label: "RRN" },
            { key: "status", label: t("status"), render: (x) => <StatusBadge status={x.status} variant="subtle" /> },
            { key: "by", label: t("by"), render: (x) => `${x.created_by} · ${accountDate(x.transaction_time)}` },
            canReverse && { key: "reverse", label: "", render: (x) => (x.id === reversible.id ? <ActionIconButton label={t("reverse")} intent="deauth" icon={Undo2} onClick={() => setDialog({ reverse: x })} /> : null) },
          ].filter(Boolean)}
        />
      )}
      {tab === "fees" && <FeesTable rows={loan.fees_charged} currency={cur} />}
      {tab === "collateral" && <CollateralTable rows={loan.collateral} currency={cur} />}
      {tab === "restructures" && (
        <div className="grid gap-3">
          {(loan.restructures ?? []).map((r) => (
            <Section key={r.id} title={`${t("restructureN", { id: r.id })} · ${r.term_value} ${loanLabel(t, r.term_unit)} · ${ratePct(r.annual_rate)}`} action={<StatusBadge status={r.status} variant="subtle" />}>
              <p className="mb-2 text-xs text-muted-foreground">
                {r.reason}
                {r.moratorium_days ? ` · ${t("moratoriumDaysN", { count: r.moratorium_days })}` : ""}
              </p>
              {r.preview && (
                <>
                  <Facts
                    className="mb-3"
                    rows={[
                      [t("asOf"), dayDate(r.preview.as_of)],
                      [t("outstanding"), m(r.preview.principal_outstanding)],
                      [t("capitalisedInterest"), m(r.preview.capitalised_interest)],
                      [t("capitalisedFees"), m(Number(r.preview.capitalised_fees ?? 0) + Number(r.preview.capitalised_penalty ?? 0))],
                      [t("newPrincipal"), m(r.preview.new_principal), "text-primary"],
                    ]}
                  />
                  {r.preview.schedule?.installments && <ScheduleTable installments={r.preview.schedule.installments} currency={cur} />}
                </>
              )}
            </Section>
          ))}
          {!loan.restructures?.length && <p className="text-sm text-muted-foreground">{t("nothingYet")}</p>}
        </div>
      )}
      {tab === "write_offs" && (
        <MiniTable
          rows={loan.write_offs}
          columns={[
            { key: "status", label: t("status"), render: (w) => <StatusBadge status={w.status} variant="subtle" /> },
            { key: "reason", label: t("reason") },
            { key: "principal", label: t("principal"), align: "right", render: (w) => (w.principal != null ? m(w.principal) : "—") },
            { key: "interest", label: t("interest"), align: "right", render: (w) => (w.interest != null ? m(w.interest) : "—") },
            { key: "proposed_by", label: t("proposedBy"), render: (w) => `${w.proposed_by} · ${accountDate(w.proposed_at)}` },
            { key: "decided_by", label: t("decidedBy"), render: (w) => (w.decided_by ? `${w.decided_by} · ${accountDate(w.decided_at)}` : "—") },
            { key: "decision_note", label: t("note"), render: (w) => w.decision_note || "—" },
          ]}
        />
      )}
      {tab === "provisions" && (
        <MiniTable
          rows={loan.provisions}
          rowKey={(p, i) => `${p.provision_date}-${i}`}
          columns={[
            { key: "provision_date", label: t("date"), render: (p) => dayDate(p.provision_date) },
            { key: "risk_class", label: t("riskClass"), render: (p) => <span className={cn("font-bold", RISK_TONE[p.risk_class])}>{loanLabel(t, p.risk_class)}</span> },
            { key: "provision_percent", label: t("provisionPct"), align: "right", render: (p) => ratePct(p.provision_percent) },
            { key: "exposure", label: t("exposure"), align: "right", render: (p) => m(p.exposure) },
            { key: "required", label: t("required"), align: "right", render: (p) => m(p.required) },
            { key: "change", label: t("change"), align: "right", render: (p) => <span className={Number(p.change) < 0 ? "text-emerald-700" : "text-red-700"}>{m(p.change)}</span> },
          ]}
        />
      )}
      {tab === "collections" && (
        <div className="grid gap-4">
          <Section title={t("collectionActions")}>
            <MiniTable
              rows={loan.collection_actions}
              columns={[
                { key: "action_type", label: t("action"), render: (c) => <b>{loanLabel(t, c.action_type)}</b> },
                { key: "outcome", label: t("outcome"), render: (c) => loanLabel(t, c.outcome) },
                { key: "promise", label: t("promise"), render: (c) => (c.promise_date ? `${m(c.promise_amount)} · ${dayDate(c.promise_date)}` : "—") },
                { key: "next_action_date", label: t("nextAction"), render: (c) => dayDate(c.next_action_date) },
                { key: "notes", label: t("notes"), render: (c) => c.notes || "—" },
                { key: "recorded_by", label: t("by"), render: (c) => `${c.recorded_by} · ${accountDate(c.recorded_at)}` },
              ]}
            />
          </Section>
          <Section title={t("mandates")}>
            <MiniTable
              rows={loan.recovery_mandates}
              columns={[
                { key: "mandate_type", label: t("type"), render: (x) => <b>{loanLabel(t, x.mandate_type)}</b> },
                { key: "mandate_reference", label: t("reference") },
                { key: "provider", label: t("provider"), render: (x) => x.provider || "—" },
                { key: "maximum_amount", label: t("maximumAmount"), align: "right", render: (x) => (x.maximum_amount != null ? m(x.maximum_amount) : "—") },
                { key: "period", label: t("period"), render: (x) => `${dayDate(x.start_date)} – ${x.end_date ? dayDate(x.end_date) : "…"}` },
                { key: "status", label: t("status"), render: (x) => <StatusBadge status={x.status} variant="subtle" /> },
                { key: "cancel", label: "", render: (x) => (x.status === "ACTIVE" && a.collections && can("Edit") ? <ActionIconButton label={t("cancelMandate")} intent="delete" icon={Ban} onClick={() => setDialog({ mandate: x })} /> : x.cancel_reason || null) },
              ]}
            />
          </Section>
        </div>
      )}
      {tab === "history" && <Timeline events={loan.events} currency={cur} />}

      {["disburse", "restructure_auth", "restructure_deauth", "write_off_auth", "write_off_deauth"].includes(dialog) && (
        <NarrationDialog
          title={buttons.find((b) => b?.key === dialog)?.label}
          hint={t(`facConfirmHint_${dialog}`, { amount: m(f.principal_approved), wallet: f.disbursement_acct_num })}
          confirmLabel={buttons.find((b) => b?.key === dialog)?.label}
          variant={dialog.endsWith("deauth") ? "danger" : "primary"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(text) => act(dialog, text ? (dialog === "disburse" ? { narration: text } : { note: text }) : {})}
        />
      )}
      {dialog === "cancel" && <OneFieldDialog title={t("cancelLoan")} hint={t("cancelLoanHint")} label={t("reason")} danger busy={busy} onClose={() => setDialog(null)} onSave={(reason) => act("cancel", { reason })} />}
      {dialog === "write_off" && <OneFieldDialog title={t("writeOff")} hint={t("writeOffHint")} label={t("reason")} multiline danger busy={busy} onClose={() => setDialog(null)} onSave={(reason) => act("write_off", { reason })} />}
      {dialog?.reverse && <OneFieldDialog title={t("reverse")} hint={t("reverseHint", { type: loanLabel(t, dialog.reverse.transaction_type), amount: m(dialog.reverse.amount) })} label={t("reason")} danger busy={busy} onClose={() => setDialog(null)} onSave={(reason) => act("reverse", { loan_transaction_id: dialog.reverse.id, reason })} />}
      {dialog?.mandate && <OneFieldDialog title={t("cancelMandate")} label={t("reason")} danger busy={busy} onClose={() => setDialog(null)} onSave={(reason) => act("mandate_cancel", { mandate_id: dialog.mandate.id, reason })} />}
      {dialog === "repay" && (
        <FormDialog
          title={t("repay")}
          hint={t("repayHint", { due: m(loan.due?.total_due), wallet: f.repayment_acct_num })}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(body) => act("repay", body)}
          initial={{ amount: loan.due?.total_due ?? "", source: "WALLET" }}
          required={["amount"]}
          toBody={pick}
          problem={(x) => (Number(x.amount) > Number(loan.due?.total_due ?? 0) ? t("moreThanDue", { due: m(loan.due?.total_due) }) : "")}
          fields={[
            { key: "amount", label: t("amountIn", { currency: cur }), type: "amount" },
            { key: "source", label: t("source"), type: "select", options: SOURCES },
            { key: "narration", label: t("narrationOptional"), span: "sm:col-span-2" },
          ]}
        />
      )}
      {dialog === "recover" && (
        <FormDialog
          title={t("recover")}
          hint={t("recoverHint", { left: m(Number(f.written_off_amount ?? 0) - Number(f.recovered_amount ?? 0)) })}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(body) => act("recover", body)}
          initial={{ source: "WALLET" }}
          required={["amount"]}
          toBody={pick}
          problem={(x) => (Number(x.amount) > Number(f.written_off_amount ?? 0) - Number(f.recovered_amount ?? 0) ? t("moreThanWrittenOff") : "")}
          fields={[
            { key: "amount", label: t("amountIn", { currency: cur }), type: "amount" },
            { key: "source", label: t("source"), type: "select", options: SOURCES },
            { key: "narration", label: t("narrationOptional"), span: "sm:col-span-2" },
          ]}
        />
      )}
      {dialog === "restructure" && (
        <FormDialog
          title={t("restructure")}
          hint={t("restructureHint")}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(x) => act("restructure", { term_value: Number(x.term_value), term_unit: x.term_unit, reason: x.reason.trim(), ...(x.annual_rate ? { annual_rate: x.annual_rate } : {}), ...(x.moratorium_days ? { moratorium_days: Number(x.moratorium_days) } : {}) })}
          initial={{ term_unit: f.term_unit ?? "MONTHS" }}
          required={["term_value", "term_unit", "reason"]}
          fields={[
            { key: "term_value", label: t("newTerm"), type: "int" },
            { key: "term_unit", label: t("termUnit"), type: "select", options: TERM_UNITS },
            { key: "annual_rate", label: t("ratePct"), type: "rate", hint: t("currentRate", { rate: ratePct(f.annual_rate) }) },
            { key: "moratorium_days", label: t("moratoriumDays"), type: "int" },
            { key: "reason", label: t("reason"), span: "sm:col-span-2" },
          ]}
        />
      )}
      {dialog === "collection" && (
        <FormDialog
          title={t("addCollectionAction")}
          hint={t("recordedOnlyHint")}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(body) => act("collection_add", body)}
          initial={{ action_type: "CALL", outcome: "CONTACTED" }}
          required={["action_type", "outcome"]}
          toBody={pick}
          problem={(x) => (x.outcome === "PROMISE_TO_PAY" && (!x.promise_date || !x.promise_amount) ? t("promiseNeedsDateAmount") : "")}
          fields={[
            { key: "action_type", label: t("action"), type: "select", options: ACTION_TYPES },
            { key: "outcome", label: t("outcome"), type: "select", options: OUTCOMES },
            { key: "promise_date", label: t("promiseDate"), type: "date" },
            { key: "promise_amount", label: t("promiseAmount"), type: "amount" },
            { key: "next_action_date", label: t("nextAction"), type: "date" },
            { key: "notes", label: t("notes") },
          ]}
        />
      )}
      {dialog === "mandate" && (
        <FormDialog
          title={t("addMandate")}
          hint={t("recordedOnlyHint")}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(body) => act("mandate_add", body)}
          initial={{ mandate_type: "STANDING_INSTRUCTION" }}
          required={["mandate_type", "mandate_reference"]}
          toBody={pick}
          fields={[
            { key: "mandate_type", label: t("type"), type: "select", options: MANDATE_TYPES },
            { key: "mandate_reference", label: t("reference") },
            { key: "provider", label: t("provider") },
            { key: "maximum_amount", label: t("maximumAmount"), type: "amount" },
            { key: "start_date", label: t("startDate"), type: "date" },
            { key: "end_date", label: t("endDate"), type: "date" },
            { key: "notes", label: t("notes"), span: "sm:col-span-2" },
          ]}
        />
      )}
      {dialog === "settle" && <SettleDialog loan={f} busy={busy} onClose={() => setDialog(null)} onSettle={(body) => act("settle", body)} />}
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("amount-fit text-lg font-black tabular-nums text-foreground", tone)}>{value}</p>
    </div>
  );
}

// What is owed now: instalments already due, then the next one.
function DueCard({ due, currency }) {
  const { t } = useTranslation("loans");
  const m = (v) => money(v, currency);
  const owing = Number(due.total_due) > 0;
  return (
    <div className={cn("mb-4 rounded-2xl border p-4", owing ? "border-red-200 bg-red-50" : "border-border bg-card")}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("dueNow")}</p>
          <p className={cn("amount-fit text-xl font-black sm:text-2xl tabular-nums", owing ? "text-red-700" : "text-foreground")}>{m(due.total_due)}</p>
        </div>
        <div className="flex flex-wrap gap-6 sm:text-right">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("nextDue")}</p>
            <p className="text-sm font-bold">
              {m(due.next_amount)} · {dayDate(due.next_due_date)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("totalOutstanding")}</p>
            <p className="text-sm font-bold">{m(due.total_outstanding)}</p>
          </div>
        </div>
      </div>
      {due.installments?.length > 0 && (
        <div className="mt-3">
          <MiniTable
            rows={due.installments}
            rowKey={(i) => i.installment_number}
            columns={[
              { key: "installment_number", label: "#" },
              { key: "due_date", label: t("dueDate"), render: (i) => dayDate(i.due_date) },
              { key: "status", label: t("status"), render: (i) => <StatusBadge status={i.status} variant="subtle" /> },
              { key: "principal", label: t("principal"), align: "right", render: (i) => m(i.principal) },
              { key: "interest", label: t("interest"), align: "right", render: (i) => m(i.interest) },
              { key: "fees", label: t("fees"), align: "right", render: (i) => m(i.fees) },
              { key: "penalty", label: t("penalty"), align: "right", render: (i) => m(i.penalty) },
              { key: "total", label: t("total"), align: "right", render: (i) => <b>{m(i.total)}</b> },
            ]}
          />
        </div>
      )}
    </div>
  );
}

// Early settlement: the quote first; settling sends its total as
// expected_total, and a changed amount shows the new quote.
function SettleDialog({ loan, busy, onClose, onSettle }) {
  const { t } = useTranslation("loans");
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [source, setSource] = useState("WALLET");
  const [narration, setNarration] = useState("");
  const cur = loan.currency_alpha_code;
  const m = (v) => money(v, cur);

  const fetchQuote = useCallback(async () => {
    setError("");
    try {
      setQuote(recordOf(await loanFacilitiesApi.settlement_quote({ id: loan.id })));
    } catch (e) {
      setError(e.message);
    }
  }, [loan.id]);
  useEffect(() => {
    void fetchQuote();
  }, [fetchQuote]);

  const settle = async () => {
    const ok = await onSettle({ source, expected_total: quote.total, ...(narration.trim() ? { narration: narration.trim() } : {}) });
    if (!ok) void fetchQuote();
  };

  const lines = quote && [
    ["principal", quote.principal],
    ["interestEarned", quote.interest],
    ["fees", quote.fees],
    ["penalty", quote.penalty],
    Number(quote.prepayment_charge) !== 0 && ["prepaymentCharge", quote.prepayment_charge],
    Number(quote.settlement_fees) !== 0 && ["settlementFees", quote.settlement_fees],
  ].filter(Boolean);

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={t("settle")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={busy} disabled={!quote} onClick={settle}>
            {quote ? t("settleFor", { amount: m(quote.total) }) : t("settle")}
          </Button>
        </>
      }
    >
      {error && <Problems message={error} />}
      {!quote && !error && <Spinner size={18} />}
      {quote && (
        <div className="grid gap-3">
          <p className="text-xs text-muted-foreground">{t(quote.early ? "settleEarlyHint" : "settleHint", { date: dayDate(quote.as_of) })}</p>
          <dl className="grid gap-1 text-sm">
            {lines.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t(key)}</dt>
                <dd className="tabular-nums">{m(value)}</dd>
              </div>
            ))}
            <div className="mt-1 flex justify-between gap-3 border-t border-border pt-2 text-base font-black">
              <dt>{t("total")}</dt>
              <dd className="tabular-nums text-primary">{m(quote.total)}</dd>
            </div>
          </dl>
          {(Number(quote.interest_waived) > 0 || Number(quote.fees_waived) > 0) && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{t("waived", { interest: m(quote.interest_waived), fees: m(quote.fees_waived) })}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              {t("source")}
              <Field field={{ type: "select", options: SOURCES }} value={source} onChange={setSource} />
              {source === "WALLET" && <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("fromWallet", { wallet: loan.repayment_acct_num })}</span>}
            </label>
            <label className={labelClass}>
              {t("narrationOptional")}
              <Field field={{}} value={narration} onChange={setNarration} />
            </label>
          </div>
        </div>
      )}
    </Modal>
  );
}
