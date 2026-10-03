import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Download, Printer, RotateCcw } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { money } from "@/Components/Epurse/Accounts/accountShared";
import { useBrandTheme } from "@/Hooks/Providers/BrandThemeProvider";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { transactionsApi } from "@/Services/Transactions/transactions.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { PosReceipt } from "./Receipt/PosReceipt";
import { downloadReceiptPdf } from "./Receipt/receiptPdf";
import { receiptSlip } from "./Receipt/receiptSlip";

// Pieces shared by Transactions (journal, requests), Balance Adjustments and
// the transaction reports. Times are UTC and shown on the platform clock.


// A transaction type's name: the server's when given, else words.
export const typeLabel = (t, code, name) => (name && name !== code ? name : t(`txn:type_${code}`, { defaultValue: String(code ?? "—").replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()) }));

// The quote ("Plan"): who pays whom, the fee and tax, what leaves the payer
// and reaches the receiver, and each party's limits with what is left.
export function PlanCard({ plan }) {
  const { t } = useTranslation("txn");
  const cur = plan.currency_code;
  const m = (v) => money(v, cur);
  const fee = plan.fee ?? {};
  const side = (p, cash) => (
    <div className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2">
      {p ? (
        <>
          <p className="truncate text-sm font-bold">{p.name}</p>
          <p className="font-mono text-[11px] text-muted-foreground">{p.acct_num}</p>
          {p.avail_bal != null && <p className="amount-fit text-[11px] text-muted-foreground">{t("available", { amount: m(p.avail_bal) })}</p>}
        </>
      ) : (
        <p className="text-sm font-bold text-muted-foreground">{cash}</p>
      )}
    </div>
  );
  return (
    <div className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-center gap-2">
        {side(plan.from, t("cash"))}
        <ArrowRight size={18} className="shrink-0 text-emerald-700" />
        {side(plan.to, t("cash"))}
      </div>
      <dl className="grid gap-1 text-sm">
        <Line label={t("amount")} value={m(plan.amount)} />
        <Line label={Number(fee.fee) > 0 ? `${fee.fee_name || t("fee")} · ${t(`payFrom_${fee.pay_from}`, { defaultValue: fee.pay_from ?? "" })}` : t("noFee")} value={m(fee.fee ?? 0)} muted={!(Number(fee.fee) > 0)} />
        {Number(fee.tax) > 0 && <Line label={t("tax")} value={m(fee.tax)} />}
        <div className="mt-1 grid gap-1 border-t border-border pt-2">
          <Line label={t("totalDebit")} value={m(plan.total_debit)} strong />
          <Line label={t("netCredit")} value={m(plan.net_credit)} strong tone="text-emerald-700" />
        </div>
        {plan.refundable != null && <Line label={t("refundableLeft")} value={m(plan.refundable)} />}
        {plan.org_rrn && <Line label={t("original")} value={plan.org_rrn} />}
      </dl>
      {fee.rule_code && <p className="text-[11px] text-muted-foreground">{t("pricedBy", { rule: fee.rule_code })}</p>}
      {plan.limits?.length > 0 && (
        <div className="grid gap-2">
          {plan.limits.map((party) => (
            <div key={`${party.side}-${party.acct_num}`} className="rounded-xl border border-border bg-card p-2.5">
              <p className="mb-1 text-[11px] font-bold">
                {t(`side_${party.side}`, { defaultValue: party.side })} · {party.name}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(party.limits ?? []).map((l, i) => (
                  <span key={`${l.limit_type}-${i}`} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums">
                    {String(l.limit_type).replace(/_/g, " ").toLowerCase()}:{" "}
                    {l.max_count != null ? t("leftOfCount", { left: l.left_count, max: l.max_count }) : t("leftOf", { left: m(l.left_amount), max: m(l.max_amount) })}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Line({ label, value, strong, muted, tone }) {
  return (
    <div className={cn("flex min-w-0 justify-between gap-3", strong && "font-black", muted && "text-muted-foreground")}>
      <dt className={strong ? "" : "text-muted-foreground"}>{label}</dt>
      <dd className={cn("amount-fit text-right tabular-nums", tone)}>{value}</dd>
    </div>
  );
}

// The frozen receipt, printed out of a POS terminal on screen. Reprint has the
// server count a duplicate (the slip then says DUPLICATE) and prints it;
// the PDF is the same slip.
export function ReceiptDialog({ txnId, rrn, onClose }) {
  const { t } = useTranslation("txn");
  const { logoUrl, displayName } = useBrandTheme();
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const pos = useRef(null);
  const key = txnId ? { id: txnId } : { rrn };

  useEffect(() => {
    let cancelled = false;
    transactionsApi
      .receipt(txnId ? { id: txnId } : { rrn })
      .then((r) => !cancelled && setReceipt(rowsOf(r)[0] ?? false))
      .catch((e) => {
        notifications.error(e.message);
        if (!cancelled) setReceipt(false);
      });
    return () => {
      cancelled = true;
    };
  }, [txnId, rrn]);

  const slip = receipt ? receiptSlip(receipt, t, displayName) : null;

  const reprint = async () => {
    setBusy(true);
    try {
      setReceipt(rowsOf(await transactionsApi.receipt({ ...key, reprint: true }))[0] ?? receipt);
      pos.current?.finish();
      window.setTimeout(() => window.print(), 80);
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      await downloadReceiptPdf({ slip, logoUrl });
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t("receipt")}
      footer={
        slip && (
          <>
            <ActionIconButton label={t("rcptReplay")} icon={RotateCcw} onClick={() => pos.current?.replay()} className="mr-auto" />
            <Button variant="secondary" icon={Download} loading={downloading} onClick={download}>
              {t("rcptDownload")}
            </Button>
            <Button icon={Printer} loading={busy} onClick={reprint}>
              {t("reprint")}
            </Button>
          </>
        )
      }
    >
      {receipt === null && <Spinner size={18} />}
      {receipt === false && <p className="text-sm text-muted-foreground">{t("noReceipt")}</p>}
      {slip && <PosReceipt ref={pos} slip={slip} logo={logoUrl} />}
    </Modal>
  );
}
