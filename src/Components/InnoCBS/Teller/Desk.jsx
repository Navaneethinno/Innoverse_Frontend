import { EmptyNote } from "@/Components/Common/EmptyNote";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, FileText, HandCoins, LockKeyhole, Plus, Printer, Unlock, Vault } from "lucide-react";
import { AmountInput } from "@/Components/Common/AmountInput";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { accountDate, money } from "@/Components/InnoCBS/Accounts/accountShared";
import { ReceiptDialog } from "@/Components/Finance/Transactions/txnShared";
import { useOwnIds } from "@/Hooks/useInstitutionScope";
import { usePagePermission } from "@/Hooks/usePermission";
import { tellerApi } from "@/Services/Accounting/accounting.api";
import { loanFacilitiesApi, recordOf } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ActionButtons, Facts, Section, inputClass, labelClass } from "../Deposits/depositShared";
import { Field, MiniTable, useInstitutionScope } from "../Loans/loanShared";
import { AccountPick, FacilityPick, slipReference } from "../coreBankingShared";
import { TransferTable, WaitingPanel } from "./Transfers";
import { BalanceFacts, Movements, ProofSheet, QUEUE_EVERY, Variance, newSlip, notesText, sessionOwner, sessionOwnerId } from "./tellerShared";

// The teller's own till (open, or its close waiting for a custodian), else
// the tills to open one. A close beyond the tolerance waits: the till can't
// be used and is read again every QUEUE_EVERY until it is approved (the
// summary shows) or sent back for a recount (the custodian's note shows).
export function Desk({ waiting }) {
  const { t } = useTranslation("corebank");
  const can = usePagePermission();
  const { scope } = useInstitutionScope();
  const me = useOwnIds().userId;
  const [tills, setTills] = useState(null);
  const [till, setTill] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [summary, setSummary] = useState(null);
  const [proof, setProof] = useState(null);
  const [closedDays, setClosedDays] = useState([]);
  // The till whose close is waiting, to show its summary once approved.
  const waitingTill = useRef(null);
  const load = useCallback(async () => {
    try {
      // The tills of the user's own branch (none when they work at no branch).
      const r = await tellerApi.list(scope({ mine: true, status: "ACTIVE", limit: 200 }));
      const rows = Array.isArray(r?.data) ? r.data : [];
      setTills(rows);
      const mine = rows.find((x) => x.session && sessionOwnerId(x.session) === me);
      const detail = mine ? recordOf(await tellerApi.get(scope({ id: mine.id }))) : null;
      setTill(detail);
      if (detail?.session?.status === "PENDING_CLOSE") waitingTill.current = detail;
      else if (waitingTill.current && !detail) {
        // Approved: the session just closed is the till's latest.
        const closed = recordOf(await tellerApi.get(scope({ id: waitingTill.current.id })));
        if (closed?.sessions?.[0]) setSummary({ session: closed.sessions[0], till: closed });
        waitingTill.current = null;
      } else waitingTill.current = null;
      // A closed branch day stops all till work there.
      const branches = [...new Set((detail ? [detail] : rows.filter((x) => x.kind === "TILL")).map((x) => x.branch_id))].slice(0, 5);
      const reports = await Promise.all(
        branches.map((id) =>
          tellerApi
            .eod_report(scope({ branch_id: id }))
            .then((x) => recordOf(x))
            .catch(() => null),
        ),
      );
      setClosedDays(reports.filter((x) => x?.status === "CLOSED"));
    } catch (e) {
      setTills([]);
      notifications.error(e.message);
    }
  }, [scope, me]);
  useEffect(() => {
    void load();
  }, [load]);
  const pendingClose = till?.session?.status === "PENDING_CLOSE";
  useEffect(() => {
    if (!pendingClose) return undefined;
    const timer = window.setInterval(() => void load(), QUEUE_EVERY);
    return () => window.clearInterval(timer);
  }, [pendingClose, load]);
  const done = () => {
    setDialog(null);
    void load();
    void waiting.reload();
  };

  if (!tills) return <PageSkeleton />;
  if (!can("Self"))
    return <EmptyNote>{t("notATeller")}</EmptyNote>;
  const dayBanner = closedDays.length > 0 && (
    <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800">
      {t("branchDayClosed", { branches: closedDays.map((d) => d.branch_name).join(", ") })}
    </p>
  );
  const modals = (
    <>
      {receipt && <ReceiptDialog txnId={receipt} onClose={() => setReceipt(null)} />}
      {summary && (
        <SessionSummary
          session={summary.session}
          till={summary.till}
          onClose={() => setSummary(null)}
          onProof={() => setProof({ till: summary.till, sessionId: summary.session.id })}
        />
      )}
      {proof && <ProofSheet till={proof.till} sessionId={proof.sessionId} onClose={() => setProof(null)} />}
    </>
  );
  if (!till) {
    const closed = tills.filter((x) => x.kind === "TILL" && !x.session);
    return (
      <div className="grid gap-4">
        {dayBanner}
        <WaitingPanel waiting={waiting} onChanged={done} />
        <Section title={t("openATill")}>
          <p className="mb-3 text-xs text-muted-foreground">{t("openATillHint")}</p>
          <MiniTable
            rows={closed}
            empty={t("noTillToOpen")}
            columns={[
              {
                key: "code",
                label: t("till"),
                render: (r) => (
                  <span className="text-xs">
                    <b className="font-mono">{r.code}</b> · {r.name}
                  </span>
                ),
              },
              { key: "branch_name", label: t("branch") },
              {
                key: "balance",
                label: t("balance"),
                align: "right",
                render: (r) => money(r.balance, r.currency),
              },
              {
                key: "open",
                label: "",
                render: (r) => (
                  <Button
                    size="sm"
                    icon={Unlock}
                    onClick={() => setDialog({ kind: "open", till: r })}
                    data-tour="teller-open"
                  >
                    {t("openTill")}
                  </Button>
                ),
              },
            ]}
          />
          {dialog && (
            <CountDialog
              verb="open"
              till={dialog.till}
              onClose={() => setDialog(null)}
              onDone={done}
            />
          )}
        </Section>
        {modals}
      </div>
    );
  }
  const session = till.session;
  const sameDrawer = (x) =>
    x.branch_id === till.branch_id && x.currency_id === till.currency_id && x.id !== till.id;
  const vault = tills.find((x) => x.kind === "VAULT" && sameDrawer(x));
  // A transfer goes only to an open till of the same branch and currency.
  const openTills = tills.filter((x) => x.kind === "TILL" && x.session?.status === "OPEN" && sameDrawer(x));
  return (
    <div className="grid gap-4">
      {dayBanner}
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-border bg-card p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("yourTill")}
          </p>
          <p className="text-lg font-black">
            <span className="font-mono">{till.code}</span> · {till.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {[till.branch_name, till.currency].join(" · ")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("available")}
          </p>
          <p className="text-2xl font-black tabular-nums">
            {money(till.available ?? till.balance, till.currency)}
          </p>
        </div>
      </div>
      {pendingClose && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900" data-tour="teller-pending-close">
          <p className="text-sm font-bold">{t("closeWaiting", { amount: money(session.variance, till.currency) })}</p>
          <p className="mt-1 text-xs">{t("closeWaitingHint")}</p>
          <div className="mt-3">
            <Facts
              rows={[
                [t("expected"), money(session.closing_expected, till.currency)],
                [t("closingCount"), money(session.closing_counted, till.currency)],
                [t("variance"), <Variance key="v" value={session.variance} currency={till.currency} />],
              ]}
            />
          </div>
        </div>
      )}
      {!pendingClose && session?.close_decision_note && (
        <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900">
          {t("recountNote", { name: session.close_decided_by ?? "—", note: session.close_decision_note })}
        </p>
      )}
      <div data-tour="teller-balance">
        <BalanceFacts till={till} />
      </div>
      <ActionButtons
        buttons={[
          ...(pendingClose
            ? []
            : [
                {
                  key: "deposit",
                  label: t("deposit"),
                  icon: ArrowDownToLine,
                  variant: "primary",
                  run: () => setDialog({ kind: "deposit" }),
                },
                {
                  key: "withdraw",
                  label: t("withdraw"),
                  icon: ArrowUpFromLine,
                  run: () => setDialog({ kind: "withdraw" }),
                },
                {
                  key: "loan_repay",
                  label: t("loanRepay"),
                  icon: HandCoins,
                  run: () => setDialog({ kind: "loan_repay" }),
                },
                {
                  key: "requisition",
                  label: t("askVault"),
                  icon: Vault,
                  run: () => setDialog({ kind: "REQUISITION" }),
                },
                {
                  key: "send",
                  label: t("sendCash"),
                  icon: ArrowLeftRight,
                  run: () => setDialog({ kind: "TRANSFER" }),
                },
              ]),
          {
            key: "proof",
            label: t("proofSheet"),
            icon: FileText,
            run: () => setProof({ till }),
          },
          !pendingClose && {
            key: "close",
            label: t("closeTill"),
            icon: LockKeyhole,
            variant: "danger",
            run: () => setDialog({ kind: "close" }),
          },
        ]}
      />
      <WaitingPanel waiting={waiting} onChanged={done} />
      <Section title={t("myPendingTransfers")}>
        <TransferTable query={{ till_id: till.id, status: "PENDING" }} onChanged={done} />
      </Section>
      <Section title={t("thisSession")}>
        {session && <Movements session={session} currency={till.currency} />}
      </Section>
      {dialog?.kind === "close" && (
        <CountDialog
          verb="close"
          till={till}
          onClose={() => setDialog(null)}
          onDone={(closed) => {
            if (closed?.status === "CLOSED") setSummary({ session: closed, till });
            done();
          }}
        />
      )}
      {["deposit", "withdraw", "loan_repay"].includes(dialog?.kind) && (
        <CounterDialog
          kind={dialog.kind}
          till={till}
          onClose={() => setDialog(null)}
          onDone={(txn) => {
            if (txn?.txn_id && dialog.kind !== "loan_repay") setReceipt(txn.txn_id);
            done();
          }}
        />
      )}
      {["REQUISITION", "TRANSFER"].includes(dialog?.kind) && (
        <TransferDialog
          initialKind={dialog.kind}
          till={till}
          vault={vault}
          openTills={openTills}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {modals}
    </div>
  );
}

// Open or close a till, or count a vault, with the cash counted. A count
// that differs from the books is warned about before it is sent. Opening and
// a vault count post the difference at once; closing may wait for a
// custodian (beyond the tolerance), and is refused while transfers are
// pending. Closing and a vault count may count by note.
export function CountDialog({ verb, till, onClose, onDone }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  // A till's count must equal its balance exactly; the server's refusal shows here.
  const [refusal, setRefusal] = useState("");
  const fromNotes = notes.reduce((sum, n) => sum + Number(n.value || 0) * Number(n.count || 0), 0);
  const amount = notes.length ? fromNotes.toFixed(2) : counted;
  const difference = amount === "" ? 0 : Number(amount) - Number(till.balance ?? 0);
  const pending = Number(till.pending_out || 0) + Number(till.pending_in || 0);
  const save = async () => {
    setBusy(true);
    try {
      const denominations = notes.length
        ? Object.fromEntries(
            notes.filter((n) => n.value && n.count).map((n) => [n.value, Number(n.count)]),
          )
        : undefined;
      const r = await tellerApi[verb === "vault" ? "vault_count" : verb](
        scope({
          id: till.id,
          counted: amount || "0",
          note: note.trim(),
          ...(denominations ? { denominations } : {}),
        }),
      );
      const result = verb === "open" ? recordOf(r)?.session : recordOf(r);
      if (result?.status === "PENDING_CLOSE")
        notifications.info(t("closeWaiting", { amount: money(result.variance, till.currency) }));
      else
        notifications.success(
          Number(result?.variance)
            ? t("countedWithVariance", { amount: money(result.variance, till.currency) })
            : r?.message,
        );
      onDone(result);
    } catch (e) {
      // Kept open with what was counted: recount, or correct the entries first.
      setRefusal(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={t(`countTitle_${verb}`, { code: till.code })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            loading={busy}
            disabled={amount === "" || (verb === "close" && pending > 0)} disabledReason={t("common:blockedTillClose")}
            variant={verb === "close" ? "danger" : "primary"}
            onClick={() => void save()}
          >
            {t(`countConfirm_${verb}`)}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        {t("countHint", { amount: money(till.balance, till.currency) })}
      </p>
      {verb === "close" && pending > 0 && (
        <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          {t("closePendingHint")}
        </p>
      )}
      <label className={labelClass}>
        {t("counted")}
        <AmountInput
          className={cn(inputClass, "mt-1.5")}
          value={amount}
          onChange={(v) => {
            if (notes.length) return;
            setCounted(v);
            setRefusal("");
          }}
        />
      </label>
      {refusal && <p className="mt-2 text-xs font-semibold text-red-700">{refusal}</p>}
      {verb !== "vault" && amount !== "" && difference !== 0 && <p className="mt-1 text-[11px] text-muted-foreground">{t("countMustMatch")}</p>}
      {amount !== "" && difference !== 0 && (
        <p
          className={cn(
            "mt-2 rounded-xl px-3 py-2 text-xs font-semibold",
            difference < 0 ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900",
          )}
        >
          {t(difference < 0 ? "countShort" : "countOver", {
            counted: money(amount, till.currency),
            expected: money(till.balance, till.currency),
            amount: money(Math.abs(difference).toFixed(2), till.currency),
          })}
        </p>
      )}
      {verb !== "open" && (
        <div className="mt-3">
          <p className={labelClass}>{t("byNote")}</p>
          <div className="mt-1.5 grid gap-2">
            {notes.map((n, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                <AmountInput
                  className={inputClass}
                  placeholder={t("noteValue")}
                  value={n.value}
                  onChange={(v) =>
                    setNotes((list) => list.map((x, j) => (j === i ? { ...x, value: v } : x)))
                  }
                />
                <input
                  className={cn(inputClass, "tabular-nums")}
                  inputMode="numeric"
                  placeholder={t("noteCount")}
                  value={n.count}
                  onChange={(e) =>
                    setNotes((list) =>
                      list.map((x, j) =>
                        j === i ? { ...x, count: e.target.value.replace(/\D/g, "") } : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="text-xs font-bold text-red-600"
                  onClick={() => setNotes((list) => list.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              className="w-fit"
              onClick={() => setNotes((list) => [...list, { value: "", count: "" }])}
            >
              {t("addNote")}
            </Button>
          </div>
        </div>
      )}
      <label className={cn(labelClass, "mt-3 block")}>
        {t("note")}
        <input
          className={cn(inputClass, "mt-1.5")}
          value={note}
          maxLength={200}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
    </Modal>
  );
}

// The closed session as an end-of-day summary the teller can print.
function SessionSummary({ session, till, onClose, onProof }) {
  const { t } = useTranslation("corebank");
  const c = till.currency;
  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={t("endOfDay", { code: till.code })}
      footer={
        <>
          <Button variant="outline" icon={FileText} onClick={onProof}>
            {t("proofSheet")}
          </Button>
          <Button icon={Printer} onClick={() => window.print()}>
            {t("print")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Facts
          rows={[
            [t("teller"), sessionOwner(session)],
            [t("opened"), accountDate(session.opened_at)],
            [t("closed"), accountDate(session.closed_at)],
            [t("openingCount"), money(session.opening_counted, c)],
            [t("cashIn"), money(session.cash_in, c), "text-emerald-700"],
            [t("cashOut"), money(session.cash_out, c), "text-red-700"],
            [t("expected"), money(session.closing_expected, c)],
            [t("closingCount"), money(session.closing_counted, c), "font-black"],
            [t("variance"), <Variance key="v" value={session.variance} currency={c} />],
            [t("byNote"), notesText(session.denominations)],
          ]}
        />
        <Movements session={session} currency={c} />
      </div>
    </Modal>
  );
}

// Counter work on the open till: a cash deposit or withdrawal on a customer
// account, or a loan repayment. The slip number is made once and kept, so a
// retry after a timeout answers the first posting instead of posting again.
function CounterDialog({ kind, till, onClose, onDone }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const [target, setTarget] = useState(null);
  const [due, setDue] = useState(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState(() => newSlip(till));
  const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState(false);
  // A loan: what is due today, offered as the amount.
  useEffect(() => {
    if (kind !== "loan_repay" || !target?.id) return;
    setDue(null);
    loanFacilitiesApi
      .due(scope({ id: target.id }))
      .then((r) => {
        const d = recordOf(r);
        setDue(d);
        if (Number(d?.total_due)) setAmount(String(d.total_due));
      })
      .catch((e) => notifications.error(e.message));
  }, [kind, target, scope]);
  const ready = Number(amount) > 0 && reference && target;
  const save = async () => {
    setBusy(true);
    try {
      const common = { id: till.id, amount, reference, narration: narration.trim() };
      const body =
        kind === "loan_repay"
          ? { ...common, facility_id: target.id }
          : { ...common, acct_id: target.id };
      const r = await tellerApi[kind](scope(body));
      const txn = recordOf(r);
      if (txn?.replayed) notifications.info(t("alreadyPosted", { rrn: txn.rrn }));
      else if (kind === "loan_repay")
        notifications.success(
          t("repaid", {
            amount: money(txn?.amount, till.currency),
            principal: money(txn?.principal, till.currency),
            interest: money(txn?.interest, till.currency),
          }),
        );
      else if (r?.message) notifications.success(r.message);
      onDone(txn);
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={t(`money_${kind}`)}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={busy} disabled={!ready} disabledReason={t("common:blockedFillRequired")} onClick={() => void save()}>
            {t(`money_${kind}`)}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <label className={labelClass}>
          {t(kind === "loan_repay" ? "loanFacility" : "customerAccount")}
          <div className="mt-1.5">
            {kind === "loan_repay" ? (
              <FacilityPick value={target} onChange={setTarget} scope={scope} />
            ) : (
              <AccountPick
                value={target}
                onChange={setTarget}
                scope={scope}
                filter={(a) => a.currency_id === till.currency_id && a.acct_class === "CUSTOMER"}
              />
            )}
          </div>
        </label>
        {kind === "loan_repay" && due && (
          <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs">
            {Number(due.total_due)
              ? t("dueToday", { amount: money(due.total_due, till.currency) })
              : t("nothingDueToday")}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            {t("amountIn", { currency: till.currency })}
            <AmountInput className={cn(inputClass, "mt-1.5")} value={amount} onChange={setAmount} />
          </label>
          <label className={labelClass}>
            {t("slipReference")}
            <input
              className={cn(inputClass, "mt-1.5 font-mono")}
              value={reference}
              onChange={(e) => setReference(slipReference(e.target.value))}
            />
          </label>
        </div>
        <label className={labelClass}>
          {t("narration")}
          <input
            className={cn(inputClass, "mt-1.5")}
            value={narration}
            maxLength={200}
            onChange={(e) => setNarration(e.target.value)}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          {kind === "withdraw"
            ? t("withdrawHint", { amount: money(till.available ?? till.balance, till.currency) })
            : t("slipHint")}
        </p>
      </div>
    </Modal>
  );
}

// Ask the vault for cash (a requisition, decided by a vault custodian), send
// cash back to it (a return) or to another open till (a transfer, accepted
// by that till's teller). Nothing moves until the other side decides; cash
// sent is held back from this till meanwhile.
function TransferDialog({ initialKind, till, vault, openTills, onClose, onDone }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const [kind, setKind] = useState(initialKind);
  const [toTill, setToTill] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState(() => newSlip(till));
  const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState(false);
  const needsVault = kind !== "TRANSFER";
  const ready =
    Number(amount) > 0 && reference && (needsVault ? Boolean(vault) : Boolean(toTill));
  const save = async () => {
    setBusy(true);
    try {
      const r = await tellerApi.transfer_request(
        scope({
          kind,
          till_id: till.id,
          ...(kind === "TRANSFER" ? { to_till_id: Number(toTill) } : {}),
          amount,
          reference,
          narration: narration.trim(),
        }),
      );
      if (r?.message) notifications.success(r.message);
      onDone();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const kinds = initialKind === "REQUISITION" ? ["REQUISITION"] : ["TRANSFER", "RETURN"];
  return (
    <Modal
      open
      onClose={onClose}
      title={t(initialKind === "REQUISITION" ? "askVault" : "sendCash")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={busy} disabled={!ready} disabledReason={t("common:blockedFillRequired")} onClick={() => void save()}>
            {t(`request_${kind}`)}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-xs text-muted-foreground">{t(`transferHint_${kind}`)}</p>
        {kinds.length > 1 && (
          <label className={labelClass}>
            {t("sendTo")}
            <Field
              field={{
                type: "select",
                options: kinds.map((k) => ({ value: k, label: t(`sendTo_${k}`) })),
              }}
              value={kind}
              onChange={setKind}
            />
          </label>
        )}
        {kind === "TRANSFER" ? (
          <label className={labelClass}>
            {t("receivingTill")}
            <Field
              field={{
                type: "select",
                blank: openTills.length ? t("choose") : t("noOpenTills"),
                options: openTills.map((x) => ({
                  value: String(x.id),
                  label: `${x.code} · ${x.name} (${sessionOwner(x.session)})`,
                })),
              }}
              value={toTill}
              onChange={setToTill}
            />
          </label>
        ) : vault ? (
          <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs">
            {t("theVault", { code: vault.code, name: vault.name })}
          </p>
        ) : (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            {t("noVault")}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            {t("amountIn", { currency: till.currency })}
            <AmountInput className={cn(inputClass, "mt-1.5")} value={amount} onChange={setAmount} />
          </label>
          <label className={labelClass}>
            {t("slipReference")}
            <input
              className={cn(inputClass, "mt-1.5 font-mono")}
              value={reference}
              onChange={(e) => setReference(slipReference(e.target.value))}
            />
          </label>
        </div>
        <label className={labelClass}>
          {t("narration")}
          <input
            className={cn(inputClass, "mt-1.5")}
            value={narration}
            maxLength={200}
            onChange={(e) => setNarration(e.target.value)}
          />
        </label>
        {kind !== "REQUISITION" && (
          <p className="text-xs text-muted-foreground">
            {t("sendHoldHint", { amount: money(till.available ?? till.balance, till.currency) })}
          </p>
        )}
      </div>
    </Modal>
  );
}
