import { PENDING_TABS } from "@/Components/Common/listTabs";
import { useListSearch } from "@/Hooks/useListSearch";
import { ListPanel } from "@/Components/Common/ListPanel";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, CheckCircle2, HandCoins, Pencil, Percent, Plus, Power, RefreshCw, RotateCcw, Send, Trash2, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { RowActions } from "@/Components/Common/RowActions";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { InstitutionField } from "@/Components/Epurse/NotificationCenter/notificationShared";
import { accountDate } from "@/Components/Epurse/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { loanProductsApi } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { ActionButtons, NarrationDialog, Section } from "../../TermDeposits/depositShared";
import { ProductStatus } from "../../TermDeposits/DepositProducts/productShared";
import { loanLabel, useInstitutionScope } from "../loanShared";
import { LoanConfigSummary } from "./loanProductShared";
import { LoanProductWizard, RateCheck } from "./LoanProductWizard";
import { ReferenceRates } from "./ReferenceRates";

const STATUSES = [
  [1, "Active"],
  [9, "Draft"],
  [2, "PendingAdd"],
  [5, "RejectedAdd"],
  [13, "Inactive"],
];
const CATEGORIES = ["PERSONAL", "SME", "ASSET_FINANCE", "MORTGAGE", "AGRICULTURE", "OTHER"];

