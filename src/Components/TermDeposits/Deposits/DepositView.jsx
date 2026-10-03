import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Ban, CheckCircle2, Compass, Eye, Hourglass, Link2, ScrollText, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { Spinner } from "@/Components/Common/Spinner";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { AccountStatement, TxnDetail, TxnDialog } from "@/Components/Epurse/Accounts/AccountStatement";
import { accountDate, money } from "@/Components/Epurse/Accounts/accountShared";
import { useMenuPermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { depositsApi } from "@/Services/TermDeposits/termDeposits.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ActionButtons, Facts, NarrationDialog, Section, dayDate, inputClass, labelClass, ratePct } from "../depositShared";
import { earlyText, optionLabel } from "../DepositProducts/productShared";

const TABS = ["summary", "interest", "history", "transactions"];
const INSTRUCTIONS = ["PAYOUT", "RENEW_PRINCIPAL", "RENEW_PRINCIPAL_AND_INTEREST", "HOLD"];
const EVENT_TONE = {
  FUNDED: "bg-emerald-500",
  RENEWED: "bg-emerald-500",
  SETTLED: "bg-emerald-500",
  REJECTED: "bg-red-500",
  CLOSURE_REJECTED: "bg-red-500",
  CLOSED_EARLY: "bg-orange-500",
  CANCELLED: "bg-slate-400",
  CLOSURE_CANCELLED: "bg-slate-400",
  MATURED: "bg-blue-500",
};

// One deposit: header with the buttons `actions` allows, then Summary,
// Interest (day-by-day accruals), History (events) and Transactions.
// `embedded` hides the back link (inside a customer's detail).
export function DepositView({ id: initialId, onBack, embedded = false }) {
  const { t } = useTranslation(["deposits", "accounts", "common"]);
  // By name: the view also opens inside a customer's detail (another menu).
  const can = useMenuPermission("Deposits");
  const [id, setId] = useState(initialId);
  const [deposit, setDeposit] = useState(null);
  const [tab, setTab] = useState("summary");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [statement, setStatement] = useState(null);

  const reload = useCallback(async () => {
    try {
      setDeposit(rowsOf(await depositsApi.get({ id }))[0] ?? null);
    } catch (error) {
      notifications.error(error.message);
    }
  }, [id]);
  useEffect(() => {
    setDeposit(null);
    void reload();
  }, [reload]);

  // Every action replies with the deposit; it replaces what is shown.
  const act = async (verb, body = {}) => {
    setBusy(true);
    try {
      const response = await depositsApi[verb]({ id, ...body });
      const next = rowsOf(response)[0];
      if (next?.reference_no) setDeposit(next);
      else await reload();
      if (response?.message) notifications.success(response.message);
      setDialog(null);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!deposit) {
    return (
      <div className="flex items-center gap-2 pt-10 text-sm text-muted-foreground">
        <Spinner size={16} /> {t("loading")}
      </div>
    );
  }

  const a = deposit.actions ?? {};
  const ask = (key) => () => setDialog(key);
  const buttons = [
    a.cancel && can("Delete") && { key: "cancel", label: t("withdrawRequest"), icon: Ban, run: ask("cancel") },
    a.deauth && can("Authorize") && { key: "deauth", label: t("reject"), icon: XCircle, variant: "danger", run: ask("deauth") },
    a.auth && can("Authorize") && { key: "auth", label: t("approveAndFund"), icon: CheckCircle2, variant: "primary", run: ask("auth") },
    a.instruct && can("Authorize") && { key: "instruct", label: deposit.status === "MATURED" ? t("settleNow") : t("changeInstruction"), icon: Compass, variant: deposit.status === "MATURED" ? "primary" : "secondary", run: ask("instruct") },
    a.preclose && can("Add") && { key: "preclose", label: t("closeEarly"), icon: Hourglass, variant: "outline", run: ask("preclose") },
    a.preclose_cancel && can("Add") && { key: "preclose_cancel", label: t("withdrawClosure"), icon: Ban, run: ask("preclose_cancel") },
    a.preclose_deauth && can("Authorize") && { key: "preclose_deauth", label: t("rejectClosure"), icon: XCircle, variant: "danger", run: ask("preclose_deauth") },
    a.preclose_auth && can("Authorize") && { key: "preclose_auth", label: t("approveClosure"), icon: CheckCircle2, variant: "primary", run: ask("preclose_auth") },
  ];
  const cur = deposit.currency_code;
  const owner = deposit.owner ?? {};
  const depositAccount = deposit.deposit_acct_id ? { id: deposit.deposit_acct_id, acct_num: deposit.deposit_number, owner } : null;
  const payoutAccount = deposit.payout_acct_id ? { id: deposit.payout_acct_id, acct_num: deposit.payout_acct_num, owner } : null;

  return (
    <div className={embedded ? "" : "pb-8 pt-4"}>
      {!embedded && (
        <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft size={15} /> {t("backToDeposits")}
        </button>
      )}

      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-black text-foreground">{deposit.reference_no}</h1>
              <StatusBadge status={deposit.status} />
              {deposit.renewal_sequence > 0 && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">{t("renewalN", { n: deposit.renewal_sequence })}</span>}
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {owner.name}
              <span className="ml-2 text-xs font-medium text-muted-foreground">
                {t(owner.party === "MERCHANT" ? "accounts:merchant" : "accounts:customer")} · {t(owner.ownership === "CORPORATE" ? "accounts:corporate" : "accounts:individual")}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {deposit.product_name} · {deposit.tenor_label} · {deposit.inst_profile_name}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="amount-fit text-xl font-black tabular-nums text-foreground sm:text-2xl">{money(deposit.principal, cur)}</p>
            <p className="text-sm font-bold text-primary">{t("rateAYear", { rate: ratePct(deposit.annual_rate) })}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <RenewalLinks deposit={deposit} onOpen={setId} />
          <ActionButtons buttons={buttons} busy={busy} />
        </div>
        {deposit.closure_requested_by && deposit.status === "ACTIVE" && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">{t("closureRequestedBy", { name: deposit.closure_requested_by, date: accountDate(deposit.closure_requested_at) })}</p>
        )}
        {deposit.status === "MATURED" && <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">{t("maturedHint", { days: deposit.grace_period_days })}</p>}
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn("shrink-0 border-b-2 px-3 py-2 text-sm font-bold transition-colors", tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {t(`dtab_${key}`)}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <div className="grid gap-4">
          <Facts
            rows={[
              [t("startDate"), dayDate(deposit.start_date)],
              [t("maturityDate"), dayDate(deposit.maturity_date)],
              [t("tenor"), `${deposit.tenor_label} · ${t("daysN", { count: deposit.tenor_days })}`],
              [t("depositAccount"), deposit.deposit_number ? <span key="d" className="font-mono">{deposit.deposit_number}</span> : "—"],
              [t("depositBalance"), money(deposit.deposit_balance, cur)],
              [t("fundingWallet"), <span key="f" className="font-mono">{deposit.funding_acct_num}</span>],
              [t("payoutWallet"), <span key="p" className="font-mono">{deposit.payout_acct_num}</span>],
              [t("payoutFrequency"), optionLabel(t, deposit.interest_payout_frequency)],
              [t("dayCount"), optionLabel(t, deposit.day_count_convention)],
              [t("compounding"), t(deposit.compounding_enabled ? "yes" : "no")],
              [t("maturityInstruction"), optionLabel(t, deposit.maturity_instruction)],
              [t("graceDays"), t("daysN", { count: deposit.grace_period_days ?? 0 })],
              [t("earlyWithdrawal"), deposit.early_withdrawal_allowed ? earlyText(t, deposit) : t("notAllowed")],
              [t("recoverPaidInterest"), t(deposit.recover_previously_paid_interest ? "yes" : "no")],
              [t("requestedBy"), `${deposit.requested_userid_name ?? deposit.requested_by ?? "—"} · ${accountDate(deposit.requested_at)}`],
              deposit.decided_by && [t("decidedBy"), `${deposit.decided_by} · ${accountDate(deposit.decided_at)}`],
              deposit.closed_time && [t("closedAt"), accountDate(deposit.closed_time)],
            ]}
          />
          {deposit.settlement && (
            <Section title={t("settlementTitle", { type: t(`settle_${deposit.settlement.settlement_type}`, { defaultValue: deposit.settlement.settlement_type }) })}>
              <Breakdown quote={deposit.settlement} currency={cur} />
              {deposit.settlement.narration?.trim() && <p className="mt-3 text-xs italic text-muted-foreground">“{deposit.settlement.narration.trim()}”</p>}
              {deposit.settlement.renewal_term_deposit_id && (
                <Button variant="outline" size="sm" icon={Eye} className="mt-3" onClick={() => setId(deposit.settlement.renewal_term_deposit_id)}>
                  {t("openRenewal")}
                </Button>
              )}
            </Section>
          )}
        </div>
      )}

      {tab === "interest" && <InterestTab deposit={deposit} />}

      {tab === "history" && (
        <Section>
          <ol className="relative grid gap-4 border-l border-border pl-5">
            {(deposit.events ?? []).map((e, i) => (
              <li key={`${e.at}-${i}`} className="relative">
                <span className={cn("absolute -left-[26px] top-1 h-3 w-3 rounded-full ring-4 ring-card", EVENT_TONE[e.event] ?? "bg-primary")} />
                <p className="text-sm font-bold text-foreground">
                  {t(`event_${e.event}`, { defaultValue: e.event })} <span className="text-xs font-medium text-muted-foreground">· {e.actor} · {accountDate(e.at)}</span>
                </p>
                <EventDetail detail={e.detail} currency={cur} />
                {e.narration?.trim() && <p className="mt-1 text-xs italic text-foreground">“{e.narration.trim()}”</p>}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {tab === "transactions" && (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {depositAccount && (
              <Button variant="outline" size="sm" icon={ScrollText} onClick={() => setStatement(depositAccount)}>
                {t("depositStatement")}
              </Button>
            )}
            {payoutAccount && (
              <Button variant="outline" size="sm" icon={ScrollText} onClick={() => setStatement(payoutAccount)}>
                {t("walletStatement")}
              </Button>
            )}
          </div>
          {deposit.funding_txn ? (
            <Section title={t("fundingTxn")}>
              <TxnDetail txn={deposit.funding_txn} />
            </Section>
          ) : (
            <p className="text-sm text-muted-foreground">{t("notFundedYet")}</p>
          )}
          {deposit.settlement?.txn_id && <SettlementTxn txnId={deposit.settlement.txn_id} />}
        </div>
      )}

      {statement && <AccountStatement account={statement} onClose={() => setStatement(null)} />}

      {["auth", "deauth", "cancel", "preclose_deauth", "preclose_cancel"].includes(dialog) && (
        <NarrationDialog
          title={t(`dconfirm_${dialog}`)}
          hint={t(`dconfirmHint_${dialog}`, { amount: money(deposit.principal, cur), wallet: deposit.funding_acct_num })}
          confirmLabel={buttons.find((b) => b?.key === dialog)?.label}
          variant={dialog === "auth" ? "primary" : "danger"}
          required={dialog === "deauth" || dialog === "preclose_deauth"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => act(dialog, narration ? { narration } : {})}
        />
      )}
      {dialog === "instruct" && <InstructDialog deposit={deposit} busy={busy} onClose={() => setDialog(null)} onSave={(body) => act("instruct", body)} />}
      {(dialog === "preclose" || dialog === "preclose_auth") && (
        <PrecloseDialog deposit={deposit} verb={dialog} busy={busy} onClose={() => setDialog(null)} onSave={(narration) => act(dialog, narration ? { narration } : {})} />
      )}
    </div>
  );
}

function RenewalLinks({ deposit, onOpen }) {
  const { t } = useTranslation("deposits");
  const links = [
    deposit.renewed_from_term_deposit_id && ["renewedFrom", deposit.renewed_from_term_deposit_id],
    deposit.renewed_to_term_deposit_id && ["renewedTo", deposit.renewed_to_term_deposit_id],
  ].filter(Boolean);
  return (
    <div className="flex flex-wrap gap-2">
      {links.map(([key, target]) => (
        <button key={key} type="button" onClick={() => onOpen(target)} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:underline">
          <Link2 size={11} /> {t(key)}
        </button>
      ))}
    </div>
  );
}

// An event's `detail`: rate, dates, rrn, instruction change, or a
// settlement / closure quote.
function EventDetail({ detail, currency }) {
  const { t } = useTranslation("deposits");
  if (!detail || !Object.keys(detail).length) return null;
  const { quote, settlement, ...rest } = detail;
  const show = (k, v) => {
    if (/rate/.test(k)) return ratePct(v);
    if (/date/.test(k)) return dayDate(v);
    if (/^(principal|amount)$/.test(k)) return money(v, currency);
    if (k === "to" || k === "from") return optionLabel(t, v);
    return String(v);
  };
  return (
    <div className="mt-1">
      <div className="flex flex-wrap gap-1">
        {Object.entries(rest)
          .filter(([k, v]) => v != null && v !== "" && typeof v !== "object" && k !== "txn_id")
          .map(([k, v]) => (
            <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
              {t(`detail_${k}`, { defaultValue: k })}: <span className="tabular-nums">{show(k, v)}</span>
            </span>
          ))}
      </div>
      {(quote ?? settlement) && (
        <div className="mt-2 max-w-md rounded-xl border border-border bg-card p-2">
          <Breakdown quote={quote ?? settlement} currency={currency} small />
        </div>
      )}
    </div>
  );
}

// The settlement / early-closure breakdown, line by line to the payout.
function Breakdown({ quote, currency, small = false }) {
  const { t } = useTranslation("deposits");
  const m = (v) => money(v, currency);
  const lines = [
    ["principalAmount", quote.principal_amount],
    quote.interest_earned != null && ["interestEarned", quote.interest_earned],
    Number(quote.previously_paid) !== 0 && quote.previously_paid != null && ["previouslyPaid", quote.previously_paid, "minus"],
    ["unpaidGrossInterest", quote.unpaid_gross_interest],
    Number(quote.interest_adjustment_amount) !== 0 && ["interestAdjustment", quote.interest_adjustment_amount, "minus"],
    Number(quote.previously_paid_interest_recovered) !== 0 && ["paidInterestRecovered", quote.previously_paid_interest_recovered, "minus"],
    Number(quote.tax_withheld) !== 0 && ["taxWithheld", quote.tax_withheld, "minus"],
    ["netInterest", quote.net_interest_amount],
    Number(quote.renewed_amount) !== 0 && ["renewedAmount", quote.renewed_amount],
  ].filter(Boolean);
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        {quote.settlement_date && <span>{t("settlementDate")}: <b className="text-foreground">{dayDate(quote.settlement_date)}</b></span>}
        {quote.instruction && <span>· {optionLabel(t, quote.instruction)}</span>}
      </div>
      <dl className={cn("grid gap-1", small ? "text-xs" : "text-sm")}>
        {lines.map(([key, value, sign]) => (
          <div key={key} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t(key)}</dt>
            <dd className={cn("tabular-nums", sign === "minus" && "text-red-700")}>
              {sign === "minus" ? "−" : ""}
              {m(value)}
            </dd>
          </div>
        ))}
        <div className={cn("mt-1 flex justify-between gap-3 border-t border-border pt-2 font-black", small ? "text-sm" : "text-base")}>
          <dt>{t("totalPayout")}</dt>
          <dd className="tabular-nums text-emerald-700">{m(quote.total_payout_amount)}</dd>
        </div>
      </dl>
    </div>
  );
}

function InterestTab({ deposit }) {
  const { t } = useTranslation("deposits");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(31);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const cur = deposit.currency_code;
  const interest = deposit.interest ?? {};

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    depositsApi
      .accruals({ id: deposit.id, page, limit })
      .then((r) => {
        const row = rowsOf(r)[0];
        if (!cancelled) setData({ items: row?.items ?? [], total: row?.total ?? 0 });
      })
      .catch((error) => notifications.error(error.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [deposit.id, page, limit]);

  const columns = [
    { key: "day", label: t("day"), render: (r) => <span className="whitespace-nowrap text-xs">{dayDate(r.day)}</span> },
    { key: "principal_basis", label: t("principalBasis"), render: (r) => <span className="text-xs tabular-nums">{money(r.principal_basis, cur)}</span> },
    { key: "annual_rate", label: t("annualRate"), render: (r) => <span className="text-xs tabular-nums">{ratePct(r.annual_rate)}</span> },
    { key: "accrued_interest", label: t("accrued"), render: (r) => <span className="text-xs font-bold tabular-nums">{money(r.accrued_interest, cur)}</span> },
    { key: "status", label: t("status"), render: (r) => <StatusBadge status={r.status} variant="subtle" /> },
  ];

  return (
    <div className="grid gap-4">
      <Facts
        rows={[
          [t("accruedTotal"), money(interest.accrued_total, cur)],
          [t("accruedThrough"), dayDate(interest.accrued_through)],
          [t("paidTotal"), money(interest.paid_total, cur)],
          [t("unpaidAccrued"), money(interest.unpaid_accrued, cur), "text-primary"],
        ]}
      />
      {interest.payouts?.length > 0 && (
        <Section title={t("payouts")}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3">{t("period")}</th>
                  <th className="py-1 pr-3 text-right">{t("grossInterest")}</th>
                  <th className="py-1 pr-3 text-right">{t("netInterest")}</th>
                  <th className="py-1">RRN</th>
                </tr>
              </thead>
              <tbody>
                {interest.payouts.map((p) => (
                  <tr key={`${p.period_start}-${p.rrn}`} className="border-t border-border">
                    <td className="py-1.5 pr-3">{dayDate(p.period_start)} – {dayDate(p.period_end)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{money(p.gross_interest, cur)}</td>
                    <td className="py-1.5 pr-3 text-right font-bold tabular-nums">{money(p.net_interest, cur)}</td>
                    <td className="py-1.5 font-mono">{p.rrn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
      <DataTable
        columns={columns}
        rows={data.items}
        rowKey={(r) => r.day}
        isLoading={loading}
        title={t("dailyAccruals")}
        emptyTitle={t("noAccruals")}
        emptyDescription={t("noAccrualsHint")}
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

function SettlementTxn({ txnId }) {
  const { t } = useTranslation("deposits");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" icon={Eye} className="w-fit" onClick={() => setOpen(true)}>
        {t("settlementTxn")}
      </Button>
      {open && <TxnDialog txnId={txnId} onClose={() => setOpen(false)} />}
    </>
  );
}

// Change the maturity instruction (Active), or carry one out now (Matured:
// pay out or renew, not hold).
function InstructDialog({ deposit, busy, onClose, onSave }) {
  const { t } = useTranslation("deposits");
  const matured = deposit.status === "MATURED";
  const choices = INSTRUCTIONS.filter((i) => !(matured && i === "HOLD"));
  const [instruction, setInstruction] = useState(matured ? "PAYOUT" : deposit.maturity_instruction);
  return (
    <NarrationDialog
      title={matured ? t("settleNow") : t("changeInstruction")}
      hint={matured ? t("settleNowHint") : t("changeInstructionHint")}
      confirmLabel={matured ? t("settleNow") : t("save")}
      busy={busy}
      onClose={onClose}
      onSave={(narration) => onSave({ instruction, ...(narration ? { narration } : {}) })}
    >
      <div className="mb-3 grid gap-2">
        {choices.map((c) => (
          <label key={c} className={cn("flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 transition-colors", instruction === c ? "border-primary bg-[var(--primary-light)]" : "border-border bg-card hover:border-primary/50")}>
            <input type="radio" name="instruction" className="mt-1 accent-[var(--primary)]" checked={instruction === c} onChange={() => setInstruction(c)} />
            <span>
              <span className="block text-sm font-bold text-foreground">{optionLabel(t, c)}</span>
              <span className="block text-[11px] text-muted-foreground">{t(`instructionHint_${c}`)}</span>
            </span>
          </label>
        ))}
      </div>
    </NarrationDialog>
  );
}

// Early closure: the breakdown first (preclose_quote; a later date is an
// estimate), then the request (maker) or approval (checker), which works it
// out again on the day.
function PrecloseDialog({ deposit, verb, busy, onClose, onSave }) {
  const { t } = useTranslation("deposits");
  const [onDate, setOnDate] = useState("");
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setQuote(null);
    setError("");
    depositsApi
      .preclose_quote({ id: deposit.id, ...(onDate ? { on_date: onDate } : {}) })
      .then((r) => !cancelled && setQuote(rowsOf(r)[0] ?? null))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [deposit.id, onDate]);

  return (
    <NarrationDialog
      size="md"
      title={t(verb === "preclose" ? "closeEarly" : "approveClosure")}
      hint={t(verb === "preclose" ? "closeEarlyHint" : "approveClosureHint")}
      confirmLabel={t(verb === "preclose" ? "requestClosure" : "approveClosure")}
      variant={verb === "preclose" ? "danger" : "primary"}
      busy={busy || (!quote && !error)}
      onClose={onClose}
      onSave={onSave}
    >
      {verb === "preclose" && (
        <label className={cn(labelClass, "mb-3 block")}>
          {t("estimateForDate")}
          <input type="date" className={cn(inputClass, "mt-1")} min={new Date().toISOString().slice(0, 10)} max={deposit.maturity_date} value={onDate} onChange={(e) => setOnDate(e.target.value)} />
          {onDate && <span className="mt-1 block text-[11px] font-normal text-amber-700">{t("estimateHint")}</span>}
        </label>
      )}
      <div className="mb-3 rounded-xl border border-border bg-card p-3">
        {quote ? <Breakdown quote={quote} currency={deposit.currency_code} /> : error ? <p className="text-xs font-semibold text-red-700">{error}</p> : <Spinner size={16} />}
      </div>
    </NarrationDialog>
  );
}
