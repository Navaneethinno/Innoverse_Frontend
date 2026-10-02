import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PiggyBank, Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { RowActions } from "@/Components/Common/RowActions";
import { accountDate } from "@/Components/Epurse/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { depositProductsApi } from "@/Services/TermDeposits/termDeposits.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { inputClass } from "../depositShared";
import { DepositProductView } from "./DepositProductView";
import { DepositProductWizard } from "./DepositProductWizard";
import { ProductStatus } from "./productShared";

const STATUSES = [
  [1, "Active"],
  [9, "Draft"],
  [2, "PendingAdd"],
  [5, "RejectedAdd"],
  [13, "Inactive"],
];

// TERM DEPOSITS > Deposit Products (menu 180): the term-deposit setup of
// each TERM_DEPOSIT account product. All / Pending tabs, a view with the
// checker's comparison, and the add / edit wizard.
export function DepositProducts() {
  const { t } = useTranslation(["deposits", "common"]);
  const can = usePagePermission();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState({ search: "", status: "" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const body = { page, page_size: limit, ...(applied.search ? { search: applied.search } : {}), ...(applied.status ? { status: Number(applied.status) } : {}) };
      const row = rowsOf(await (tab === "pending" ? depositProductsApi.pending(body) : depositProductsApi.list(body)))[0];
      setData({ items: row?.items ?? [], total: row?.total ?? 0 });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [tab, applied, page, limit]);
  useEffect(() => {
    void load();
  }, [load]);

  const back = () => {
    setScreen(null);
    void load();
  };

  if (screen?.kind === "wizard") {
    return <DepositProductWizard product={screen.product} onClose={() => (screen.product ? setScreen({ kind: "view", id: screen.product.id }) : back())} onSaved={(id) => (id ? setScreen({ kind: "view", id }) : back())} />;
  }
  if (screen?.kind === "view") {
    return <DepositProductView id={screen.id} onBack={back} onEdit={(product) => setScreen({ kind: "wizard", product })} />;
  }

  const columns = [
    {
      key: "product",
      label: t("accountProduct"),
      align: "left",
      render: (p) => (
        <button type="button" onClick={() => setScreen({ kind: "view", id: p.id })} className="text-left">
          <p className="text-xs font-bold text-primary hover:underline">{p.acct_product?.product_name}</p>
          <p className="text-[10px] text-muted-foreground">{p.acct_product?.product_code}</p>
        </button>
      ),
    },
    { key: "currency", label: t("currency"), render: (p) => <span className="text-xs font-semibold">{p.acct_product?.currency_code}</span> },
    { key: "tenor_count", label: t("tenors"), render: (p) => <span className="text-xs tabular-nums">{p.tenor_count ?? "—"}</span> },
    { key: "status", label: t("status"), render: (p) => <ProductStatus product={p} /> },
    { key: "inst_profile_name", label: t("institution"), render: (p) => <span className="text-xs">{p.inst_profile_name}</span> },
    { key: "updated_time", label: t("updated"), render: (p) => <span className="whitespace-nowrap text-xs">{accountDate(p.updated_time ?? p.created_time)}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (p) => <RowActions buttons={{ view: true }} onView={() => setScreen({ kind: "view", id: p.id })} /> },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <PiggyBank size={22} className="text-primary" /> {t("productsTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("productsSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
            {t("refresh")}
          </Button>
          {can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setScreen({ kind: "wizard", product: null })}>
              {t("newDepositProduct")}
            </Button>
          )}
        </div>
      </div>

      <div className="mb-3 flex w-fit gap-1 rounded-2xl border border-border bg-card p-1">
        {["all", "pending"].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setPage(1);
            }}
            className={cn("rounded-xl px-4 py-2 text-xs font-bold", tab === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-[var(--primary-light)] hover:text-primary")}
          >
            {t(`tab_${key}`)}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied({ search: search.trim(), status });
          setPage(1);
        }}
        className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[2fr_1fr_auto]"
      >
        <input className={inputClass} placeholder={t("searchProducts")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <FilterSelect value={status} onChange={setStatus} options={[{ value: "", label: t("anyStatus") }, ...STATUSES.map(([v, k]) => ({ value: String(v), label: t(`pstatus_${k}`) }))]} />
        <Button type="submit" size="sm" icon={Search}>
          {t("search")}
        </Button>
      </form>

      <DataTable
        columns={columns}
        rows={data.items}
        rowKey={(p) => p.id}
        isLoading={loading}
        title={t(`tab_${tab}`)}
        emptyTitle={t("noProducts")}
        emptyDescription={t("noProductsListHint")}
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