// LOANS > Loan Products (menu 184): each product with its terms, rate
// bands, fees and policies, one maker-checker record. All / Pending tabs,
// a view with the checker's comparison, and the add / edit wizard.
export function LoanProducts() {
  const { t } = useTranslation(["loans", "deposits", "common"]);
  const can = usePagePermission();
  const { chooser, institution, setInstitution, scope } = useInstitutionScope();
  const [ratesOpen, setRatesOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [filters, setFilters] = useState({ status: "", product_category: "" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { term, bind: searchBind } = useListSearch(() => setPage(1));
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const body = scope({ page, page_size: limit, ...Object.fromEntries(Object.entries({ ...filters, search: term }).filter(([, v]) => v)), ...(filters.status ? { status: Number(filters.status) } : {}) });
      const row = rowsOf(await (tab === "pending" ? loanProductsApi.pending(body) : loanProductsApi.list(body)))[0];
      setData({ items: row?.items ?? [], total: row?.total ?? 0 });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [tab, term, filters, page, limit, scope]);
  useEffect(() => {
    void load();
  }, [load]);

  const back = () => {
    setScreen(null);
    void load();
  };
  if (screen?.kind === "wizard") {
    return <LoanProductWizard product={screen.product} scope={scope} onClose={() => (screen.product ? setScreen({ kind: "view", id: screen.product.id }) : back())} onSaved={(id) => setScreen({ kind: "view", id })} />;
  }
  if (screen?.kind === "view") return <LoanProductView id={screen.id} onBack={back} onEdit={(product) => setScreen({ kind: "wizard", product })} />;

  const set = (key) => (value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const columns = [
    {
      key: "product_name",
      label: t("product"),
      align: "left",
      render: (p) => (
        <button type="button" onClick={() => setScreen({ kind: "view", id: p.id })} className="text-left">
          <p className="text-xs font-bold text-primary hover:underline">{p.product_name || p.product_code}</p>
          <p className="text-[10px] text-muted-foreground">{p.product_code}</p>
        </button>
      ),
    },
    { key: "product_category", label: t("productCategory"), render: (p) => <span className="text-xs">{loanLabel(t, p.product_category)}</span> },
    { key: "currency", label: t("currency"), render: (p) => <span className="text-xs font-semibold">{p.currency_alpha_code}</span> },
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
            <HandCoins size={22} className="text-primary" /> {t("productsTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("productsSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={Percent} onClick={() => setRatesOpen(true)}>
            {t("referenceRates")}
          </Button>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
            {t("refresh")}
          </Button>
          {can("Add") && (
            <Button size="sm" icon={Plus} disabled={chooser && !institution} onClick={() => setScreen({ kind: "wizard", product: null })}>
              {t("newLoanProduct")}
            </Button>
          )}
        </div>
      </div>
      {ratesOpen && <ReferenceRates scope={scope} onClose={() => setRatesOpen(false)} />}
      {chooser && (
        <div className="mb-4 max-w-sm">
          <InstitutionField value={institution} onChange={setInstitution} />
        </div>
      )}

      <ListPanel
        tabs={PENDING_TABS}
        value={tab}
        onChange={(key) => {
          setTab(key);
          setPage(1);
        }}
        serverFiltered
        rows={data.items}
        total={data.total}
        {...searchBind}
        searchPlaceholder={t("searchProducts")}
        filters={
          <>
            <FilterSelect value={filters.product_category} onChange={set("product_category")} options={[{ value: "", label: t("anyCategory") }, ...CATEGORIES.map((c) => ({ value: c, label: loanLabel(t, c) }))]} />
            <FilterSelect value={filters.status} onChange={set("status")} options={[{ value: "", label: t("anyStatus") }, ...STATUSES.map(([v, k]) => ({ value: String(v), label: t(`deposits:pstatus_${k}`) }))]} />
          </>
        }
      >
      <DataTable
        bare
        columns={columns}
        rows={data.items}
        rowKey={(p) => p.id}
        isLoading={loading}
        title={t(`deposits:tab_${tab}`)}
        emptyTitle={t("noProducts")}
        emptyDescription={t("noProductsHint")}
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
    </div>
  );
}

// One loan product: in effect, what waits for a checker (side by side,
// changes marked), warnings, history and a rate check.
function LoanProductView({ id, onBack, onEdit }) {
  const { t } = useTranslation(["loans", "deposits"]);
  const can = usePagePermission();
  const [product, setProduct] = useState(null);
  const [audit, setAudit] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [got, history] = await Promise.all([loanProductsApi.get({ id }), loanProductsApi.audit({ id }).catch(() => null)]);
      setProduct(rowsOf(got)[0] ?? null);
      setAudit(history ? rowsOf(history) : []);
    } catch (error) {
      notifications.error(error.message);
    }
  }, [id]);
  useEffect(() => {
    void reload();
  }, [reload]);

  const act = async (verb, narration) => {
    setBusy(true);
    try {
      const response = await loanProductsApi[verb]({ id, ...(narration ? { narration } : {}) });
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      if (verb === "delete" && Number(product.status) === 9) return onBack();
      await reload();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!product) {
    return (
      <PageSkeleton />
    );
  }

  const a = product.actions ?? {};
  const cur = product.currency_alpha_code;
  const ask = (verb) => () => setDialog(verb);
  const buttons = [
    a.edit && can("Edit") && { key: "edit", label: t("edit"), icon: Pencil, run: () => onEdit(product) },
    a.submit && can("Add") && { key: "submit", label: t("submit"), icon: Send, variant: "outline", run: ask("submit") },
    a.deactivate && can("Deactivate") && { key: "deactivate", label: t("deactivate"), icon: Power, run: ask("deactivate") },
    a.reactivate && can("Reactivate") && { key: "reactivate", label: t("reactivate"), icon: RotateCcw, run: ask("reactivate") },
    a.delete && can("Delete") && { key: "delete", label: t("delete"), icon: Trash2, variant: "danger", run: ask("delete") },
    a.deauth && can("Authorize") && { key: "deauth", label: t("reject"), icon: XCircle, variant: "danger", run: ask("deauth") },
    a.auth && can("Authorize") && { key: "auth", label: t("approve"), icon: CheckCircle2, variant: "primary", run: ask("auth") },
  ];
  const pending = product.pending;

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {t("backToProducts")}
      </button>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-foreground">{product.product_name || product.product_code}</h1>
              <ProductStatus product={product} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {product.product_code} · {loanLabel(t, product.product_category)} · {[cur, product.currency_code_name].filter(Boolean).join(" · ")} · {product.inst_profile_name}
              {product.version ? ` · v${product.version}` : ""}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{t("deposits:lastChange", { name: product.updated_by ?? product.created_by ?? "—", date: accountDate(product.updated_time ?? product.created_time) })}</p>
          </div>
          <ActionButtons buttons={buttons} busy={busy} />
        </div>
        {product.warnings?.length > 0 && (
          <ul className="mt-3 grid gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            {product.warnings.map((w) => (
              <li key={w} className="flex items-start gap-1.5">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {w}
              </li>
            ))}
          </ul>
        )}
      </div>

      {pending ? (
        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <Section title={t("inEffect")}>
            <LoanConfigSummary config={product.config} currency={cur} compact />
          </Section>
          <Section title={t("deposits:proposedBy", { action: t(`deposits:pending_${pending.action}`, { defaultValue: pending.action }), name: pending.proposed_by?.name ?? "—", date: accountDate(pending.proposed_at) })} className="border-amber-300 ring-1 ring-amber-200">
            {pending.config ? <LoanConfigSummary config={pending.config} other={product.config} currency={cur} compact /> : <p className="text-sm text-muted-foreground">{t(`deposits:pendingHint_${pending.action}`, { defaultValue: "" })}</p>}
          </Section>
        </div>
      ) : (
        <Section title={product.draft ? t("draft") : t("inEffect")} className="mb-4">
          <LoanConfigSummary config={product.draft ?? product.config} currency={cur} />
          {product.config && <RateCheck product={product} decimals={product.rules?.amount_decimals} />}
        </Section>
      )}

      <Section title={t("history")}>
        <ol className="relative grid gap-3 border-l border-border pl-4">
          {audit.map((entry, i) => (
            <li key={`${entry.at}-${i}`} className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-[var(--primary-light)]" />
              <p className="text-xs font-bold text-foreground">
                {t(`deposits:audit_${entry.action}`, { defaultValue: entry.action })} <span className="font-medium text-muted-foreground">· {entry.process_status_name ?? entry.status_name}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {entry.actor} · {accountDate(entry.at)}
              </p>
              {entry.narration?.trim() && <p className="mt-0.5 text-xs italic">“{entry.narration}”</p>}
            </li>
          ))}
          {!audit.length && <li className="text-sm text-muted-foreground">{t("nothingYet")}</li>}
        </ol>
      </Section>

      {dialog && (
        <NarrationDialog
          title={t(`confirm_${dialog}`)}
          hint={t(`confirmHint_${dialog}`)}
          confirmLabel={t(dialog === "auth" ? "approve" : dialog === "deauth" ? "reject" : dialog)}
          variant={["delete", "deauth", "deactivate"].includes(dialog) ? "danger" : "primary"}
          required={dialog === "deauth"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => act(dialog, narration)}
        />
      )}
    </div>
  );
}
