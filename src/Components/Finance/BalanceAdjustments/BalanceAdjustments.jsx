import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, HandCoins, Info, Plus, Scale, Search, Send } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { DrCr, TxnDialog } from "@/Components/Finance/Accounts/AccountStatement";
import { money } from "@/Components/Finance/Accounts/accountShared";
import { atIst } from "@/Components/Reports/Shared/reportShared";
import { RequestDialog } from "@/Components/Finance/Transactions/Transactions";
import { PlanCard, TotalCell, typeLabel } from "@/Components/Finance/Transactions/txnShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { useOpenMenu } from "@/Pages/Sidebar/menuContext";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { balanceAdjustmentsApi } from "@/Services/TermDeposits/termDeposits.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { Problems, amountInput, inputClass, labelClass } from "../Deposits/depositShared";
import { useLiveChannel } from "@/Hooks/useLiveChannel";

// EPURSE > Balance Adjustments (menu 182): credit / debit corrections of a
// transaction that happened, found by its RRN (or opened from a dispute).
// The wallet and the other side come from that transaction; the amount is
// at most what is left of it. Posted when a checker approves, or at once for
// Self. Cash in and cash out are the teller's.
export function BalanceAdjustments() {
  const { t } = useTranslation(["deposits", "txn", "common"]);
  const can = usePagePermission();
  const openMenu = useOpenMenu();
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [txn, setTxn] = useState(null);

  const list = useServerList({ api: balanceAdjustmentsApi.listPath, call: balanceAdjustmentsApi.list });

  const load = list.reload;
  useLiveChannel("/config/ledger/adjustment/list", () => load());

  const columns = [
    {
      key: "request_reference",
      label: t("txn:request"),
      render: (a) => (
        <button type="button" onClick={() => setOpenId(a.id)} className="text-left">
          <span className="block font-mono text-xs font-bold text-primary hover:underline">{a.request_reference ?? `#${a.id}`}</span>
          <span className="block text-[10px] text-muted-foreground">{atIst(a.requested_at)}</span>
        </button>
      ),
    },
    {
      key: "org_rrn",
      label: t("originalRrn"),
      render: (a) =>
        a.org_rrn ? (
          <button type="button" onClick={() => setTxn(a.org_rrn)} className="font-mono text-xs font-bold text-primary hover:underline">
            {a.org_rrn}
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "acct_num",
      label: t("wallet"),
      align: "left",
      render: (a) => (
        <div>
          <p className="font-mono text-xs font-bold">{a.acct_num}</p>
          <p className="text-[10px] text-muted-foreground">{a.owner_name || "—"}</p>
        </div>
      ),
    },
    {
      key: "txn_type",
      label: t("txn:type"),
      render: (a) => (
        <span className="flex flex-col items-start gap-0.5 text-xs">
          <span className="font-semibold">{typeLabel(t, a.txn_type, a.txn_type_name)}</span>
          <DrCr type={a.operation_type} />
        </span>
      ),
    },
    { key: "total_amount", label: t("amount"), render: (a) => <TotalCell total={a.total_amount} amount={a.amount} fee={a.fee_amount} currency={a.currency_code} /> },
    {
      key: "dispute_case_number",
      label: t("dispute"),
      render: (a) =>
        a.dispute_case_number ? (
          <button type="button" onClick={() => openMenu("disputes", { caseId: a.dispute_case_id })} className="font-mono text-xs font-bold text-primary hover:underline">
            {a.dispute_case_number}
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    { key: "reason", label: t("reason"), align: "left", render: (a) => <span className={cn("line-clamp-2 text-xs", a.status === "FAILED" && "text-red-700")}>{a.status === "FAILED" ? a.status_desc : a.reason}</span> },
    { key: "status", label: t("status"), render: (a) => <StatusBadge status={a.status} variant="subtle" /> },
    { key: "requested_by", label: t("requestedBy"), render: (a) => <span className="text-xs">{a.requested_userid_name ?? a.requested_by ?? "—"}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (a) => <RowActions buttons={{ view: true }} onView={() => setOpenId(a.id)} /> },
  ];

  const listActions = (
    <>
      {can("Add") && (
        <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
          {t("newAdjustment")}
        </Button>
      )}
    </>
  );

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3" data-tour="page-title">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Scale size={22} className="text-primary" /> {t("adjTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("adjSubtitle")}</p>
        </div>
      </div>

      <ListTable list={list} actions={listActions} columns={columns} rowKey={(a) => a.id} title={t("adjTitle")} emptyTitle={t("noAdjustments")} emptyDescription={t("noAdjustmentsHint")} />

      {adding && (
        <AdjustmentForm
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            load();
          }}
        />
      )}
      {openId && <RequestDialog id={openId} api={balanceAdjustmentsApi} onClose={() => setOpenId(null)} onChanged={() => load()} onOpenTxn={({ rrn }) => setTxn(rrn)} />}
      {txn && <TxnDialog rrn={txn} onClose={() => setTxn(null)} />}
    </div>
  );
}

