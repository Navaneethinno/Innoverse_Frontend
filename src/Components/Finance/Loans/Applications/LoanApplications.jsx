import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileCheck2,
  FileSignature,
  HandCoins,
  MessageSquareWarning,
  Pencil,
  Plus,
  ScanSearch,
  ShieldCheck,
  UserPlus,
  XCircle,
} from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { RowActions } from "@/Components/Common/RowActions";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { accountDate, money } from "@/Components/Finance/Accounts/accountShared";
import { useMenuPermission, usePagePermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { loanApplicationsApi, loanFacilitiesApi, recordOf } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ActionButtons, NarrationDialog, ratePct } from "../../Deposits/depositShared";
import { Tabs, Timeline, loanLabel } from "../loanShared";
import { ApplicationForm, Disclosure } from "./ApplicationForm";
import { BureauCheckDialog, BureauReport, GuarantorDialog, Guarantors } from "./Guarantors";
import { CollateralTable, FeesTable, FormDialog, OneFieldDialog } from "../loanDialogs";
import { useLiveChannel } from "@/Hooks/useLiveChannel";

// LOANS > Loan Applications (menu 186): staff apply for a borrower, record
// the offer's acceptance, credit checks and collateral, and approve. An
// "Awaiting my approval" view lists what the caller can still approve.
export function LoanApplications() {
  const { t } = useTranslation(["loans", "common"]);
  const can = usePagePermission();
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);

  const list = useServerList({ api: loanApplicationsApi.listPath, call: loanApplicationsApi.list });

  const load = list.reload;
  useLiveChannel("/config/loan/application/list", () => load());

  if (openId) {
    return (
      <ApplicationView
        id={openId}
        onBack={() => {
          setOpenId(null);
          load();
        }}
      />
    );
  }

  const columns = [
    {
      key: "application_number",
      label: t("application"),
      render: (a) => (
        <button
          type="button"
          onClick={() => setOpenId(a.id)}
          className="font-mono text-xs font-bold text-primary hover:underline"
        >
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
    {
      key: "product_name",
      label: t("product"),
      render: (a) => (
        <span className="text-xs">
          {a.product_name} · {a.requested_term_value} {loanLabel(t, a.requested_term_unit)}
        </span>
      ),
    },
    {
      key: "requested_amount",
      label: t("amount"),
      render: (a) => (
        <span className="whitespace-nowrap text-xs font-bold tabular-nums">
          {money(a.requested_amount, a.currency_alpha_code)}
        </span>
      ),
    },
    {
      key: "annual_rate",
      label: t("rate"),
      render: (a) => (
        <span className="text-xs font-semibold text-primary">{ratePct(a.annual_rate)}</span>
      ),
    },
    {
      key: "status",
      label: t("status"),
      render: (a) => <StatusBadge status={a.status} variant="subtle" />,
    },
    {
      key: "submitted_time",
      label: t("submittedAt"),
      render: (a) => (
        <span className="whitespace-nowrap text-xs">{accountDate(a.submitted_time)}</span>
      ),
    },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (a) => <RowActions buttons={{ view: true }} onView={() => setOpenId(a.id)} />,
    },
  ];

  const listActions = (
    <>
      {can("Add") && (
        <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
          {t("newApplication")}
        </Button>
      )}
    </>
  );

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <FileSignature size={22} className="text-primary" /> {t("applicationsTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("applicationsSubtitle")}</p>
        </div>
      </div>

      <ListTable
        list={list}
        actions={listActions}
        columns={columns}
        rowKey={(a) => a.id}
        title={t("applicationsTitle")}
        emptyTitle={t("noApplications")}
        emptyDescription={t("noApplicationsHint")}
      />

      {adding && (
        <ApplicationForm
          onClose={() => setAdding(false)}
          onSaved={(a) => {
            setAdding(false);
            if (a?.id) setOpenId(a.id);
            else load();
          }}
        />
      )}
    </div>
  );
}

const BLOCKING = ["DISCLOSURE_NOT_ACCEPTED", "CREDIT_CHECK", "COLLATERAL"];
// Shown only when the product asks for them.
const OPTIONAL_BLOCKING = {
  GUARANTORS: (e) => Number(e?.guarantors_required) > 0,
  CREDIT_BUREAU: (e) => Boolean(e?.bureau_required),
};

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
  const [report, setReport] = useState(null);

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
  useLiveChannel(
    "/config/loan/application/list",
    (_action, records) =>
      (!records.length || records.some((r) => String(r.id) === String(id))) && void reload(),
  );

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
      // The bureau check replies { report, application }.
      if (next?.report) setReport(next.report);
      if (next?.application?.application_number) setApp(next.application);
      else if (next?.application_number) setApp(next);
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
      const response = await loanFacilitiesApi.create({
        loan_application_id: id,
        ...(narration ? { narration } : {}),
      });
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
    return <PageSkeleton />;
  }

  const a = app.actions ?? {};
  const cur = app.currency_alpha_code;
  const r = app.readiness ?? {};
  const ask = (key) => () => setDialog(key);
  const buttons = [
    a.edit && can("Edit") && { key: "edit", label: t("edit"), icon: Pencil, run: ask("edit") },
    a.accept &&
      can("Edit") && {
        key: "accept",
        label: t("recordAcceptance"),
        icon: FileCheck2,
        variant: "outline",
        run: ask("accept"),
      },
    a.credit_check &&
      can("Edit") && {
        key: "credit_check",
        label: t("addCreditCheck"),
        icon: ShieldCheck,
        run: ask("credit_check"),
      },
    a.collateral &&
      can("Edit") && {
        key: "collateral",
        label: t("addCollateral"),
        icon: Plus,
        run: ask("collateral"),
      },
    a.guarantors &&
      can("Edit") && {
        key: "guarantor",
        label: t("addGuarantor"),
        icon: UserPlus,
        run: ask("guarantor"),
      },
    a.bureau_check &&
      can("Edit") && {
        key: "bureau",
        label: t("bureauCheck"),
        icon: ScanSearch,
        run: ask("bureau"),
      },
    a.withdraw &&
      can("Delete") && { key: "withdraw", label: t("withdraw"), icon: Ban, run: ask("withdraw") },
    a.request_info &&
      can("Authorize") && {
        key: "request_info",
        label: t("requestInfo"),
        icon: MessageSquareWarning,
        run: ask("request_info"),
      },
    a.decline &&
      can("Authorize") && {
        key: "decline",
        label: t("decline"),
        icon: XCircle,
        variant: "danger",
        run: ask("decline"),
      },
    a.approve &&
      can("Authorize") && {
        key: "approve",
        label: t("approve"),
        icon: CheckCircle2,
        variant: "primary",
        run: ask("approve"),
      },
    a.create_facility &&
      canFacility("Add") && {
        key: "create",
        label: t("createLoan"),
        icon: HandCoins,
        variant: "primary",
        run: ask("create"),
      },
  ];
  const open = !["APPROVED", "DECLINED", "WITHDRAWN", "CONVERTED"].includes(app.status);

  return (
    <div className="pb-8 pt-4">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={15} /> {t("backToApplications")}
      </button>

      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-black text-foreground">
                {app.application_number}
              </h1>
              <StatusBadge status={app.status} />
              {app.facility && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                  {app.facility.facility_number} · {loanLabel(t, app.facility.status)}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {app.owner?.name}{" "}
              <span className="ml-1 text-xs font-medium text-muted-foreground">
                {loanLabel(t, app.owner?.kind)}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {app.product_name} · {app.inst_profile_name}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="amount-fit text-xl font-black tabular-nums sm:text-2xl">
              {money(app.requested_amount, cur)}
            </p>
            <p className="text-sm font-bold text-primary">
              {t("rateAYear", { rate: ratePct(app.annual_rate) })}
            </p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            ["term", `${app.requested_term_value} ${loanLabel(t, app.requested_term_unit)}`],
            ["purpose", loanLabel(t, app.purpose_code)],
            ["channel", loanLabel(t, app.application_channel)],
            ["submittedAt", accountDate(app.submitted_time)],
            ["round", app.approval_round ?? 1],
            app.microfinance?.branch_name && ["branch", app.microfinance.branch_name],
            app.microfinance?.officer_name && ["loanOfficer", app.microfinance.officer_name],
            app.microfinance?.group_code && [
              "borrowerGroup",
              [app.microfinance.group_code, app.microfinance.group_name]
                .filter(Boolean)
                .join(" · "),
            ],
            app.microfinance?.refinance_facility_number && [
              "topUpOf",
              app.microfinance.refinance_facility_number,
            ],
            app.microfinance?.savings_acct_num && [
              "savingsWallet",
              app.microfinance.savings_acct_num,
            ],
          ]
            .filter(Boolean)
            .map(([key, value]) => (
              <div key={key} className="rounded-xl bg-muted/50 px-3 py-2">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t(key === "round" ? "approvalRoundLabel" : key)}
                </dt>
                <dd className="mt-0.5 truncate text-sm font-semibold text-foreground">
                  {value || "—"}
                </dd>
              </div>
            ))}
        </dl>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          {open ? <Readiness readiness={r} eligibility={app.eligibility} /> : <span />}
          <ActionButtons buttons={buttons} busy={busy} />
        </div>
        {app.status === "MORE_INFORMATION_REQUIRED" && (
          <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">
            {t("moreInfoHint")}
          </p>
        )}
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "offer" },
          { key: "credit_checks", count: app.credit_checks?.length },
          { key: "collateral", count: app.collateral?.length },
          (app.guarantors?.length > 0 || a.guarantors) && {
            key: "guarantors",
            count: app.guarantors?.filter((g) => g.status !== "REMOVED").length,
          },
          { key: "approvals", count: app.approvals?.length },
          { key: "fees", count: app.fees_charged?.length },
          { key: "history" },
        ].filter(Boolean)}
      />

      {tab === "offer" &&
        (app.disclosure ? (
          <Disclosure disclosure={app.disclosure} eligibility={app.eligibility} />
        ) : (
          <p className="text-sm text-muted-foreground">{t("nothingYet")}</p>
        ))}
      {tab === "credit_checks" && <CreditChecks rows={app.credit_checks} />}
      {tab === "collateral" && (
        <div className="grid gap-2">
          {app.eligibility?.collateral_required && (
            <Coverage
              have={r.collateral_accepted_value}
              need={app.eligibility.minimum_collateral}
              currency={cur}
            />
          )}
          <CollateralTable
            rows={app.collateral}
            currency={cur}
            onRemove={a.collateral && can("Edit") ? (c) => setDialog({ remove: c }) : null}
          />
        </div>
      )}
      {tab === "guarantors" && (
        <Guarantors
          rows={app.guarantors}
          readiness={r}
          required={app.eligibility?.guarantors_required}
          currency={cur}
          onRemove={a.guarantors && can("Edit") ? (g) => setDialog({ removeGuarantor: g }) : null}
        />
      )}
      {tab === "approvals" && <ApprovalsPanel app={app} readiness={r} currency={cur} />}
      {tab === "fees" && <FeesTable rows={app.fees_charged} currency={cur} />}
      {tab === "history" && <Timeline events={app.events} currency={cur} />}

      {dialog === "edit" && (
        <ApplicationForm
          application={app}
          onClose={() => setDialog(null)}
          onSaved={(next) =>
            next?.application_number
              ? (setApp(next), setDialog(null))
              : (setDialog(null), void reload())
          }
        />
      )}
      {["approve", "withdraw", "create"].includes(dialog) && (
        <NarrationDialog
          title={t(`appConfirm_${dialog}`)}
          hint={t(`appConfirmHint_${dialog}`, { amount: money(app.requested_amount, cur) })}
          confirmLabel={t(dialog === "create" ? "createLoan" : dialog)}
          variant={dialog === "withdraw" ? "danger" : "primary"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) =>
            dialog === "create"
              ? createLoan(narration)
              : act(dialog, narration ? { narration } : {})
          }
        />
      )}
      {dialog === "accept" && (
        <OneFieldDialog
          title={t("recordAcceptance")}
          hint={t("acceptHint")}
          label={t("consentReference")}
          placeholder="SIGNED-OFFER-123"
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(v) => act("accept", { consent_reference: v })}
        />
      )}
      {dialog === "request_info" && (
        <OneFieldDialog
          title={t("requestInfo")}
          hint={t("requestInfoHint")}
          label={t("messageToStaff")}
          multiline
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(v) => act("request_info", { message: v })}
        />
      )}
      {dialog === "decline" && (
        <OneFieldDialog
          title={t("decline")}
          hint={t("declineHint")}
          label={t("declineReasons")}
          multiline
          danger
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(v) =>
            act("decline", {
              reasons: v
                .split("\n")
                .map((x) => x.trim())
                .filter(Boolean),
            })
          }
        />
      )}
      {dialog === "credit_check" && lists && (
        <CreditCheckDialog
          lists={lists}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(body) => act("credit_check", body)}
        />
      )}
      {dialog === "collateral" && lists && (
        <CollateralDialog
          lists={lists}
          types={app.eligibility?.accepted_collateral_types}
          busy={busy}
          currency={cur}
          onClose={() => setDialog(null)}
          onSave={(body) => act("collateral_add", body)}
        />
      )}
      {dialog === "guarantor" && (
        <GuarantorDialog
          currency={cur}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(body) => act("guarantor_add", body)}
        />
      )}
      {dialog === "bureau" && (
        <BureauCheckDialog
          corporate={!String(app.owner?.kind ?? "").endsWith("INDV")}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(body) => act("bureau_check", body)}
        />
      )}
      {dialog?.removeGuarantor && (
        <NarrationDialog
          title={t("removeGuarantor")}
          hint={t("removeGuarantorHint", {
            name: dialog.removeGuarantor.name ?? dialog.removeGuarantor.full_name,
          })}
          confirmLabel={t("remove")}
          variant="danger"
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={() => act("guarantor_remove", { guarantor_id: dialog.removeGuarantor.id })}
        />
      )}
      {report && <BureauReport report={report} currency={cur} onClose={() => setReport(null)} />}
      {dialog?.remove && (
        <NarrationDialog
          title={t("removeCollateral")}
          hint={t("removeCollateralHint", { name: dialog.remove.description })}
          confirmLabel={t("remove")}
          variant="danger"
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={() => act("collateral_remove", { collateral_id: dialog.remove.id })}
        />
      )}
    </div>
  );
}

