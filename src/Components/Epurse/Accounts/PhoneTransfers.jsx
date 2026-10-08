import { useListSearch } from "@/Hooks/useListSearch";
import { SearchBox } from "@/Components/Common/SearchBox";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { accountsApi } from "@/Services/Epurse/accounts.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { accountDate } from "./accountShared";
import { TxnDialog } from "./AccountStatement";

const STATUSES = ["PENDING", "CLAIMED", "CANCELLED", "RETURNED"];
const STATUS_TONES = {
  PENDING: "bg-amber-50 text-amber-700",
  CLAIMED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-600",
  RETURNED: "bg-sky-50 text-sky-700",
};
// Opens on the money waiting now.
const DEFAULT_FILTERS = { status: "PENDING", phone_number: "", sender_name: "" };

const filterBody = (f) => ({
  ...(f.status ? { status: f.status } : {}),
  ...(f.phone_number.trim() ? { phone_number: f.phone_number.trim() } : {}),
  ...(f.sender_name.trim() ? { sender_name: f.sender_name.trim() } : {}),
});

// EPURSE > Accounts (menu 178) › Money waiting for numbers: money customers
// sent to phone numbers with no account. It waits in the institution's
// holding account (PHONE_TRANSFER_HOLD) until claimed, cancelled or returned.
export function PhoneTransfers() {
  const { t } = useTranslation(["accounts", "common"]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [applied, setApplied] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [result, setResult] = useState({ rows: [], total: 0, totals: [] });
  // Number, sender name, reference or wallet, send RRN.
  const { body: searchBody, latest: latestList, bind: searchBind } = useListSearch(() => setPage(1));
  const [loading, setLoading] = useState(false);
  const [rrn, setRrn] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = rowsOf(await latestList(accountsApi.phoneTransfers({ ...searchBody, page, limit, ...filterBody(applied) })))[0];
      setResult({ rows: data?.phone_transfers ?? [], total: data?.total ?? 0, totals: data?.totals ?? [] });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [searchBody, latestList, applied, page, limit]);
  useEffect(() => {
    void load();
  }, [load]);

  const setFilter = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(filters);
          setPage(1);
        }}
        className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
      >
        <SearchBox {...searchBind} className="min-w-[14rem] flex-[2_1_16rem]" placeholder={t("ptSearch")} />
        <FilterSelect value={filters.status} onChange={setFilter("status")} options={[{ value: "", label: t("allStatuses") }, ...STATUSES.map((s) => ({ value: s, label: t(`ptStatus_${s}`) }))]} />
        <input
          value={filters.phone_number}
          onChange={(e) => setFilter("phone_number")(e.target.value)}
          placeholder={t("ptPhone")}
          className="h-10 w-40 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
        />
        <input
          value={filters.sender_name}
          onChange={(e) => setFilter("sender_name")(e.target.value)}
          placeholder={t("ptSenderName")}
          className="h-10 w-44 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
        />
        <div className="flex shrink-0 gap-2">
          <Button type="submit" size="sm" icon={Search}>
            {t("search")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setFilters(DEFAULT_FILTERS);
              setApplied(DEFAULT_FILTERS);
              setPage(1);
            }}
          >
            {t("clear")}
          </Button>
        </div>
      </form>

      {/* Everything the filters match, not just this page; with Waiting it
          equals the holding account's balance. */}
      {result.totals.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {result.totals.map((x) => (
            <div key={x.currency_code} className="min-w-[12rem] rounded-2xl border border-border bg-card px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {applied.status === "PENDING" ? t("ptWaitingNow") : t("ptTotal")} · {x.currency_code}
              </p>
              <p className="mt-0.5 text-xl font-black tabular-nums text-foreground">{x.amount}</p>
              <p className="text-[11px] text-muted-foreground">{t("ptCount", { count: Number(x.count) || 0 })}</p>
            </div>
          ))}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={result.rows}
        rowKey={(r) => r.id}
        isLoading={loading}
        title={t("ptTitle")}
        emptyTitle={t("ptEmpty")}
        serverSorted
        serverPagination={{
          page,
          totalPages: Math.max(1, Math.ceil(result.total / limit)),
          totalRecords: result.total,
          onPageChange: setPage,
          limit,
          onLimitChange: (n) => {
            setLimit(Math.min(n, 100));
            setPage(1);
          },
        }}
      />
      {rrn && <TxnDialog rrn={rrn} onClose={() => setRrn(null)} />}
    </>
  );
}
