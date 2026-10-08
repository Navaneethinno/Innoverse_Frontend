import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Ban, CheckCircle2, Circle, ClipboardCheck, FileCheck2, FileSignature, HandCoins, MessageSquareWarning, Pencil, Plus, RefreshCw, Search, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { RowActions } from "@/Components/Common/RowActions";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { accountDate, money } from "@/Components/Epurse/Accounts/accountShared";
import { useMenuPermission, usePagePermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { loanApplicationsApi, loanFacilitiesApi, recordOf } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ActionButtons, NarrationDialog, inputClass, ratePct } from "../../TermDeposits/depositShared";
import { MiniTable, StatusStrip, Tabs, Timeline, loanLabel } from "../loanShared";
import { ApplicationForm, Disclosure } from "./ApplicationForm";
import { CollateralTable, FeesTable, FormDialog, OneFieldDialog } from "../loanDialogs";
import { useLiveChannel } from "@/Hooks/useLiveChannel";

const STATUSES = ["SUBMITTED", "UNDER_REVIEW", "MORE_INFORMATION_REQUIRED", "APPROVED", "DECLINED", "WITHDRAWN", "CONVERTED"];

// LOANS > Loan Applications (menu 186): staff apply for a borrower, record
// the offer's acceptance, credit checks and collateral, and approve. An
// "Awaiting my approval" view lists what the caller can still approve.
export function LoanApplications() {
  const { t } = useTranslation(["loans", "common"]);
  const can = usePagePermission();
  const [status, setStatus] = useState("");
  const [awaitingMe, setAwaitingMe] = useState(false);
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const body = { page, page_size: limit, ...(status ? { status } : {}), ...(awaitingMe ? { awaiting_me: true } : {}), ...(applied ? { search: applied } : {}) };
      const row = rowsOf(await loanApplicationsApi.list(body))[0];
      setData({ items: row?.items ?? [], total: row?.total ?? 0 });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [status, awaitingMe, applied, page, limit]);
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel("/config/loan/application/list", () => void load({ silent: true }));

  if (openId) {
    return (
      <ApplicationView
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
      key: "application_number",
      label: t("application"),
      render: (a) => (
        <button type="button" onClick={() => setOpenId(a.id)} className="font-mono text-xs font-bold text-primary hover:underline">
          {a.application_number}
        </button>
      ),
    },
    {
      key: "owner",
      label: t("borrower"),
      align: "left",
      render: (a) => (
        <div>
          <p className="text-xs font-semibold">{a.owner?.name}</p>
          <p className="text-[10px] text-muted-foreground">{loanLabel(t, a.owner?.kind)}</p>
        </div>
      ),
    },
    { key: "product_name", label: t("product"), render: (a) => <span className="text-xs">{a.product_name} · {a.requested_term_value} {loanLabel(t, a.requested_term_unit)}</span> },
    { key: "requested_amount", label: t("amount"), render: (a) => <span className="whitespace-nowrap text-xs font-bold tabular-nums">{money(a.requested_amount, a.currency_alpha_code)}</span> },
    { key: "annual_rate", label: t("rate"), render: (a) => <span className="text-xs font-semibold text-primary">{ratePct(a.annual_rate)}</span> },
    { key: "status", label: t("status"), render: (a) => <StatusBadge status={a.status} variant="subtle" /> },
    { key: "submitted_time", label: t("submittedAt"), render: (a) => <span className="whitespace-nowrap text-xs">{accountDate(a.submitted_time)}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (a) => <RowActions buttons={{ view: true }} onView={() => setOpenId(a.id)} /> },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <FileSignature size={22} className="text-primary" /> {t("applicationsTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("applicationsSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
            {t("refresh")}
          </Button>
          {can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
              {t("newApplication")}
            </Button>
          )}
        </div>
      </div>

      <StatusStrip
        statuses={STATUSES}
        value={status}
        labelOf={(s) => t(`appStatus_${s}`)}
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
        className="mb-4 grid items-center gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[2fr_auto_auto]"
      >
        <input className={inputClass} placeholder={t("searchApplications")} value={search} onChange={(e) => setSearch(e.target.value)} />
        {can("Authorize") && (
          <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              className="accent-[var(--primary)]"
              checked={awaitingMe}
              onChange={(e) => {
                setAwaitingMe(e.target.checked);
                setPage(1);
              }}
            />
            {t("awaitingMyApproval")}
          </label>
        )}
        <Button type="submit" size="sm" icon={Search}>
          {t("search")}
        </Button>
      </form>

      <DataTable
        columns={columns}
        rows={data.items}
        rowKey={(a) => a.id}
        isLoading={loading}
        title={t("applicationsTitle")}
        emptyTitle={t("noApplications")}
        emptyDescription={t("noApplicationsHint")}
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

      {adding && (
        <ApplicationForm
          onClose={() => setAdding(false)}
          onSaved={(a) => {
            setAdding(false);
            if (a?.id) setOpenId(a.id);
            else void load();
          }}
        />
      )}
    </div>
  );
}

