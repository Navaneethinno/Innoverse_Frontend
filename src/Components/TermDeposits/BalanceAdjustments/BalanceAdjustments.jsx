import { ListPanel } from "@/Components/Common/ListPanel";
import { useListSearch } from "@/Hooks/useListSearch";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, RefreshCw, Scale, Send } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { DrCr, TxnDialog } from "@/Components/Epurse/Accounts/AccountStatement";
import { money } from "@/Components/Epurse/Accounts/accountShared";
import { atIst } from "@/Components/Reports/Shared/reportShared";
import { RequestDialog } from "@/Components/Transactions/Transactions";
import { PlanCard, typeLabel } from "@/Components/Transactions/txnShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { balanceAdjustmentsApi } from "@/Services/TermDeposits/termDeposits.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { Problems, amountInput, inputClass, labelClass } from "../depositShared";
import { useLiveChannel } from "@/Hooks/useLiveChannel";

const STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "FAILED"];

// A type's direction: money into the wallet (CR) or out of it (DR).
const opOf = (option) => (option?.to === "CASH" ? "DR" : "CR");

// EPURSE > Balance Adjustments (menu 182): cash in / out at a counter and
// credit / debit corrections, posted through the transaction engine (fees,
// limits, history, receipts) when a checker approves, or at once for Self.
export function BalanceAdjustments() {
  const { t } = useTranslation(["deposits", "txn", "common"]);
  const can = usePagePermission();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  // Reference, client reference, reason, who asked or decided, either account.
  const { body: searchBody, latest: latestList, bind: searchBind } = useListSearch(() => setPage(1));
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [txn, setTxn] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const row = rowsOf(await latestList(balanceAdjustmentsApi.list({ ...searchBody, page, page_size: limit, ...(status ? { status } : {}) })))[0];
      setData({ items: row?.items ?? [], total: row?.total ?? 0 });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [searchBody, latestList, status, page, limit]);
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel("/config/ledger/adjustment/list", () => void load({ silent: true }));

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
    { key: "amount", label: t("amount"), render: (a) => <span className="whitespace-nowrap text-xs font-bold tabular-nums">{money(a.amount, a.currency_code)}</span> },
    { key: "fee_amount", label: t("txn:fee"), render: (a) => <span className="whitespace-nowrap text-xs tabular-nums">{Number(a.fee_amount) ? money(Number(a.fee_amount) + Number(a.tax_amount ?? 0), a.currency_code) : "—"}</span> },
    { key: "reason", label: t("reason"), align: "left", render: (a) => <span className={cn("line-clamp-2 text-xs", a.status === "FAILED" && "text-red-700")}>{a.status === "FAILED" ? a.status_desc : a.reason}</span> },
    { key: "status", label: t("status"), render: (a) => <StatusBadge status={a.status} variant="subtle" /> },
    { key: "requested_by", label: t("requestedBy"), render: (a) => <span className="text-xs">{a.requested_userid_name ?? a.requested_by ?? "—"}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (a) => <RowActions buttons={{ view: true }} onView={() => setOpenId(a.id)} /> },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Scale size={22} className="text-primary" /> {t("adjTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("adjSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
            {t("refresh")}
          </Button>
          {can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
              {t("newAdjustment")}
            </Button>
          )}
        </div>
      </div>

      <ListPanel
        tabs={[]}
        {...searchBind}
        searchPlaceholder={t("searchRequests")}
        filters={
          <>
            <FilterSelect
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={[{ value: "", label: t("anyStatus") }, ...STATUSES.map((s) => ({ value: s, label: t(`txn:reqStatus_${s}`) }))]}
            />
          </>
        }
      >
      <DataTable
        bare
        columns={columns}
        rows={data.items}
        rowKey={(a) => a.id}
        isLoading={loading}
        title={t("adjTitle")}
        emptyTitle={t("noAdjustments")}
        emptyDescription={t("noAdjustmentsHint")}
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
      </ListPanel>

      {adding && (
        <AdjustmentForm
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            void load();
          }}
        />
      )}
      {openId && <RequestDialog id={openId} api={balanceAdjustmentsApi} onClose={() => setOpenId(null)} onChanged={() => void load()} onOpenTxn={({ rrn }) => setTxn(rrn)} />}
      {txn && <TxnDialog rrn={txn} onClose={() => setTxn(null)} />}
    </div>
  );
}

