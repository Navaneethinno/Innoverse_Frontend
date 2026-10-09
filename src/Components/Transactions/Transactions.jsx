import { ListPanel } from "@/Components/Common/ListPanel";
import { useListSearch } from "@/Hooks/useListSearch";
import { DateInput } from "@/Components/Common/DateInput";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowLeftRight, Eye, Ban, CheckCircle2, History, Plus, Receipt, RefreshCw, RotateCcw, Search, Undo2, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { DrCr } from "@/Components/Epurse/Accounts/AccountStatement";
import { money } from "@/Components/Epurse/Accounts/accountShared";
import { ExportButtons, atIst } from "@/Components/Reports/Shared/reportShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { feeSchedulesApi, transactionRequestsApi, transactionsApi } from "@/Services/Transactions/transactions.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ActionButtons, Facts, NarrationDialog, Section, inputClass, labelClass } from "../TermDeposits/depositShared";
import { MiniTable, StatusStrip, Tabs } from "../Loans/loanShared";
import { NewRequest } from "./NewRequest";
import { PlanCard, ReceiptDialog, typeLabel } from "./txnShared";
import { useLiveChannel } from "@/Hooks/useLiveChannel";

const STATUSES = ["POSTED", "REVERSED", "FAILED"];
const REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "FAILED"];
const CHANNELS = ["ADMIN", "SCHEDULER", "APP", "WEB", "POS"];
const INITIATORS = ["STAFF", "SYSTEM", "CUSTOMER", "MERCHANT"];
const EMPTY = { search: "", status: "", txn_type: "", channel_type: "", initiator_type: "", from: "", to: "", min_amount: "", max_amount: "" };
const clean = (f) => Object.fromEntries(Object.entries(f).filter(([, v]) => String(v ?? "").trim() !== "").map(([k, v]) => [k, String(v).trim()]));