const BLOCKING = ["DISCLOSURE_NOT_ACCEPTED", "CREDIT_CHECK", "COLLATERAL"];

// One application: the offer, the readiness checklist, and tabs for credit
// checks, collateral, approvals, fees and history. Buttons follow
// `actions`; "Create loan" turns an approved one into a loan.
function ApplicationView({ id, onBack }) {
  const { t } = useTranslation(["loans", "common"]);
  const can = usePagePermission();
  const canFacility = useMenuPermission("Loan Facilities");
  const [app, setApp] = useState(null);
  const [tab, setTab] = useState("offer");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lists, setLists] = useState(null);

  const reload = useCallback(async () => {
    try {
      setApp(recordOf(await loanApplicationsApi.get({ id })));
    } catch (error) {
      notifications.error(error.message);
    }
  }, [id]);
  useEffect(() => {
    void reload();
  }, [reload]);
  // The open record: reload when the push names it, or names nothing.
  useLiveChannel("/config/loan/application/list", (_action, records) => (!records.length || records.some((r) => String(r.id) === String(id))) && void reload());

  // The form lists (credit check types and outcomes, collateral types) come
  // with the borrower's options.
  const ownerKind = app?.owner?.kind;
  const ownerId = app?.owner?.id;
  useEffect(() => {
    if (!ownerKind || !ownerId) return;
    loanApplicationsApi
      .options({ entity_type: ownerKind, entity_id: ownerId })
      .then((r) => setLists(rowsOf(r)[0] ?? {}))
      .catch(() => setLists({}));
  }, [ownerKind, ownerId]);

  // Every action replies with the application; it replaces what is shown.
  const act = async (verb, body = {}) => {
    setBusy(true);
    try {
      const response = await loanApplicationsApi[verb]({ id, ...body });
      const next = recordOf(response);
      if (next?.application_number) setApp(next);
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

  const createLoan = async (narration) => {
    setBusy(true);
    try {
      const response = await loanFacilitiesApi.create({ loan_application_id: id, ...(narration ? { narration } : {}) });
      notifications.success(response?.message ?? t("loanCreated"));
      setDialog(null);
      await reload();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!app) {
    return (
      <PageSkeleton />
    );
  }

  const a = app.actions ?? {};
  const cur = app.currency_alpha_code;
  const r = app.readiness ?? {};
  const ask = (key) => () => setDialog(key);
  const buttons = [
    a.edit && can("Edit") && { key: "edit", label: t("edit"), icon: Pencil, run: ask("edit") },
    a.accept && can("Edit") && { key: "accept", label: t("recordAcceptance"), icon: FileCheck2, variant: "outline", run: ask("accept") },
    a.credit_check && can("Edit") && { key: "credit_check", label: t("addCreditCheck"), icon: ShieldCheck, run: ask("credit_check") },
    a.collateral && can("Edit") && { key: "collateral", label: t("addCollateral"), icon: Plus, run: ask("collateral") },
    a.withdraw && can("Delete") && { key: "withdraw", label: t("withdraw"), icon: Ban, run: ask("withdraw") },
    a.request_info && can("Authorize") && { key: "request_info", label: t("requestInfo"), icon: MessageSquareWarning, run: ask("request_info") },
    a.decline && can("Authorize") && { key: "decline", label: t("decline"), icon: XCircle, variant: "danger", run: ask("decline") },
    a.approve && can("Authorize") && { key: "approve", label: t("approve"), icon: CheckCircle2, variant: "primary", run: ask("approve") },
    a.create_facility && canFacility("Add") && { key: "create", label: t("createLoan"), icon: HandCoins, variant: "primary", run: ask("create") },
  ];
  const open = !["APPROVED", "DECLINED", "WITHDRAWN", "CONVERTED"].includes(app.status);

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {t("backToApplications")}
      </button>

      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-black text-foreground">{app.application_number}</h1>
              <StatusBadge status={app.status} />
              {app.facility && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                  {app.facility.facility_number} · {loanLabel(t, app.facility.status)}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {app.owner?.name} <span className="ml-1 text-xs font-medium text-muted-foreground">{loanLabel(t, app.owner?.kind)}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {app.product_name} · {app.requested_term_value} {loanLabel(t, app.requested_term_unit)} · {loanLabel(t, app.purpose_code)} · {loanLabel(t, app.application_channel)} · {app.inst_profile_name}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="amount-fit text-xl font-black tabular-nums sm:text-2xl">{money(app.requested_amount, cur)}</p>
            <p className="text-sm font-bold text-primary">{t("rateAYear", { rate: ratePct(app.annual_rate) })}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {open ? <Readiness readiness={r} /> : <span />}
          <ActionButtons buttons={buttons} busy={busy} />
        </div>
        {app.status === "MORE_INFORMATION_REQUIRED" && <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">{t("moreInfoHint")}</p>}
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "offer" },
          { key: "credit_checks", count: app.credit_checks?.length },
          { key: "collateral", count: app.collateral?.length },
          { key: "approvals", count: app.approvals?.length },
          { key: "fees", count: app.fees_charged?.length },
          { key: "history" },
        ]}
      />

      {tab === "offer" && (app.disclosure ? <Disclosure disclosure={app.disclosure} eligibility={app.eligibility} /> : <p className="text-sm text-muted-foreground">{t("nothingYet")}</p>)}
      {tab === "credit_checks" && (
        <MiniTable
          rows={app.credit_checks}
          columns={[
            { key: "check_type", label: t("checkType"), render: (c) => loanLabel(t, c.check_type) },
            { key: "provider_code", label: t("provider") },
            { key: "outcome", label: t("outcome"), render: (c) => <span className={cn("font-bold", c.outcome === "CLEAR" ? "text-emerald-700" : c.outcome === "ADVERSE" || c.outcome === "ERROR" ? "text-red-700" : "text-amber-700")}>{loanLabel(t, c.outcome)}</span> },
            { key: "score", label: t("score"), align: "right" },
            { key: "response_reference", label: t("reference"), render: (c) => c.response_reference ?? c.request_reference ?? "—" },
            { key: "recorded_by", label: t("recordedBy"), render: (c) => `${c.recorded_by} · ${accountDate(c.completed_time ?? c.requested_time)}` },
            { key: "notes", label: t("notes"), render: (c) => c.notes || "—" },
          ]}
        />
      )}
      {tab === "collateral" && (
        <div className="grid gap-2">
          {app.eligibility?.collateral_required && (
            <p className="text-xs text-muted-foreground">
              {t("collateralProgress", { have: money(r.collateral_accepted_value, cur), need: money(app.eligibility.minimum_collateral, cur) })}
            </p>
          )}
          <CollateralTable rows={app.collateral} currency={cur} onRemove={a.collateral && can("Edit") ? (c) => setDialog({ remove: c }) : null} />
        </div>
      )}
      {tab === "approvals" && (
        <div className="grid gap-3">
          <p className="text-xs text-muted-foreground">{t("approvalsProgress", { have: r.approvals ?? 0, need: r.required_approvals ?? app.required_approvals ?? 1, round: app.approval_round ?? 1 })}</p>
          <MiniTable rows={app.approvals} rowKey={(x, i) => `${x.approver_userid}-${i}`} columns={[{ key: "approver", label: t("approver") }, { key: "approved_time", label: t("when"), render: (x) => accountDate(x.approved_time) }, { key: "narration", label: t("narration"), render: (x) => x.narration || "—" }]} />
          <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("decisions")}</p>
          <MiniTable
            rows={app.decisions}
            rowKey={(x) => x.decision_sequence}
            columns={[
              { key: "decision", label: t("decision"), render: (x) => <b>{loanLabel(t, x.decision)}</b> },
              { key: "approved_amount", label: t("amount"), render: (x) => (x.approved_amount != null ? money(x.approved_amount, cur) : "—") },
              { key: "decision_reasons", label: t("reasons"), render: (x) => x.decision_reasons?.join(", ") || "—" },
              { key: "decided_by", label: t("decidedBy"), render: (x) => `${x.decided_by} · ${accountDate(x.decided_time)}` },
            ]}
          />
        </div>
      )}
      {tab === "fees" && <FeesTable rows={app.fees_charged} currency={cur} />}
      {tab === "history" && <Timeline events={app.events} currency={cur} />}

      {dialog === "edit" && <ApplicationForm application={app} onClose={() => setDialog(null)} onSaved={(next) => (next?.application_number ? (setApp(next), setDialog(null)) : (setDialog(null), void reload()))} />}
      {["approve", "withdraw", "create"].includes(dialog) && (
        <NarrationDialog
          title={t(`appConfirm_${dialog}`)}
          hint={t(`appConfirmHint_${dialog}`, { amount: money(app.requested_amount, cur) })}
          confirmLabel={t(dialog === "create" ? "createLoan" : dialog)}
          variant={dialog === "withdraw" ? "danger" : "primary"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => (dialog === "create" ? createLoan(narration) : act(dialog, narration ? { narration } : {}))}
        />
      )}
      {dialog === "accept" && <OneFieldDialog title={t("recordAcceptance")} hint={t("acceptHint")} label={t("consentReference")} placeholder="SIGNED-OFFER-123" busy={busy} onClose={() => setDialog(null)} onSave={(v) => act("accept", { consent_reference: v })} />}
      {dialog === "request_info" && <OneFieldDialog title={t("requestInfo")} hint={t("requestInfoHint")} label={t("messageToStaff")} multiline busy={busy} onClose={() => setDialog(null)} onSave={(v) => act("request_info", { message: v })} />}
      {dialog === "decline" && <OneFieldDialog title={t("decline")} hint={t("declineHint")} label={t("declineReasons")} multiline danger busy={busy} onClose={() => setDialog(null)} onSave={(v) => act("decline", { reasons: v.split("\n").map((x) => x.trim()).filter(Boolean) })} />}
      {dialog === "credit_check" && lists && <CreditCheckDialog lists={lists} busy={busy} onClose={() => setDialog(null)} onSave={(body) => act("credit_check", body)} />}
      {dialog === "collateral" && lists && <CollateralDialog lists={lists} types={app.eligibility?.accepted_collateral_types} busy={busy} currency={cur} onClose={() => setDialog(null)} onSave={(body) => act("collateral_add", body)} />}
      {dialog?.remove && (
        <NarrationDialog title={t("removeCollateral")} hint={t("removeCollateralHint", { name: dialog.remove.description })} confirmLabel={t("remove")} variant="danger" busy={busy} onClose={() => setDialog(null)} onSave={() => act("collateral_remove", { collateral_id: dialog.remove.id })} />
      )}
    </div>
  );
}

