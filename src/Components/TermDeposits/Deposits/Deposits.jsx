import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Landmark, PiggyBank, Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { money } from "@/Components/Epurse/Accounts/accountShared";
import { useMenuPermission } from "@/Hooks/usePermission";
import { accountsApi } from "@/Services/Epurse/accounts.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { depositsApi } from "@/Services/TermDeposits/termDeposits.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { dayDate, inputClass, labelClass, ratePct } from "../depositShared";
import { DepositView } from "./DepositView";
import { OpenDeposit } from "./OpenDeposit";

const STATUSES = ["PENDING_APPROVAL", "ACTIVE", "MATURED", "CLOSED", "PREMATURELY_CLOSED", "REJECTED", "CANCELLED"];
const EMPTY = { search: "", status: "", maturity_from: "", maturity_to: "" };

// The deposit table, shared by the Deposits screen and a customer's detail.
function depositColumns(t, can, onOpen, compact) {
  return [
    {
      key: "reference_no",
      label: t("reference"),
      render: (d) => (
        <button type="button" onClick={() => onOpen(d.id)} className="text-left">
          <span className="font-mono text-xs font-bold text-primary hover:underline">{d.reference_no}</span>
          {d.deposit_number && <span className="block font-mono text-[10px] text-muted-foreground">{d.deposit_number}</span>}
        </button>
      ),
    },
    !compact && {
      key: "owner",
      label: t("owner"),
      align: "left",
      render: (d) => (
        <div>
          <p className="text-xs font-semibold">{d.owner?.name}</p>
          <p className="text-[10px] text-muted-foreground">{t(d.owner?.party === "MERCHANT" ? "accounts:merchant" : "accounts:customer")}</p>
        </div>
      ),
    },
    { key: "product_name", label: t("depositProduct"), render: (d) => <span className="text-xs">{d.product_name} · {d.tenor_label}</span> },
    { key: "principal", label: t("principal"), render: (d) => <span className="whitespace-nowrap text-xs font-bold tabular-nums">{money(d.principal, d.currency_code)}</span> },
    { key: "annual_rate", label: t("rate"), render: (d) => <span className="text-xs font-semibold tabular-nums text-primary">{ratePct(d.annual_rate)}</span> },
    { key: "maturity_date", label: t("maturityDate"), render: (d) => <span className="whitespace-nowrap text-xs">{dayDate(d.maturity_date)}</span> },
    { key: "status", label: t("status"), render: (d) => <StatusBadge status={d.status} variant="subtle" /> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (d) => <RowActions buttons={{ view: true }} onView={() => onOpen(d.id)} permission={can} /> },
  ].filter(Boolean);
}