// EPURSE > Transactions (menu 189): the journal of every money movement
// (failed attempts included), and the staff requests that make them.
export function Transactions() {
  const { t } = useTranslation(["txn", "common"]);
  const can = usePagePermission();
  const [tab, setTab] = useState("journal");
  const [screen, setScreen] = useState(null);
  const [adding, setAdding] = useState(null);
  const [reload, setReload] = useState(0);

  if (screen?.txn) return <TxnView query={screen.txn} onBack={() => setScreen(null)} onOpenRequest={(id) => setScreen({ request: id })} onStart={setAdding} />;

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <ArrowLeftRight size={22} className="text-primary" /> {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {can("Add") && (
          <Button size="sm" icon={Plus} onClick={() => setAdding({})}>
            {t("newTransaction")}
          </Button>
        )}
      </div>
      <Tabs tabs={[{ key: "journal" }, { key: "requests" }]} value={tab} onChange={setTab} />
      {tab === "journal" ? <Journal key={reload} onOpen={(q) => setScreen({ txn: q })} /> : <Requests key={reload} openId={screen?.request} onOpenTxn={(q) => setScreen({ txn: q })} onClose={() => setScreen(null)} />}
      {screen?.request && tab === "journal" && <RequestDialog id={screen.request} onClose={() => setScreen(null)} onOpenTxn={(q) => setScreen({ txn: q })} onChanged={() => setReload((n) => n + 1)} />}
      {adding && (
        <NewRequest
          preset={adding.txn_type ? adding : null}
          onClose={() => setAdding(null)}
          onDone={() => {
            setAdding(null);
            setTab("requests");
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}

// The journal: filters, newest first, Excel / CSV of the same filters.
function Journal({ onOpen }) {
  const { t } = useTranslation(["txn", "common"]);
  const [filters, setFilters] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const types = useTxnTypes();

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const row = rowsOf(await transactionsApi.list({ page, page_size: limit, ...clean(applied) }))[0];
      setData({ items: row?.items ?? [], total: row?.total ?? 0 });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [applied, page, limit]);
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel("/config/transaction/list", () => void load({ silent: true }));

  const set = (key) => (v) => setFilters((f) => ({ ...f, [key]: v }));
  const columns = [
    {
      key: "rrn",
      label: "RRN",
      render: (x) => (
        <button type="button" onClick={() => onOpen({ id: x.id })} className="text-left">
          <span className="block font-mono text-xs font-bold text-primary hover:underline">{x.rrn}</span>
          <span className="block text-[10px] text-muted-foreground">{atIst(x.tran_date_time)}</span>
        </button>
      ),
    },
    { key: "txn_type", label: t("type"), render: (x) => <span className="text-xs font-semibold">{typeLabel(t, x.txn_type, x.txn_short_desc)}</span> },
    { key: "txn_amount", label: t("amount"), render: (x) => <span className="whitespace-nowrap text-xs font-bold tabular-nums">{money(x.txn_amount, x.currency_code)}</span> },
    { key: "fee_amount", label: t("fee"), render: (x) => <span className="whitespace-nowrap text-xs tabular-nums">{Number(x.fee_amount) ? money(x.fee_amount, x.currency_code) : "—"}</span> },
    { key: "txn_desc", label: t("description"), align: "left", render: (x) => <span className="line-clamp-2 text-xs">{x.status === "FAILED" ? <span className="text-red-700">{x.status_desc}</span> : x.txn_desc || "—"}</span> },
    { key: "channel_type", label: t("channel"), render: (x) => <span className="text-[11px]">{x.channel_type} · {x.initiator_type}</span> },
    { key: "status", label: t("status"), render: (x) => <StatusBadge status={x.status} variant="subtle" /> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (x) => <RowActions buttons={{ view: true }} onView={() => onOpen({ id: x.id })} /> },
  ];

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(filters);
          setPage(1);
        }}
        className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <input className={cn(inputClass, "lg:col-span-2")} placeholder={t("searchJournal")} value={filters.search} onChange={(e) => set("search")(e.target.value)} />
        <FilterSelect value={filters.txn_type} onChange={set("txn_type")} options={[{ value: "", label: t("anyType") }, ...types.map((x) => ({ value: x.code, label: x.name }))]} />
        <FilterSelect value={filters.status} onChange={set("status")} options={[{ value: "", label: t("anyStatus") }, ...STATUSES.map((s) => ({ value: s, label: t(`status_${s}`) }))]} />
        <FilterSelect value={filters.channel_type} onChange={set("channel_type")} options={[{ value: "", label: t("anyChannel") }, ...CHANNELS.map((c) => ({ value: c, label: c }))]} />
        <FilterSelect value={filters.initiator_type} onChange={set("initiator_type")} options={[{ value: "", label: t("anyInitiator") }, ...INITIATORS.map((c) => ({ value: c, label: t(`initiator_${c}`) }))]} />
        <div className="grid grid-cols-2 gap-2">
          <DateInput title={t("from")} className={cn(inputClass, "min-w-0 px-2")} value={filters.from} onChange={(e) => set("from")(e.target.value)} />
          <DateInput title={t("to")} className={cn(inputClass, "min-w-0 px-2")} value={filters.to} onChange={(e) => set("to")(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input className={inputClass} inputMode="decimal" placeholder={t("minAmount")} value={filters.min_amount} onChange={(e) => set("min_amount")(e.target.value.replace(/[^\d.]/g, ""))} />
          <input className={inputClass} inputMode="decimal" placeholder={t("maxAmount")} value={filters.max_amount} onChange={(e) => set("max_amount")(e.target.value.replace(/[^\d.]/g, ""))} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2 lg:col-span-4">
          <div className="flex gap-2">
            <Button type="submit" size="sm" icon={Search}>
              {t("search")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setFilters(EMPTY);
                setApplied(EMPTY);
                setPage(1);
              }}
            >
              {t("clear")}
            </Button>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
              {t("refresh")}
            </Button>
          </div>
          <ExportButtons exportFile={(format) => transactionsApi.export({ ...clean(applied), format })} />
        </div>
      </form>
      <DataTable
        columns={columns}
        rows={data.items}
        rowKey={(x) => x.id}
        isLoading={loading}
        title={t("journal")}
        emptyTitle={t("noTransactions")}
        serverSorted
        serverPagination={{
          page,
          totalPages: Math.max(1, Math.ceil(data.total / limit)),
          totalRecords: data.total,
          onPageChange: setPage,
          limit,
          onLimitChange: (n) => {
            setLimit(Math.min(n, 200));
            setPage(1);
          },
        }}
      />
    </>
  );
}

// The types for the journal's filter: every Active financial type (the
// fee schedule options' list); without access to that, the request types.
function useTxnTypes() {
  const [types, setTypes] = useState([]);
  useEffect(() => {
    feeSchedulesApi
      .options({})
      .then((r) => (rowsOf(r)[0]?.txn_types ?? []).map((x) => ({ code: x.code, name: x.name })))
      .catch(() => transactionsApi.options({}).then((r) => (rowsOf(r)[0]?.txn_types ?? []).map((x) => ({ code: x.txn_type, name: x.name }))))
      .then(setTypes)
      .catch(() => setTypes([]));
  }, []);
  return types;
}

// One transaction: header, amounts and origin, the legs, each party's
// side, the source record, reversal links and the receipt. Reverse / refund
// start a request (menu Add).
function TxnView({ query, onBack, onOpenRequest, onStart }) {
  const { t } = useTranslation(["txn", "common"]);
  const can = usePagePermission();
  const [q, setQ] = useState(query);
  const [x, setX] = useState(null);
  const [receipt, setReceipt] = useState(false);
  const [history, setHistory] = useState(null);
  const qKey = JSON.stringify(q);

  useEffect(() => {
    let cancelled = false;
    setX(null);
    transactionsApi
      .get(JSON.parse(qKey))
      .then((r) => !cancelled && setX(rowsOf(r)[0] ?? null))
      .catch((e) => notifications.error(e.message));
    return () => {
      cancelled = true;
    };
  }, [qKey]);

  if (!x) {
    return (
      <PageSkeleton />
    );
  }

  const cur = x.currency_code;
  const m = (v) => money(v, cur);
  const posted = x.status === "POSTED";
  const engine = ["TXN_REQUEST", "ADJUSTMENT", "PORTAL"].includes(x.source_module);
  const buttons = [
    { key: "receipt", label: t("receipt"), icon: Receipt, run: () => setReceipt(true) },
    posted && x.txn_type === "MERCHANT_PAYMENT" && can("Add") && { key: "refund", label: t("refund"), icon: RotateCcw, run: () => onStart({ txn_type: "MERCHANT_REFUND", org_rrn: x.rrn }) },
    posted && engine && x.txn_type !== "REVERSAL" && can("Add") && { key: "reverse", label: t("reverse"), icon: Undo2, variant: "danger", run: () => onStart({ txn_type: "REVERSAL", org_rrn: x.rrn }) },
  ];

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {t("backToJournal")}
      </button>
      <div className={cn("mb-4 rounded-2xl border bg-card p-4", x.status === "FAILED" ? "border-red-300" : "border-border")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-black">{x.rrn}</h1>
              <StatusBadge status={x.status} />
            </div>
            <p className="mt-1 text-sm font-semibold">{typeLabel(t, x.txn_type, x.txn_short_desc)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {atIst(x.tran_date_time)} · {t("businessDateX", { date: x.business_date })} · {x.user_name || "—"} · {x.inst_profile_name}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="amount-fit text-xl font-black tabular-nums sm:text-2xl">{m(x.txn_amount)}</p>
            {Number(x.fee_amount) > 0 && <p className="text-xs text-muted-foreground">{t("plusFee", { fee: m(x.fee_amount), name: x.fee_name || t("fee"), payer: t(`payFrom_${x.fee_pay_from}`, { defaultValue: x.fee_pay_from ?? "" }) })}</p>}
          </div>
        </div>
        {x.status === "FAILED" && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {x.status_desc} {x.error_code && <span className="font-mono opacity-70">({x.error_code})</span>}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2 text-[11px]">
            {x.reversal_of && (
              <button type="button" onClick={() => setQ({ id: x.reversal_of.id })} className="rounded-full bg-blue-50 px-2.5 py-1 font-bold text-blue-700 hover:underline">
                {t("reverses", { rrn: x.reversal_of.rrn })}
              </button>
            )}
            {x.reversed_by && (
              <button type="button" onClick={() => setQ({ id: x.reversed_by.id })} className="rounded-full bg-orange-50 px-2.5 py-1 font-bold text-orange-700 hover:underline">
                {t("reversedBy", { rrn: x.reversed_by.rrn })}
              </button>
            )}
            {x.org_rrn && !x.reversal_of && (
              <button type="button" onClick={() => setQ({ rrn: x.org_rrn })} className="rounded-full bg-muted px-2.5 py-1 font-bold hover:underline">
                {t("originalX", { rrn: x.org_rrn })}
              </button>
            )}
          </div>
          <ActionButtons buttons={buttons} />
        </div>
      </div>

      <div className="grid gap-4">
        <Facts
          rows={[
            [t("description"), x.txn_desc || "—"],
            [t("channel"), [x.channel_type, x.channel_name].filter(Boolean).join(" · ") || "—"],
            [t("initiator"), [x.initiator_type, x.initiator_entity_type && `${x.initiator_entity_type} #${x.initiator_entity_id}`].filter(Boolean).join(" · ")],
            [t("source"), x.source ? `${x.source.module} · ${x.source.reference ?? x.source.id}` : x.source_module || "—"],
            x.fee_rule_code && [t("feeRule"), `${x.fee_schedule_code ?? ""} / ${x.fee_rule_code}`],
            x.client_reference && [t("clientReference"), x.client_reference],
            x.merchant_name && [t("merchant"), x.merchant_name],
            // POS: the terminal, the store and the store user who made it.
            x.store_id && [t("store"), x.store_name ?? `#${x.store_id}`],
            x.terminal_id && [t("terminal"), x.terminal_id],
            x.store_id && [t("doneBy"), x.portal_user_name ?? t("doneByMerchant")],
            (x.device_type || x.device_id) && [t("device"), [x.device_type, x.device_id].filter(Boolean).join(" · ")],
            x.digital_product_name && [t("digitalProduct"), x.digital_product_name],
          ]}
        />
        {x.source?.module === "TXN_REQUEST" && (
          <Button variant="outline" size="sm" icon={Eye} className="w-fit" onClick={() => onOpenRequest(x.source.id)}>
            {t("openRequest", { ref: x.source.reference })}
          </Button>
        )}
        {x.source && x.source.module !== "TXN_REQUEST" && <p className="text-xs text-muted-foreground">{t("openSourceIn", { ref: x.source.reference ?? x.source.id, menu: x.source.menu_name ?? x.source.module })}</p>}

        <Section title={t("legs")}>
          <MiniTable
            rows={x.lines}
            empty={t("noLegs")}
            columns={[
              { key: "acct_num", label: t("account"), render: (l) => <span className="font-mono">{l.acct_num}</span> },
              { key: "operation_type", label: t("drCr"), render: (l) => <DrCr type={l.operation_type} /> },
              { key: "txn_amount", label: t("amount"), align: "right", render: (l) => m(l.txn_amount) },
              { key: "leg_kind", label: t("leg"), render: (l) => `${t(`leg_${l.leg_kind}`, { defaultValue: l.leg_kind ?? "" })} · ${l.party_role ?? ""}` },
              { key: "acct_class", label: t("class"), render: (l) => l.acct_class ?? "—" },
              { key: "entry_amount", label: t("balanceAfter"), align: "right", render: (l) => m(l.entry_amount) },
            ]}
          />
        </Section>
        <Section title={t("parties")}>
          <MiniTable
            rows={x.parties}
            empty={t("noParties")}
            columns={[
              { key: "party_name", label: t("party"), render: (p) => <b>{p.party_name}</b> },
              { key: "acct_num", label: t("account"), render: (p) => <span className="font-mono">{p.acct_num}</span> },
              { key: "direction", label: t("drCr"), render: (p) => <DrCr type={p.direction} /> },
              { key: "description", label: t("description") },
              { key: "net_amount", label: t("net"), align: "right", render: (p) => <b className={Number(p.net_amount) < 0 ? "text-red-700" : "text-emerald-700"}>{m(p.net_amount)}</b> },
              { key: "balance_after", label: t("balanceAfter"), align: "right", render: (p) => m(p.balance_after) },
              { key: "counterparty_name", label: t("counterparty"), render: (p) => p.counterparty_name || p.merchant_name || "—" },
              {
                key: "history",
                label: "",
                render: (p) =>
                  p.entity_type && (
                    <Button variant="ghost" size="sm" icon={History} onClick={() => setHistory({ entity_type: p.entity_type, entity_id: p.entity_id, name: p.party_name })}>
                      {t("history")}
                    </Button>
                  ),
              },
            ]}
          />
        </Section>
      </div>
      {receipt && <ReceiptDialog txnId={x.id} onClose={() => setReceipt(false)} />}
      {history && <PartyHistory party={history} onClose={() => setHistory(null)} onOpen={(rrn) => (setHistory(null), setQ({ rrn }))} />}
    </div>
  );
}

// A customer's or merchant's history, as they see it: every module, their
// side of each transaction.
export function PartyHistory({ party, onClose, onOpen }) {
  const { t } = useTranslation("txn");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [range, setRange] = useState({ from: "", to: "" });
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    transactionsApi
      .history({ entity_type: party.entity_type, entity_id: party.entity_id, page, limit, ...clean(range) })
      .then((r) => {
        const row = rowsOf(r)[0];
        if (!cancelled) setData({ items: row?.items ?? [], total: row?.total ?? 0 });
      })
      .catch((e) => notifications.error(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [party.entity_type, party.entity_id, page, limit, range]);

  const columns = [
    { key: "tran_date_time", label: t("date"), render: (p) => <span className="whitespace-nowrap text-xs">{atIst(p.tran_date_time)}</span> },
    {
      key: "description",
      label: t("description"),
      align: "left",
      render: (p) => (
        <div>
          <p className="text-xs font-semibold">{p.description}</p>
          <p className="text-[10px] text-muted-foreground">
            {[p.counterparty_name, p.merchant_name, p.operator_name].filter(Boolean).join(" · ")}
            {onOpen ? (
              <button type="button" onClick={() => onOpen(p.rrn)} className="ml-1 font-mono text-primary hover:underline">
                {p.rrn}
              </button>
            ) : (
              <span className="ml-1 font-mono">{p.rrn}</span>
            )}
          </p>
        </div>
      ),
    },
    { key: "acct_num", label: t("account"), render: (p) => <span className="font-mono text-[11px]">{p.acct_num}</span> },
    { key: "net_amount", label: t("net"), render: (p) => <span className={cn("whitespace-nowrap text-xs font-bold tabular-nums", Number(p.net_amount) < 0 ? "text-red-700" : "text-emerald-700")}>{money(p.net_amount, p.currency_code)}</span> },
    { key: "fee_amount", label: t("fee"), render: (p) => <span className="text-xs tabular-nums">{Number(p.fee_amount) ? money(p.fee_amount, p.currency_code) : "—"}</span> },
    { key: "balance_after", label: t("balanceAfter"), render: (p) => <span className="whitespace-nowrap text-xs tabular-nums">{money(p.balance_after, p.currency_code)}</span> },
    { key: "status", label: t("status"), render: (p) => <StatusBadge status={p.status} variant="subtle" /> },
  ];

  return (
    <Modal open onClose={onClose} size="xl" title={t("historyOf", { name: party.name ?? "" })}>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className={labelClass}>
          {t("from")}
          <DateInput className={cn(inputClass, "mt-1")} value={range.from} onChange={(e) => (setRange((r) => ({ ...r, from: e.target.value })), setPage(1))} />
        </label>
        <label className={labelClass}>
          {t("to")}
          <DateInput className={cn(inputClass, "mt-1")} value={range.to} onChange={(e) => (setRange((r) => ({ ...r, to: e.target.value })), setPage(1))} />
        </label>
      </div>
      <DataTable
        columns={columns}
        rows={data.items}
        rowKey={(p) => p.id ?? `${p.rrn}-${p.acct_num}`}
        isLoading={loading}
        title={t("history")}
        emptyTitle={t("noTransactions")}
        serverSorted
        serverPagination={{
          page,
          totalPages: Math.max(1, Math.ceil(data.total / limit)),
          totalRecords: data.total,
          onPageChange: setPage,
          limit,
          onLimitChange: (n) => {
            setLimit(Math.min(n, 200));
            setPage(1);
          },
        }}
      />
    </Modal>
  );
}

// The requests: status tabs, newest first; a row opens its decision dialog.
function Requests({ openId, onOpenTxn, onClose }) {
  const { t } = useTranslation(["txn", "common"]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  // Reference, client reference, reason, who asked or decided, either account.
  const { body: searchBody, latest: latestList, bind: searchBind } = useListSearch(() => setPage(1));
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(openId ?? null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const row = rowsOf(await latestList(transactionRequestsApi.list({ ...searchBody, page, page_size: limit, ...(status ? { status } : {}) })))[0];
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
  useLiveChannel("/config/transaction/request/list", () => void load({ silent: true }));

  const columns = useMemo(
    () => [
      {
        key: "request_reference",
        label: t("request"),
        render: (r) => (
          <button type="button" onClick={() => setOpen(r.id)} className="text-left">
            <span className="block font-mono text-xs font-bold text-primary hover:underline">{r.request_reference}</span>
            <span className="block text-[10px] text-muted-foreground">{atIst(r.requested_at)}</span>
          </button>
        ),
      },
      { key: "txn_type", label: t("type"), render: (r) => <span className="text-xs font-semibold">{typeLabel(t, r.txn_type, r.txn_type_name)}</span> },
      {
        key: "acct_num",
        label: t("wallets"),
        align: "left",
        render: (r) => (
          <div className="text-[11px]">
            <p>
              <b>{r.owner_name}</b> <span className="font-mono text-muted-foreground">{r.acct_num}</span>
            </p>
            {r.counter_acct_num && (
              <p className="text-muted-foreground">
                → {r.counter_owner_name} <span className="font-mono">{r.counter_acct_num}</span>
              </p>
            )}
            {r.org_rrn && <p className="text-muted-foreground">{t("originalX", { rrn: r.org_rrn })}</p>}
          </div>
        ),
      },
      { key: "amount", label: t("amount"), render: (r) => <span className="whitespace-nowrap text-xs font-bold tabular-nums">{money(r.amount, r.currency_code)}</span> },
      { key: "status", label: t("status"), render: (r) => <StatusBadge status={r.status} variant="subtle" /> },
      { key: "requested_by", label: t("requestedBy"), render: (r) => <span className="text-xs">{r.requested_userid_name ?? r.requested_by}</span> },
      { key: "actions", label: t("common:actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpen(r.id)} /> },
    ],
    [t],
  );

  return (
    <>
      <StatusStrip
        statuses={REQUEST_STATUSES}
        value={status}
        labelOf={(s) => t(`reqStatus_${s}`)}
        onChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
      />
      <ListPanel
        tabs={[]}
        {...searchBind}
        searchPlaceholder={t("searchRequests")}
        filters={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
              {t("refresh")}
            </Button>
          </>
        }
      >
      <DataTable
        bare
        columns={columns}
        rows={data.items}
        rowKey={(r) => r.id}
        isLoading={loading}
        title={t("tab_requests")}
        emptyTitle={t("noRequests")}
        serverSorted
        serverPagination={{
          page,
          totalPages: Math.max(1, Math.ceil(data.total / limit)),
          totalRecords: data.total,
          onPageChange: setPage,
          limit,
          onLimitChange: (n) => {
            setLimit(Math.min(n, 200));
            setPage(1);
          },
        }}
      />
      </ListPanel>
      {open && (
        <RequestDialog
          id={open}
          onClose={() => {
            setOpen(null);
            onClose();
          }}
          onOpenTxn={onOpenTxn}
          onChanged={() => void load()}
        />
      )}
    </>
  );
}

// One request: what it is, its quote (while pending) or its result, and
// approve / reject / withdraw from `actions`.
export function RequestDialog({ id, onClose, onOpenTxn, onChanged, api = transactionRequestsApi }) {
  const { t } = useTranslation("txn");
  const can = usePagePermission();
  const [req, setReq] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get({ id })
      .then((r) => setReq(rowsOf(r)[0] ?? null))
      .catch((e) => notifications.error(e.message));
  }, [id, api]);

  const act = async (verb, narration) => {
    setBusy(true);
    try {
      const response = await api[verb]({ id, ...(narration ? { narration } : {}) });
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      setReq(rowsOf(await api.get({ id }))[0] ?? req);
      onChanged?.();
    } catch (e) {
      notifications.error(e.message);
      // A refused posting turns the request FAILED: show that.
      const fresh = await api.get({ id }).catch(() => null);
      if (fresh) setReq(rowsOf(fresh)[0] ?? req);
      setDialog(null);
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const a = req?.actions ?? {};
  const m = (v) => money(v, req?.currency_code);
  const buttons = req
    ? [
        a.cancel && can("Add") && { key: "cancel", label: t("withdraw"), icon: Ban, run: () => setDialog("cancel") },
        a.deauth && can("Authorize") && { key: "deauth", label: t("reject"), icon: XCircle, variant: "danger", run: () => setDialog("deauth") },
        a.auth && can("Authorize") && { key: "auth", label: t("approveAndPost"), icon: CheckCircle2, variant: "primary", run: () => setDialog("auth") },
      ]
    : [];

  return (
    <Modal open onClose={onClose} size="lg" title={req ? `${req.request_reference} · ${typeLabel(t, req.txn_type, req.txn_type_name)}` : t("request")} footer={buttons.some(Boolean) && <ActionButtons buttons={buttons} busy={busy} />}>
      {!req ? (
        <Spinner size={18} />
      ) : (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="amount-fit text-xl font-black tabular-nums sm:text-2xl">{m(req.amount)}</p>
            <StatusBadge status={req.status} />
          </div>
          {req.status === "FAILED" && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {req.status_desc}{" "}
              {req.failed_rrn && (
                <button type="button" className="font-mono underline" onClick={() => onOpenTxn?.({ rrn: req.failed_rrn })}>
                  {req.failed_rrn}
                </button>
              )}
            </p>
          )}
          <Facts
            className="lg:grid-cols-3"
            rows={[
              [t("wallet"), `${req.owner_name} · ${req.acct_num}${req.operation_type ? ` (${req.operation_type})` : ""}`],
              req.card_pan_masked && [t("card"), req.card_pan_masked],
              req.counter_acct_num && [t("counterparty"), `${req.counter_owner_name} · ${req.counter_acct_num}`],
              req.org_rrn && [t("original"), req.org_rrn],
              [t("fee"), `${m(req.fee_amount)}${Number(req.tax_amount) ? ` + ${t("tax")} ${m(req.tax_amount)}` : ""}`],
              [t("reason"), req.reason],
              req.reference && [t("voucher"), req.reference],
              req.client_reference && [t("clientReference"), req.client_reference],
              [t("requestedBy"), `${req.requested_userid_name ?? req.requested_by} · ${atIst(req.requested_at)}`],
              req.decided_by && [t("decidedBy"), `${req.decided_by} · ${atIst(req.decided_at)}`],
              req.decision_narration && [t("narration"), req.decision_narration],
              req.balance_after != null && req.rrn && [t("balanceAfter"), m(req.balance_after)],
            ]}
          />
          {req.rrn && (
            <Button variant="outline" size="sm" icon={Eye} className="w-fit" onClick={() => onOpenTxn?.({ rrn: req.rrn })}>
              {t("openTxn", { rrn: req.rrn })}
            </Button>
          )}
          {req.quote && <PlanCard plan={req.quote} />}
        </div>
      )}
      {dialog && (
        <NarrationDialog
          title={buttons.find((b) => b?.key === dialog)?.label}
          hint={t(`reqConfirmHint_${dialog}`)}
          confirmLabel={buttons.find((b) => b?.key === dialog)?.label}
          variant={dialog === "auth" ? "primary" : "danger"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => act(dialog, narration)}
        />
      )}
    </Modal>
  );
}