// What still blocks approval: the offer, the credit check, the collateral.
function Readiness({ readiness: r }) {
  const { t } = useTranslation("loans");
  const blocking = r.blocking ?? [];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {BLOCKING.map((key) => {
        const ok = !blocking.includes(key);
        const Icon = ok ? CheckCircle2 : Circle;
        return (
          <span key={key} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold", ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-900")}>
            <Icon size={12} /> {t(`ready_${key}`)}
          </span>
        );
      })}
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold", (r.approvals ?? 0) >= (r.required_approvals ?? 1) ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700")}>
        <ClipboardCheck size={12} /> {t("approvalsN", { have: r.approvals ?? 0, need: r.required_approvals ?? 1 })}
      </span>
    </div>
  );
}

const pick = (f) => Object.fromEntries(Object.entries(f).filter(([, v]) => String(v ?? "").trim() !== "").map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));

function CreditCheckDialog({ lists, busy, onClose, onSave }) {
  const { t } = useTranslation("loans");
  return (
    <FormDialog
      title={t("addCreditCheck")}
      hint={t("creditCheckHint")}
      busy={busy}
      onClose={onClose}
      onSave={onSave}
      initial={{ check_type: lists.credit_check_types?.[0], outcome: lists.credit_check_outcomes?.[0] }}
      required={["check_type", "provider_code", "outcome"]}
      toBody={(f) => ({ ...pick(f), ...(f.score ? { score: Number(f.score) } : {}) })}
      fields={[
        { key: "check_type", label: t("checkType"), type: "select", options: lists.credit_check_types ?? [] },
        { key: "provider_code", label: t("provider"), placeholder: "BUREAU_X" },
        { key: "outcome", label: t("outcome"), type: "select", options: lists.credit_check_outcomes ?? [] },
        { key: "score", label: t("score"), type: "int" },
        { key: "request_reference", label: t("requestReference") },
        { key: "response_reference", label: t("responseReference") },
        { key: "consent_reference", label: t("consentReference") },
        { key: "notes", label: t("notes") },
      ]}
    />
  );
}

function CollateralDialog({ types, lists, currency, busy, onClose, onSave }) {
  const { t } = useTranslation("loans");
  // The product's accepted types when it names some, else every type.
  const list = types?.length ? types : (lists.collateral_types ?? []);
  return (
    <FormDialog
      title={t("addCollateral")}
      busy={busy}
      onClose={onClose}
      onSave={onSave}
      initial={{ collateral_type: list[0] }}
      required={["collateral_type", "description", "declared_value", "accepted_value"]}
      toBody={pick}
      problem={(f) => (Number(f.accepted_value) > Number(f.declared_value) ? t("acceptedOverDeclared") : "")}
      fields={[
        { key: "collateral_type", label: t("type"), type: "select", options: list },
        { key: "description", label: t("description") },
        { key: "declared_value", label: t("declaredValueIn", { currency }), type: "amount" },
        { key: "accepted_value", label: t("acceptedValueIn", { currency }), type: "amount" },
        { key: "owner_name", label: t("ownerName") },
        { key: "valuation_date", label: t("valuationDate"), type: "date" },
        { key: "registry_reference", label: t("registryReference") },
        { key: "lien_reference", label: t("lienReference") },
      ]}
    />
  );
}
