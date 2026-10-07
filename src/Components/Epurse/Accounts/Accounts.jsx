import { useListSearch } from "@/Hooks/useListSearch";
import { SearchBox } from "@/Components/Common/SearchBox";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Landmark, ScrollText, Search } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { accountsApi } from "@/Services/Epurse/accounts.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { AccountBalances, AccountClass, accountDate, money, productLabel } from "./accountShared";
import { AccountStatement } from "./AccountStatement";
import { AccountParties, AccountRequests, AccountStatements, RestrictionBadge } from "./AccountActions";
import { Tabs } from "../../Loans/loanShared";
import { useLiveChannel } from "@/Hooks/useLiveChannel";

const EMPTY_FILTERS = { party: "", ownership: "", acct_class: "", status: "" };

// The filters as the list call takes them: blanks left out, ids as numbers.
const filterBody = (f) => ({
  ...(f.party ? { party: f.party } : {}),
  ...(f.ownership ? { ownership: f.ownership } : {}),
  ...(f.acct_class ? { acct_class: f.acct_class } : {}),
  ...(f.status !== "" ? { status: Number(f.status) } : {}),
});

// EPURSE > Accounts (menu 178): every customer's and merchant's account,
// opened automatically on approval; freeze / block / close / reactivate /
// activate and parties go through maker-checker requests (AccountActions). A bank / fintech user sees its
// own institution's; a service provider sees every institution's.
export function Accounts() {
  const { t } = useTranslation(["accounts", "common"]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [result, setResult] = useState({ accounts: [], total: 0 });
  // Account number, owner's name or reference, account or digital product.
  const { body: searchBody, latest: latestList, bind: searchBind } = useListSearch(() => setPage(1));
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [statement, setStatement] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = rowsOf(await latestList(accountsApi.list({ ...searchBody, page, limit, ...filterBody(applied) })))[0];
      setResult({ accounts: data?.accounts ?? [], total: data?.total ?? 0 });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [searchBody, latestList, applied, page, limit]);
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel("/config/account/list", () => void load({ silent: true }));

  const search = (event) => {
    event.preventDefault();
    setApplied(filters);
    setPage(1);
  };
  const setFilter = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));

  const columns = [
    {
      key: "acct_num",
      label: t("accountNumber"),
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <span className="font-mono text-xs font-bold">{r.acct_num}</span>
          <AccountClass value={r.acct_class} />
        </div>
      ),
    },
    {
      key: "owner",
      label: t("owner"),
      render: (r) => (
        <div>
          <p className="text-xs font-semibold">{r.owner?.name || "—"}</p>
          <p className="text-[10px] text-muted-foreground">
            {t(r.owner?.party === "MERCHANT" ? "merchant" : "customer")} · {t(r.owner?.ownership === "CORPORATE" ? "corporate" : "individual")}
          </p>
        </div>
      ),
    },
    { key: "acct_product_name", label: t("accountProduct"), render: (r) => <span className="text-xs">{productLabel(r.acct_product_code, r.acct_product_name)}</span> },
    { key: "digital_product_name", label: t("digitalProduct"), render: (r) => <span className="text-xs">{r.digital_product_name ?? "—"}</span> },
    { key: "avail_bal", label: t("availBal"), render: (r) => <span className="whitespace-nowrap text-xs font-semibold">{money(r.avail_bal, r.currency_code)}</span> },
    { key: "inst_profile_name", label: t("institution"), render: (r) => <span className="text-xs">{r.inst_profile_name ?? "—"}</span> },
    {
      key: "status",
      label: t("status"),
      render: (r) => (
        <span className="inline-flex flex-wrap items-center justify-center gap-1">
          <StatusBadge status={r.status_name ?? String(r.status ?? "")} variant="subtle" />
          <RestrictionBadge value={r.restriction} />
        </span>
      ),
    },
    { key: "opened_at", label: t("openedAt"), render: (r) => <span className="whitespace-nowrap text-xs">{accountDate(r.opened_at)}</span> },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => (
        <div className="flex items-center justify-center gap-1">
          <RowActions buttons={{ view: true }} onView={() => setViewing(r)} />
          <ActionIconButton label={t("statement")} intent="statement" icon={ScrollText} onClick={() => setStatement(r)} />
        </div>
      ),
    },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
          <Landmark size={22} className="text-primary" /> {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <form onSubmit={search} className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <SearchBox {...searchBind} className="min-w-[14rem] flex-[2_1_16rem]" placeholder={t("searchAccounts")} />
        <FilterSelect
          value={filters.party}
          onChange={setFilter("party")}
          options={[
            { value: "", label: t("allParties") },
            { value: "CUSTOMER", label: t("customer") },
            { value: "MERCHANT", label: t("merchant") },
          ]}
        />
        <FilterSelect
          value={filters.ownership}
          onChange={setFilter("ownership")}
          options={[
            { value: "", label: t("allOwnerships") },
            { value: "INDIVIDUAL", label: t("individual") },
            { value: "CORPORATE", label: t("corporate") },
          ]}
        />
        <FilterSelect
          value={filters.acct_class}
          onChange={setFilter("acct_class")}
          options={[
            { value: "", label: t("allClasses") },
            { value: "CUSTOMER", label: t("class_CUSTOMER") },
            { value: "DEPOSIT", label: t("class_DEPOSIT") },
          ]}
        />
        <FilterSelect
          value={filters.status}
          onChange={setFilter("status")}
          options={[
            { value: "", label: t("allStatuses") },
            { value: "1", label: t("active") },
            { value: "0", label: t("inactive") },
          ]}
        />
        <div className="flex shrink-0 gap-2">
          <Button type="submit" size="sm" icon={Search} className="flex-1">
            {t("search")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              setApplied(EMPTY_FILTERS);
              setPage(1);
            }}
          >
            {t("clear")}
          </Button>
        </div>
      </form>

      <DataTable
        columns={columns}
        rows={result.accounts}
        rowKey={(r) => r.id}
        isLoading={loading}
        title={t("title")}
        emptyTitle={t("noAccounts")}
        emptyDescription={t("noAccountsHint")}
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

      {viewing && (
        <AccountDetail
          account={viewing}
          onClose={() => setViewing(null)}
          onStatement={(a) => {
            setViewing(null);
            setStatement(a);
          }}
        />
      )}
      {statement && <AccountStatement account={statement} onClose={() => setStatement(null)} />}
    </div>
  );
}

