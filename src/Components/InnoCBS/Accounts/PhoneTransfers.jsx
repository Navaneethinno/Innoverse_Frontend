import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { accountsApi } from "@/Services/Epurse/accounts.api";
import { cn } from "@/Utils/Lib/utils";
import { accountDate } from "./accountShared";
import { TxnDialog } from "./AccountStatement";

const STATUS_TONES = {
  PENDING: "bg-amber-50 text-amber-700",
  CLAIMED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-600",
  RETURNED: "bg-sky-50 text-sky-700",
};
// Opens on the money waiting now.
// EPURSE > Accounts (menu 178) › Money waiting for numbers: money customers
// sent to phone numbers with no account. It waits in the institution's
// holding account (PHONE_TRANSFER_HOLD) until claimed, cancelled or returned.
export function PhoneTransfers() {
  const { t } = useTranslation(["accounts", "common"]);
  const [rrn, setRrn] = useState(null);
  // Tabs (Waiting, Claimed...), search (number, sender, account, RRN),
  // paging: the shared list. summary.totals: per-currency totals of all
  // that match, not just this page.
  const list = useServerList({ api: "/config/account/phone_transfer/list", call: accountsApi.phoneTransfers });
  const totals = list.summary?.totals ?? [];

  const rrnLink = (value) =>
    value ? (
      <button type="button" onClick={() => setRrn(value)} className="font-mono text-[11px] text-primary hover:underline">
        {value}
      </button>
    ) : null;

  const columns = [
    { key: "phone_number", label: t("ptPhone"), render: (r) => <span className="font-mono text-xs font-bold">{r.phone_number}</span> },
    {
      key: "sender",
      label: t("ptSender"),
      render: (r) => (
        <div>
          <p className="text-xs font-semibold">{r.sender?.name || "—"}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{r.sender_acct_num ?? "—"}</p>
        </div>
      ),
    },
    { key: "amount", label: t("ptAmount"), render: (r) => <span className="whitespace-nowrap text-xs font-semibold">{r.amount} {r.currency_code}</span> },
    {
      key: "status",
      label: t("status"),
      render: (r) => <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", STATUS_TONES[r.status] ?? "bg-muted")}>{t(`ptStatus_${r.status}`, { defaultValue: r.status })}</span>,
    },
    { key: "created_at", label: t("ptSentOn"), render: (r) => <span className="whitespace-nowrap text-xs">{accountDate(r.created_at)}</span> },
    {
      key: "expires_at",
      label: t("ptReturnedOn"),
      render: (r) => <span className="whitespace-nowrap text-xs">{r.status === "PENDING" ? (r.expires_at ? accountDate(r.expires_at) : t("ptUntilClaimed")) : "—"}</span>,
    },
    {
      key: "closed_at",
      label: t("ptClosed"),
      render: (r) => (
        <div className="text-xs">
          <p className="whitespace-nowrap">{accountDate(r.closed_at)}</p>
          {r.receiver?.name && <p className="text-[10px] text-muted-foreground">{t("ptClaimedBy", { name: r.receiver.name })}</p>}
        </div>
      ),
    },
    {
      key: "rrn",
      label: t("ptTransactions"),
      sortable: false,
      render: (r) => (
        <div className="flex flex-col items-start">
          {rrnLink(r.send_rrn)}
          {rrnLink(r.close_rrn)}
        </div>
      ),
    },
    { key: "inst_profile_name", label: t("institution"), render: (r) => <span className="text-xs">{r.inst_profile_name ?? "—"}</span> },
  ];

  return (
    <>
      {/* Everything the filters match, not just this page; with Waiting it
          equals the holding account's balance. */}
      <ListTable
        list={list}
        summary={
          totals.length > 0 && (
            <div className="flex flex-wrap gap-3 border-b border-border p-3">
              {totals.map((x) => (
                <div key={x.currency_code} className="min-w-[12rem] rounded-2xl border border-border bg-card px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {list.toolbar.tab === "PENDING" ? t("ptWaitingNow") : t("ptTotal")} · {x.currency_code}
                  </p>
                  <p className="mt-0.5 text-xl font-black tabular-nums text-foreground">{x.amount}</p>
                  <p className="text-[11px] text-muted-foreground">{t("ptCount", { count: Number(x.count) || 0 })}</p>
                </div>
              ))}
            </div>
          )
        }
        columns={columns}
        rowKey={(r) => r.id}
        title={t("ptTitle")}
        emptyTitle={t("ptEmpty")}
      />
      {rrn && <TxnDialog rrn={rrn} onClose={() => setRrn(null)} />}
    </>
  );
}
