import { PageTitle } from "@/Components/Common/PageTitle";
import { BackButton } from "@/Components/Common/TextButtons";
import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, CheckCircle2, HandCoins, Layers, Pencil, Percent, Plus, Power, RotateCcw, Send, Target, Trash2, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { RowActions } from "@/Components/Common/RowActions";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { loanProductsApi } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { ActionButtons, Section, AuditTimeline } from "../../Deposits/depositShared";
import { ProductStatus } from "../DepositProducts/productShared";
import { loanLabel, useInstitutionScope } from "../../Loans/loanShared";
import { LoanConfigSummary } from "./loanProductShared";
import { LoanProductWizard, RateCheck } from "./LoanProductWizard";
import { ReferenceRates } from "./ReferenceRates";
import { LoanLists } from "./LoanLists";
import { VerbDialog, VersionSections } from "@/Components/MakerChecker/SetupDocument";
// LOANS > Loan Products (menu 184): each product with its terms, rate
// bands, fees and policies, one maker-checker record. All / Pending tabs,
// a view with the checker's comparison, and the add / edit wizard.
export function LoanProducts() {
  const { t } = useTranslation(["loans", "deposits", "common"]);
  const can = usePagePermission();
  const { chooser, institution, scope } = useInstitutionScope();
  const [ratesOpen, setRatesOpen] = useState(false);
  // Groups or purposes window.
  const [listOpen, setListOpen] = useState(null);
  const [screen, setScreen] = useState(null);
  const list = useServerList({ api: loanProductsApi.listPath, call: loanProductsApi.list });
  const load = list.reload;
  const back = () => {
    setScreen(null);
    load();
  };
  if (screen?.kind === "wizard") {
    return <LoanProductWizard product={screen.product} scope={scope} onClose={() => (screen.product ? setScreen({ kind: "view", id: screen.product.id }) : back())} onSaved={(id) => setScreen({ kind: "view", id })} />;
  }
  if (screen?.kind === "view") return <LoanProductView id={screen.id} onBack={back} onEdit={(product) => setScreen({ kind: "wizard", product })} />;
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
  const listActions = (
    <>
      <Button variant="secondary" size="sm" icon={Percent} onClick={() => setRatesOpen(true)}>
        {t("referenceRates")}
      </Button>
      <Button variant="secondary" size="sm" icon={Layers} onClick={() => setListOpen("groups")}>
        {t("productGroups")}
      </Button>
      <Button variant="secondary" size="sm" icon={Target} onClick={() => setListOpen("purposes")}>
        {t("loanPurposes")}
      </Button>
      {can("Add") && (
        <Button size="sm" icon={Plus} disabled={chooser && !institution} disabledReason={t("common:blockedNeedsInstitution")} onClick={() => setScreen({ kind: "wizard", product: null })}>
          {t("newLoanProduct")}
        </Button>
      )}
    </>
  );
  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle icon={HandCoins}>{t("productsTitle")}</PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t("productsSubtitle")}</p>
        </div>
      </div>
      {ratesOpen && <ReferenceRates scope={scope} onClose={() => setRatesOpen(false)} />}
      {listOpen && <LoanLists kind={listOpen} scope={scope} onClose={() => setListOpen(null)} />}
      <ListTable list={list} actions={listActions} columns={columns} rowKey={(p) => p.id} title={t("productsTitle")} emptyTitle={t("noProducts")} emptyDescription={t("noProductsHint")} />
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
      <BackButton onClick={onBack}>
        <ArrowLeft size={15} /> {t("backToProducts")}
      </BackButton>
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
      <VersionSections
        record={product}
        side
        render={(config, other) => <LoanConfigSummary config={config} other={other} currency={cur} compact={Boolean(pending && product.config)} />}
        below={product.config && <RateCheck product={product} decimals={product.rules?.amount_decimals} />}
      />
      <Section title={t("history")} collapsible>
        <AuditTimeline audit={audit} />
      </Section>
      <VerbDialog dialog={dialog} t={t} busy={busy} onClose={() => setDialog(null)} onSave={(narration) => act(dialog, narration)} />
    </div>
  );
}