// One account, fetched fresh (/config/account/get) for its latest balances.
// Tabs: the account itself, its action requests, its parties, its statements.
function AccountDetail({ account, onClose, onStatement }) {
  const { t } = useTranslation("accounts");
  const [full, setFull] = useState(null);
  const [tab, setTab] = useState("overview");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    accountsApi
      .get({ id: account.id })
      .then((r) => !cancelled && setFull(rowsOf(r)[0] ?? account))
      .catch((error) => {
        if (cancelled) return;
        notifications.error(error.message);
        setFull(account);
      });
    return () => {
      cancelled = true;
    };
  }, [account, version]);

  const a = full ?? account;
  const rows = [
    ["accountProduct", `${productLabel(a.acct_product_code, a.acct_product_name)}${a.acct_product_type ? ` (${a.acct_product_type})` : ""}`],
    ["digitalProduct", productLabel(a.digital_product_code, a.digital_product_name)],
    ["currency", [a.currency_code, a.currency_name].filter(Boolean).join(" · ") || "—"],
    ["priority", a.acct_priority ?? "—"],
    ["institution", a.inst_profile_name ?? "—"],
    ["openedAt", accountDate(a.opened_at)],
    ["updatedAt", accountDate(a.updated_at)],
  ];

  return (
    <Modal open onClose={onClose} size="xl" title={t("accountTitle", { number: a.acct_num })}>
      {!full && (
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner size={12} /> {t("refreshing")}
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-mono text-lg font-black text-foreground">
          {a.acct_num} <AccountClass value={a.acct_class} />
        </p>
        <div className="flex items-center gap-3">
          <StatusBadge status={a.status_name ?? String(a.status ?? "")} variant="subtle" />
          <RestrictionBadge value={a.restriction} />
          <Button variant="outline" size="sm" icon={ScrollText} onClick={() => onStatement(a)}>
            {t("statement")}
          </Button>
        </div>
      </div>
      {a.acct_class !== "DEPOSIT" && <Tabs tabs={[{ key: "overview" }, { key: "requests" }, { key: "parties" }, { key: "statements" }]} value={tab} onChange={setTab} labelOf={(k) => t(`tab_${k}`)} />}
      {tab === "requests" && <AccountRequests account={a} onChanged={() => setVersion((n) => n + 1)} />}
      {tab === "parties" && <AccountParties account={a} />}
      {tab === "statements" && <AccountStatements account={a} />}
      {tab === "overview" && (
        <>
          <AccountBalances account={a} />
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {rows.map(([key, value]) => (
              <div key={key} className="rounded-xl border border-border bg-card p-3">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t(key)}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          {a.owner && (
            <div className="mt-4 rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("owner")}</p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-foreground">{a.owner.name || "—"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t(a.owner.party === "MERCHANT" ? "merchant" : "customer")} · {t(a.owner.ownership === "CORPORATE" ? "corporate" : "individual")}
                    {a.owner.reference_id ? ` · ${a.owner.reference_id}` : ""}
                  </p>
                </div>
                {a.owner.status_name && <StatusBadge status={a.owner.status_name} variant="subtle" />}
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