// New adjustment: the type (cash in / out, credit / debit correction), the
// wallet and amount; the quote shows the fee and the balance after before
// it is sent.
function AdjustmentForm({ onClose, onSaved }) {
  const { t } = useTranslation(["deposits", "txn"]);
  const [types, setTypes] = useState(null);
  const [form, setForm] = useState({ txn_type: "", acct_num: "", amount: "", reason: "", reference: "" });
  const [plan, setPlan] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    balanceAdjustmentsApi
      .options({})
      .then((r) => {
        const list = (rowsOf(r)[0]?.txn_types ?? []).filter((x) => x.active !== false);
        setTypes(list);
        setForm((f) => ({ ...f, txn_type: f.txn_type || list[0]?.txn_type || "" }));
      })
      .catch((e) => setError(e.message));
  }, []);

  const option = types?.find((x) => x.txn_type === form.txn_type);
  const body = option && form.acct_num && Number(form.amount) > 0 ? { txn_type: form.txn_type, operation_type: opOf(option), acct_num: form.acct_num, amount: form.amount } : null;
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
      const response = await balanceAdjustmentsApi.add({ ...body, reason: form.reason.trim(), ...(form.reference.trim() ? { reference: form.reference.trim() } : {}) });
      notifications.success(response?.message ?? t("adjustmentSaved"));
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
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
      {!types ? (
        <Spinner size={18} />
      ) : (
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">{t("adjFormHint")}</p>
          <div className="grid grid-cols-2 gap-2">
            {types.map((x) => (
              <button
                key={x.txn_type}
                type="button"
                onClick={() => set("txn_type")(x.txn_type)}
                className={cn("rounded-xl border px-3 py-2 text-left transition-all", form.txn_type === x.txn_type ? "border-primary bg-[var(--primary-light)]" : "border-border bg-card hover:border-primary/50")}
              >
                <span className="block text-sm font-bold">{x.name}</span>
                <span className="block text-[11px] text-muted-foreground">{t(`deposits:adjKind_${x.txn_type}`, { defaultValue: `${x.from} → ${x.to}` })}</span>
              </button>
            ))}
          </div>
          <label className={labelClass}>
            {t("walletNumber")}
            <input className={cn(inputClass, "mt-1.5 font-mono")} value={form.acct_num} onChange={(e) => set("acct_num")(e.target.value.replace(/\s/g, ""))} placeholder="20784000000021" />
          </label>
          <label className={labelClass}>
            {t("amountIn", { currency: plan?.currency_code ?? "" })}
            <input className={cn(inputClass, "mt-1.5 text-base font-bold tabular-nums")} inputMode="decimal" value={form.amount} onChange={(e) => set("amount")(amountInput(e.target.value, plan?.amount_decimals ?? 2))} placeholder="0.00" />
          </label>
          <label className={labelClass}>
            {t("reason")}
            <input className={cn(inputClass, "mt-1.5")} maxLength={255} value={form.reason} onChange={(e) => set("reason")(e.target.value)} placeholder={t("reasonPlaceholder")} />
          </label>
          <label className={labelClass}>
            {t("referenceOptional")}
            <input className={cn(inputClass, "mt-1.5")} maxLength={64} value={form.reference} onChange={(e) => set("reference")(e.target.value)} placeholder={t("referencePlaceholder")} />
          </label>
          {quoting && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner size={12} /> {t("txn:quoting")}
            </p>
          )}
          {quoteError && <Problems message={quoteError} />}
          {plan && <PlanCard plan={plan} />}
        </div>
      )}
      {error && (
        <div className="mt-3">
          <Problems message={error} />
        </div>
      )}
    </Modal>
  );
}