const KINDS = {
  ADJUST_CREDIT: { adjustable: "credit_adjustable", wallet: "debited_wallet", icon: ArrowDownLeft },
  ADJUST_DEBIT: { adjustable: "debit_adjustable", wallet: "credited_wallet", icon: ArrowUpRight },
  // Recovery: from a dispute only; takes back what the customer owes from
  // the wallet the transaction debited, with no ceiling (it may go below zero).
  RECOVERY: { wallet: "debited_wallet", icon: HandCoins, recovery: true },
};
const isOpen = (d) => d.status !== "CLOSED";

// New adjustment, three steps: find the transaction by its RRN (skipped when
// opened from a dispute: `disputeId`), see it and pick credit or debit, then
// the amount (at most what is left) and the reason; the quote shows the
// result before it is sent.
export function AdjustmentForm({ disputeId, onClose, onSaved }) {
  const { t } = useTranslation(["deposits", "txn"]);
  const [rrn, setRrn] = useState("");
  const [found, setFound] = useState(null);
  const [finding, setFinding] = useState(Boolean(disputeId));
  const [kind, setKind] = useState("");
  const [dispute, setDispute] = useState(disputeId ?? null);
  const [form, setForm] = useState({ amount: "", reason: "", reference: "" });
  const [plan, setPlan] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const lookup = async (body) => {
    setFinding(true);
    setError("");
    setFound(null);
    setKind("");
    try {
      const data = rowsOf(await balanceAdjustmentsApi.lookup(body))[0] ?? null;
      setFound(data);
      const tx = data?.transaction;
      // The only kind left is chosen for the user; an open dispute is preselected.
      const kinds = Object.keys(KINDS).filter((k) => !KINDS[k].recovery && tx && !tx.cannot_reason && tx[KINDS[k].adjustable] !== "");
      if (kinds.length === 1) pick(kinds[0], tx);
      if (!disputeId) setDispute((data?.disputes ?? []).find(isOpen)?.id ?? null);
    } catch (e) {
      setError(e.message);
    } finally {
      setFinding(false);
    }
  };

  useEffect(() => {
    if (disputeId) void lookup({ dispute_case_id: disputeId });
    // Opened from a dispute: looked up once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disputeId]);

  function pick(k, tx = found?.transaction) {
    setKind(k);
    setForm((f) => ({ ...f, amount: KINDS[k].recovery ? "" : (tx?.[KINDS[k].adjustable] ?? "") }));
  }

  const tx = found?.transaction;
  const recovery = Boolean(kind && KINDS[kind].recovery);
  const max = kind && !recovery ? Number(tx?.[KINDS[kind].adjustable]) : 0;
  const over = kind && !recovery && Number(form.amount) > max;
  const body =
    tx && kind && Number(form.amount) > 0 && !over && (!recovery || dispute)
      ? recovery
        ? { txn_type: kind, amount: form.amount, dispute_case_id: dispute }
        : { txn_type: kind, org_rrn: tx.rrn, amount: form.amount, ...(dispute ? { dispute_case_id: dispute } : {}) }
      : null;
  const walletAfter = recovery ? Number(tx?.debited_wallet?.avail_bal ?? 0) - Number(form.amount || 0) : null;
  const bodyKey = JSON.stringify(body);

  useEffect(() => {
    setPlan(null);
    setQuoteError("");
    if (!body) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setQuoting(true);
      balanceAdjustmentsApi
        .quote(JSON.parse(bodyKey))
        .then((r) => !cancelled && setPlan(rowsOf(r)[0] ?? null))
        .catch((e) => !cancelled && setQuoteError(e.message))
        .finally(() => !cancelled && setQuoting(false));
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // bodyKey stands for body.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyKey]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await balanceAdjustmentsApi.add({ ...body, reason: form.reason.trim(), reference: form.reference.trim() });
      notifications.success(response?.message ?? t("adjustmentSaved"));
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const disputes = found?.disputes ?? [];
  const openDispute = disputes.find((d) => String(d.id) === String(dispute)) ?? disputes.find(isOpen);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t("newAdjustment")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon={Send} disabled={!plan || !form.reason.trim()} loading={busy} onClick={save}>
            {t("submitAdjustment")}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {!disputeId && (
          <form
            className="grid gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (rrn.trim()) void lookup({ org_rrn: rrn.trim() });
            }}
          >
            <span className={labelClass}>{t("transactionRrn")}</span>
            <div className="flex gap-2">
              <input className={cn(inputClass, "flex-1 font-mono")} value={rrn} autoFocus onChange={(e) => setRrn(e.target.value.replace(/\s/g, ""))} placeholder="629214001846" />
              <Button type="submit" variant="secondary" icon={Search} loading={finding} disabled={!rrn.trim()}>
                {t("find")}
              </Button>
            </div>
            <span className="text-[11px] text-muted-foreground">{t("adjRrnHint")}</span>
          </form>
        )}

        {finding && !tx && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner size={14} /> {t("findingTxn")}
          </p>
        )}

        {tx && (
          <>
            <TxnCard tx={tx} />

            {openDispute && isOpen(openDispute) && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>
                  {t("txnDisputed", { number: openDispute.case_number, title: openDispute.title })} {t("adjClosesDispute")}
                </span>
              </div>
            )}
            {disputes.filter((d) => !isOpen(d)).length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {t("closedDisputes")}: {disputes.filter((d) => !isOpen(d)).map((d) => `${d.case_number} (${d.title})`).join(", ")}
              </p>
            )}

            {tx.cannot_reason ? (
              <Problems message={found.cannot_reason_text || tx.cannot_reason} />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(KINDS).map(([k, meta]) => {
                  // Recovery is offered only with a dispute and a debited wallet.
                  if (meta.recovery && !dispute) return null;
                  const left = meta.recovery ? null : tx[meta.adjustable];
                  const wallet = tx[meta.wallet];
                  const enabled = meta.recovery ? Boolean(wallet) : left !== "" && left != null;
                  const Icon = meta.icon;
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={!enabled}
                      onClick={() => pick(k)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50",
                        kind === k ? "border-primary bg-[var(--primary-light)]" : "border-border bg-card enabled:hover:border-primary/50",
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-sm font-bold">
                        <Icon size={15} className="text-primary" /> {typeLabel(t, k)}
                      </span>
                      {enabled ? (
                        <>
                          <span className="mt-1 block text-[11px] text-muted-foreground">
                            {t(k === "ADJUST_CREDIT" ? "adjTo" : "adjFrom", { name: wallet?.name ?? "—", acct: wallet?.acct_num ?? "" })}
                          </span>
                          {meta.recovery ? (
                            <span className="block text-[11px]">{t("recoveryHint")}</span>
                          ) : (
                            <span className="block text-[11px] font-semibold">{t("upTo", { amount: money(left, tx.currency_code) })}</span>
                          )}
                          {k === "ADJUST_DEBIT" && wallet?.avail_bal != null && <span className="block text-[11px] text-muted-foreground">{t("walletAvailable", { amount: money(wallet.avail_bal, tx.currency_code) })}</span>}
                        </>
                      ) : (
                        <span className="mt-1 block text-[11px] text-muted-foreground">{t(k === "ADJUST_CREDIT" ? "noCreditAdj" : k === "RECOVERY" ? "noRecovery" : "noDebitAdj")}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {tx.adjustments?.length > 0 && <EarlierAdjustments rows={tx.adjustments} currency={tx.currency_code} />}

            {kind && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  {t("amountIn", { currency: tx.currency_code })}
                  <input
                    className={cn(inputClass, "mt-1.5 text-base font-bold tabular-nums", over && "border-red-400")}
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(e) => set("amount")(amountInput(e.target.value, tx.amount_decimals ?? 2))}
                  />
                  {recovery ? (
                    <span className={cn("mt-1 block text-[11px] font-semibold", walletAfter < 0 ? "text-red-700" : "text-muted-foreground")}>
                      {t("recoveryAfter", { now: money(tx.debited_wallet?.avail_bal, tx.currency_code), after: money(walletAfter, tx.currency_code) })}
                    </span>
                  ) : (
                    <span className={cn("mt-1 block text-[11px] font-normal", over ? "text-red-700" : "text-muted-foreground")}>{t("adjMax", { amount: money(max, tx.currency_code) })}</span>
                  )}
                </label>
                <label className={labelClass}>
                  {t("txn:voucher")}
                  <input className={cn(inputClass, "mt-1.5")} maxLength={64} value={form.reference} onChange={(e) => set("reference")(e.target.value)} placeholder={t("txn:voucherPlaceholder")} />
                </label>
                <label className={cn(labelClass, "sm:col-span-2")}>
                  {t("reason")} <span className="text-red-500">*</span>
                  <input className={cn(inputClass, "mt-1.5")} maxLength={255} value={form.reason} onChange={(e) => set("reason")(e.target.value)} placeholder={t("reasonPlaceholder")} />
                </label>
              </div>
            )}
            {kind && (
              <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <Info size={12} className="mt-0.5 shrink-0" /> {t("adjAccounting")}
              </p>
            )}
          </>
        )}

        {quoting && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner size={12} /> {t("txn:quoting")}
          </p>
        )}
        {quoteError && <Problems message={quoteError} />}
        {plan && <PlanCard plan={plan} />}
        {error && <Problems message={error} />}
      </div>
    </Modal>
  );
}

// The transaction being adjusted, read-only.
export function TxnCard({ tx }) {
  const { t } = useTranslation(["deposits", "txn"]);
  const facts = [
    [t("rrn"), <span className="font-mono">{tx.rrn}</span>],
    [t("txn:type"), tx.txn_type_name ?? tx.txn_type],
    [t("date"), atIst(tx.posted_at)],
    [t("amount"), <b>{money(tx.amount, tx.currency_code)}</b>],
    [t("status"), <StatusBadge status={tx.status} variant="subtle" />],
    [t("description"), tx.description || "—"],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border bg-muted/30 p-3 text-xs sm:grid-cols-3">
      {facts.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 truncate">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function EarlierAdjustments({ rows, currency }) {
  const { t } = useTranslation(["deposits", "txn"]);
  return (
    <div>
      <p className="mb-1 text-xs font-bold">{t("earlierAdjustments")}</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase text-muted-foreground">
            <th className="py-1 pr-2">{t("rrn")}</th>
            <th className="py-1 pr-2">{t("txn:type")}</th>
            <th className="py-1 pr-2 text-right">{t("amount")}</th>
            <th className="py-1 pr-2">{t("date")}</th>
            <th className="py-1">{t("reason")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.rrn} className="border-t">
              <td className="py-1 pr-2 font-mono">{a.rrn}</td>
              <td className="py-1 pr-2">{typeLabel(t, a.txn_type)}</td>
              <td className="py-1 pr-2 text-right tabular-nums">{money(a.amount, currency)}</td>
              <td className="py-1 pr-2">{atIst(a.posted_at)}</td>
              <td className="py-1">{a.reason || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
