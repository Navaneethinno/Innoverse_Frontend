import { DateInput } from "@/Components/Common/DateInput";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownLeft, ArrowUpRight, Eye, Search } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { accountsApi } from "@/Services/Epurse/accounts.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { accountDate, dayDate, money } from "./accountShared";

export const TXN_TYPES = ["ADJUST_CREDIT", "ADJUST_DEBIT", "TD_FUNDING", "TD_INTEREST_PAYOUT", "TD_SETTLEMENT", "REVERSAL"];
const inputClass = "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

// DR / CR with an arrow: credit in green, debit in red.
export function DrCr({ type }) {
  const { t } = useTranslation("accounts");
  const credit = type === "CR";
  const Icon = credit ? ArrowDownLeft : ArrowUpRight;
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-black", credit ? "text-emerald-700" : "text-red-700")}>
      <Icon size={12} /> {t(credit ? "credit" : "debit")}
    </span>
  );
}

const txnTypeLabel = (t, type) => t(`txnType_${type}`, { defaultValue: type ?? "—" });

// The account's statement (/config/account/ledger), newest first, with
// date and type filters. A line opens its whole transaction.
export function AccountStatement({ account, onClose }) {
  const { t } = useTranslation(["accounts", "common"]);
  const [filters, setFilters] = useState({ from: "", to: "", txn_type: "" });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [data, setData] = useState({ lines: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [txn, setTxn] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const body = Object.fromEntries(Object.entries(applied).filter(([, v]) => v));
      const row = rowsOf(await accountsApi.ledger({ id: account.id, page, limit, ...body }))[0];
      setData({ lines: row?.lines ?? [], total: row?.total ?? 0 });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [account.id, applied, page, limit]);
  useEffect(() => {
    void load();
  }, [load]);

  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));
  const columns = [
    { key: "tran_date_time", label: t("date"), render: (l) => <span className="whitespace-nowrap text-xs">{accountDate(l.tran_date_time)}</span> },
    {
      key: "txn_desc",
      label: t("description"),
      align: "left",
      render: (l) => (
        <div className="min-w-0">
          <p className="text-xs font-semibold">{l.txn_short_desc || txnTypeLabel(t, l.txn_type)}</p>
          <p className="text-[10px] text-muted-foreground">{txnTypeLabel(t, l.txn_type)} · {l.rrn}</p>
        </div>
      ),
    },
    { key: "operation_type", label: t("drCr"), render: (l) => <DrCr type={l.operation_type} /> },
    { key: "txn_amount", label: t("amount"), render: (l) => <span className="whitespace-nowrap text-xs font-bold tabular-nums">{money(l.txn_amount, l.currency_code)}</span> },
    { key: "entry_amount", label: t("balanceAfter"), render: (l) => <span className="whitespace-nowrap text-xs tabular-nums">{money(l.entry_amount, l.currency_code)}</span> },
    { key: "txn_status", label: t("status"), render: (l) => <StatusBadge status={l.txn_status} variant="subtle" /> },
    {
      key: "open",
      label: t("common:actions"),
      sortable: false,
      render: (l) => <ActionIconButton label={t("viewTxn")} icon={Eye} onClick={() => setTxn(l.txn_id)} />,
    },
  ];

  return (
    <Modal open onClose={onClose} size="xl" title={t("statementTitle", { number: account.acct_num })} subtitle={account.owner?.name}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(filters);
          setPage(1);
        }}
        className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="text-xs font-semibold text-slate-700">
          {t("from")}
          <DateInput className={cn(inputClass, "mt-1")} value={filters.from} onChange={(e) => set("from")(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          {t("to")}
          <DateInput className={cn(inputClass, "mt-1")} value={filters.to} onChange={(e) => set("to")(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          {t("txnType")}
          <FilterSelect className="mt-1" value={filters.txn_type} onChange={set("txn_type")} options={[{ value: "", label: t("anyTxnType") }, ...TXN_TYPES.map((v) => ({ value: v, label: txnTypeLabel(t, v) }))]} />
        </label>
        <div className="flex items-end">
          <Button type="submit" size="sm" icon={Search} className="w-full">
            {t("search")}
          </Button>
        </div>
      </form>
      <DataTable
        columns={columns}
        rows={data.lines}
        rowKey={(l) => l.id}
        isLoading={loading}
        title={t("statement")}
        emptyTitle={t("noLines")}
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
      {txn && <TxnDialog txnId={txn} onClose={() => setTxn(null)} />}
    </Modal>
  );
}

// One transaction with both sides (/config/account/txn), by txn_id or rrn.
export function TxnDialog({ txnId, rrn, onClose }) {
  const { t } = useTranslation("accounts");
  const [txn, setTxn] = useState(null);
  // Callers pass an inline onClose; a ref keeps it out of the fetch's deps.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    let cancelled = false;
    accountsApi
      .txn(txnId ? { txn_id: txnId } : { rrn })
      .then((r) => !cancelled && setTxn(rowsOf(r)[0] ?? null))
      .catch((error) => {
        notifications.error(error.message);
        if (!cancelled) close.current();
      });
    return () => {
      cancelled = true;
    };
  }, [txnId, rrn]);

  return (
    <Modal open onClose={onClose} size="lg" title={t("txnTitle", { rrn: txn?.rrn ?? rrn ?? "" })}>
      {txn ? <TxnDetail txn={txn} /> : <div className="flex justify-center py-8"><Spinner size={20} /></div>}
    </Modal>
  );
}

// A transaction's header and its lines: also the deposit's funding
// transaction, which `get` already carries.
export function TxnDetail({ txn }) {
  const { t } = useTranslation("accounts");
  const facts = [
    ["txnType", txnTypeLabel(t, txn.txn_type)],
    ["amount", money(txn.txn_amount, txn.currency_code)],
    ["businessDate", dayDate(txn.business_date)],
    ["date", accountDate(txn.tran_date_time)],
    ["source", [txn.source_module, txn.source_id].filter(Boolean).join(" #") || "—"],
    ["postedBy", txn.user_name ?? "—"],
  ];
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{txn.txn_desc}</p>
        <StatusBadge status={txn.status} variant="subtle" />
      </div>
      <dl className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {facts.map(([key, value]) => (
          <div key={key} className="rounded-xl border border-border bg-card px-3 py-2">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t(key)}</dt>
            <dd className="mt-0.5 text-xs font-semibold text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("lines")}</p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("accountNumber")}</th>
              <th className="px-3 py-2">{t("drCr")}</th>
              <th className="px-3 py-2 text-right">{t("amount")}</th>
              <th className="px-3 py-2 text-right">{t("balanceAfter")}</th>
            </tr>
          </thead>
          <tbody>
            {(txn.lines ?? []).map((l) => (
              <tr key={l.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono">{l.acct_num}</td>
                <td className="px-3 py-2"><DrCr type={l.operation_type} /></td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(l.txn_amount, l.currency_code)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{money(l.entry_amount, l.currency_code)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