const OUTCOME_TONE = {
  CLEAR:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  ADVERSE:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
  ERROR:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
};

// Each credit check as a card: what was checked, by whom, the outcome.
function CreditChecks({ rows }) {
  const { t } = useTranslation("loans");
  if (!rows?.length)
    return (
      <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        {t("nothingYet")}
      </p>
    );
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {rows.map((c, i) => (
        <div key={c.id ?? i} className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">{loanLabel(t, c.check_type)}</p>
              <p className="text-[11px] text-muted-foreground">
                {[c.provider_code, c.response_reference ?? c.request_reference]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-black",
                OUTCOME_TONE[c.outcome] ??
                  "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
              )}
            >
              {loanLabel(t, c.outcome)}
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              {c.recorded_by} · {accountDate(c.completed_time ?? c.requested_time)}
            </p>
            {c.score != null && c.score !== "" && (
              <p className="text-right">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("score")}
                </span>
                <span className="text-lg font-black tabular-nums text-foreground">{c.score}</span>
              </p>
            )}
          </div>
          {c.notes && (
            <p className="mt-2 rounded-lg bg-muted/60 px-2 py-1 text-xs text-foreground">
              {c.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// Accepted collateral against what the product needs, as a bar.
function Coverage({ have, need, currency }) {
  const { t } = useTranslation("loans");
  const share = Number(need) > 0 ? Math.min(100, (Number(have || 0) / Number(need)) * 100) : 100;
  const done = share >= 100;
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="font-bold text-foreground">{t("collateralCoverage")}</span>
        <span className="tabular-nums text-muted-foreground">
          {t("collateralProgress", {
            have: money(have ?? 0, currency),
            need: money(need, currency),
          })}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            done ? "bg-emerald-500" : "bg-amber-500",
          )}
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  );
}

const DECISION_TONE = {
  APPROVE:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  DECLINE:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
};
const initials = (name) =>
  String(name ?? "?")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

// Approvals: progress towards the approvals needed (this round), who
// approved, and the decisions taken.
function ApprovalsPanel({ app, readiness: r, currency }) {
  const { t } = useTranslation("loans");
  const have = Number(r.approvals ?? app.approvals?.length ?? 0);
  const need = Math.max(1, Number(r.required_approvals ?? app.required_approvals ?? 1));
  const done = have >= need;
  const approvals = app.approvals ?? [];
  const decisions = [...(app.decisions ?? [])].sort(
    (a, b) => Number(b.decision_sequence) - Number(a.decision_sequence),
  );
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                done
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"
                  : "bg-amber-50 text-amber-600 dark:bg-amber-500/10",
              )}
            >
              {done ? <CheckCircle2 size={20} /> : <ShieldCheck size={20} />}
            </span>
            <div>
              <p className="text-sm font-black text-foreground">
                {t("approvalsCount", { have, need })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("approvalRound", { round: app.approval_round ?? 1 })}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
              done
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200",
            )}
          >
            {done ? t("approvalsComplete") : t("approvalsWaiting", { count: need - have })}
          </span>
        </div>
        <div className="mt-3 flex gap-1" aria-hidden="true">
          {Array.from({ length: need }, (_, i) => (
            <span
              key={i}
              className={cn("h-1.5 flex-1 rounded-full", i < have ? "bg-emerald-500" : "bg-muted")}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          {t("approvers")}
        </p>
        {approvals.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {approvals.map((x, i) => (
              <div
                key={`${x.approver_userid}-${i}`}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-black text-primary">
                  {initials(x.approver)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                    {x.approver} <CheckCircle2 size={14} className="text-emerald-600" />
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {accountDate(x.approved_time)}
                  </p>
                  {x.narration && (
                    <p className="mt-1 rounded-lg bg-muted/60 px-2 py-1 text-xs text-foreground">
                      {x.narration}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            {t("noApprovalsYet")}
          </p>
        )}
      </div>

      {decisions.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            {t("decisions")}
          </p>
          <div className="grid gap-2">
            {decisions.map((x) => (
              <div
                key={x.decision_sequence}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-black",
                      DECISION_TONE[x.decision] ?? "border-border bg-muted text-foreground",
                    )}
                  >
                    {loanLabel(t, x.decision)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">
                      {x.decided_by} · {accountDate(x.decided_time)}
                    </p>
                    {x.decision_reasons?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {x.decision_reasons.map((reason) => (
                          <span
                            key={reason}
                            className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {x.approved_amount != null && (
                  <span className="text-base font-black tabular-nums text-foreground">
                    {money(x.approved_amount, currency)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// What still blocks approval: the offer, the credit check, the collateral.
function Readiness({ readiness: r, eligibility }) {
  const { t } = useTranslation("loans");
  const blocking = r.blocking ?? [];
  const keys = [
    ...BLOCKING,
    ...Object.keys(OPTIONAL_BLOCKING).filter(
      (k) => blocking.includes(k) || OPTIONAL_BLOCKING[k](eligibility),
    ),
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {keys.map((key) => {
        const ok = !blocking.includes(key);
        const Icon = ok ? CheckCircle2 : Circle;
        return (
          <span
            key={key}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
              ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-900",
            )}
          >
            <Icon size={12} /> {t(`ready_${key}`)}
          </span>
        );
      })}
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
          (r.approvals ?? 0) >= (r.required_approvals ?? 1)
            ? "bg-emerald-50 text-emerald-700"
            : "bg-blue-50 text-blue-700",
        )}
      >
        <ClipboardCheck size={12} />{" "}
        {t("approvalsN", { have: r.approvals ?? 0, need: r.required_approvals ?? 1 })}
      </span>
    </div>
  );
}

const pick = (f) =>
  Object.fromEntries(
    Object.entries(f)
      .filter(([, v]) => String(v ?? "").trim() !== "")
      .map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]),
  );

function CreditCheckDialog({ lists, busy, onClose, onSave }) {
  const { t } = useTranslation("loans");
  return (
    <FormDialog
      title={t("addCreditCheck")}
      hint={t("creditCheckHint")}
      busy={busy}
      onClose={onClose}
      onSave={onSave}
      initial={{
        check_type: lists.credit_check_types?.[0],
        outcome: lists.credit_check_outcomes?.[0],
      }}
      required={["check_type", "provider_code", "outcome"]}
      toBody={(f) => ({ ...pick(f), ...(f.score ? { score: Number(f.score) } : {}) })}
      fields={[
        {
          key: "check_type",
          label: t("checkType"),
          type: "select",
          options: lists.credit_check_types ?? [],
        },
        { key: "provider_code", label: t("provider"), placeholder: "BUREAU_X" },
        {
          key: "outcome",
          label: t("outcome"),
          type: "select",
          options: lists.credit_check_outcomes ?? [],
        },
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
      problem={(f) =>
        Number(f.accepted_value) > Number(f.declared_value) ? t("acceptedOverDeclared") : ""
      }
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