// TERM DEPOSITS > Deposits (menu 181): deposits opened for customers and
// merchants. Filters, "Open deposit", and the deposit's own page.
export function Deposits() {
  const { t } = useTranslation(["deposits", "accounts", "common"]);
  const can = useMenuPermission("Deposits");
  const [filters, setFilters] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [opening, setOpening] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const body = Object.fromEntries(Object.entries({ ...applied, search: applied.search.trim() }).filter(([, v]) => v));
      const row = rowsOf(await depositsApi.list({ page, page_size: limit, ...body }))[0];
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

  const columns = depositColumns(t, can, setOpenId, false);

  if (openId) {
    return (
      <DepositView
        id={openId}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
      />
    );
  }

  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));
  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Landmark size={22} className="text-primary" /> {t("depositsTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("depositsSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
            {t("refresh")}
          </Button>
          {can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setOpening(true)}>
              {t("openDeposit")}
            </Button>
          )}
        </div>
      </div>

      <div className="mb-3 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1">
        {["", ...STATUSES].map((key) => (
          <button
            key={key || "all"}
            type="button"
            onClick={() => {
              setFilters((f) => ({ ...f, status: key }));
              setApplied((f) => ({ ...f, status: key }));
              setPage(1);
            }}
            className={cn("shrink-0 rounded-xl px-3 py-2 text-xs font-bold", applied.status === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-[var(--primary-light)] hover:text-primary")}
          >
            {key ? t(`dstatus_${key}`) : t("tab_all")}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(filters);
          setPage(1);
        }}
        className="mb-4 grid items-end gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]"
      >
        <label className={labelClass}>
          {t("search")}
          <input className={cn(inputClass, "mt-1")} placeholder={t("searchDeposits")} value={filters.search} onChange={(e) => set("search")(e.target.value)} />
        </label>
        <label className={labelClass}>
          {t("maturityFrom")}
          <input type="date" className={cn(inputClass, "mt-1")} value={filters.maturity_from} onChange={(e) => set("maturity_from")(e.target.value)} />
        </label>
        <label className={labelClass}>
          {t("maturityTo")}
          <input type="date" className={cn(inputClass, "mt-1")} value={filters.maturity_to} onChange={(e) => set("maturity_to")(e.target.value)} />
        </label>
        <div className="flex gap-2">
          <Button type="submit" size="sm" icon={Search} className="flex-1">
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
        </div>
      </form>

      <DataTable
        columns={columns}
        rows={data.items}
        rowKey={(d) => d.id}
        isLoading={loading}
        title={t("depositsTitle")}
        emptyTitle={t("noDeposits")}
        emptyDescription={t("noDepositsHint")}
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

      {opening && (
        <OpenDeposit
          onClose={() => setOpening(false)}
          onOpened={(deposit) => {
            setOpening(false);
            if (deposit?.id) setOpenId(deposit.id);
            else void load();
          }}
        />
      )}
    </div>
  );
}

// A customer's or merchant's deposits, in their detail: found from one of
// their wallets (the account names the owner), with "Open deposit" for
// staff who may open one. Shown only to users with the Deposits menu.
export function OwnerDeposits({ accounts }) {
  const { t } = useTranslation(["deposits", "accounts", "common"]);
  const can = useMenuPermission("Deposits");
  const [owner, setOwner] = useState(null);
  const [items, setItems] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [opening, setOpening] = useState(false);
  const walletId = accounts?.find((a) => a.acct_class !== "DEPOSIT")?.id;
  const allowed = can("View");
  const columns = depositColumns(t, can, setOpenId, true);

  const loadDeposits = useCallback(async (found) => {
    const row = rowsOf(await depositsApi.list({ entity_type: found.kind, entity_id: found.id, page: 1, page_size: 100 }))[0];
    setItems(row?.items ?? []);
  }, []);

  // The wallet's account names its owner; then their deposits.
  useEffect(() => {
    if (!walletId || !allowed) return;
    accountsApi
      .get({ id: walletId })
      .then(async (r) => {
        const found = rowsOf(r)[0]?.owner;
        if (!found?.kind) return;
        setOwner(found);
        await loadDeposits(found);
      })
      .catch(() => setItems([]));
  }, [walletId, allowed, loadDeposits]);

  if (!walletId || !can("View") || items === null) return null;
  const entity = owner ? { entity_type: owner.kind, entity_id: owner.id } : null;
  return (
    <div className="mb-4 rounded-2xl border border-border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-foreground">
          <PiggyBank size={15} className="text-primary" /> {t("ownerDeposits", { count: items.length })}
        </p>
        {can("Add") && entity && (
          <Button variant="outline" size="sm" icon={Plus} onClick={() => setOpening(true)}>
            {t("openDeposit")}
          </Button>
        )}
      </div>
      {items.length ? <DataTable columns={columns} rows={items} rowKey={(d) => d.id} title={t("depositsTitle")} compact /> : <p className="text-xs text-muted-foreground">{t("noDepositsForOwner")}</p>}
      {openId && (
        <Modal open size="full" title={t("depositsTitle")} onClose={() => setOpenId(null)}>
          <DepositView id={openId} embedded />
        </Modal>
      )}
      {opening && (
        <OpenDeposit
          entity={entity}
          onClose={() => setOpening(false)}
          onOpened={(deposit) => {
            setOpening(false);
            void loadDeposits(owner).catch(() => {});
            if (deposit?.id) setOpenId(deposit.id);
          }}
        />
      )}
    </div>
  );
}
