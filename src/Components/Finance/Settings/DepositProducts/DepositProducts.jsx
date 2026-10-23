import { useState } from "react";
import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { useTranslation } from "react-i18next";
import { PiggyBank, Plus } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { RowActions } from "@/Components/Common/RowActions";
import { accountDate } from "@/Components/Finance/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { depositProductsApi } from "@/Services/TermDeposits/termDeposits.api";
import { DepositProductView } from "./DepositProductView";
import { DepositProductWizard } from "./DepositProductWizard";
import { ProductStatus } from "./productShared";

// TERM DEPOSITS > Deposit Products (menu 180): the term-deposit setup of
// each TERM_DEPOSIT account product. All / Pending tabs, a view with the
// checker's comparison, and the add / edit wizard.
export function DepositProducts() {
  const { t } = useTranslation(["deposits", "common"]);
  const can = usePagePermission();
  const [screen, setScreen] = useState(null);
  const list = useServerList({ api: depositProductsApi.listPath, call: depositProductsApi.list });
  const load = list.reload;

  const back = () => {
    setScreen(null);
    load();
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
      label: t("depositProduct"),
      align: "left",
      render: (p) => (
        <button type="button" onClick={() => setScreen({ kind: "view", id: p.id })} className="text-left">
          <p className="text-xs font-bold text-primary hover:underline">{p.product_name ?? p.acct_product?.product_name}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{p.product_code ?? p.acct_product?.product_code}</p>
        </button>
      ),
    },
    {
      key: "acct_product",
      label: t("accountProduct"),
      render: (p) => (
        <span className="text-xs">
          {p.acct_product?.product_name} <span className="font-mono text-[10px] text-muted-foreground">{p.acct_product?.product_code}</span>
        </span>
      ),
    },
    { key: "currency", label: t("currency"), render: (p) => <span className="text-xs font-semibold">{p.acct_product?.currency_code}</span> },
    { key: "tenor_count", label: t("tenors"), render: (p) => <span className="text-xs tabular-nums">{p.tenor_count ?? "—"}</span> },
    { key: "status", label: t("status"), render: (p) => <ProductStatus product={p} /> },
    { key: "inst_profile_name", label: t("institution"), render: (p) => <span className="text-xs">{p.inst_profile_name}</span> },
    { key: "updated_time", label: t("updated"), render: (p) => <span className="whitespace-nowrap text-xs">{accountDate(p.updated_time ?? p.created_time)}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (p) => <RowActions buttons={{ view: true }} onView={() => setScreen({ kind: "view", id: p.id })} /> },
  ];

  const listActions = (
    <>
      {can("Add") && (
        <Button size="sm" icon={Plus} onClick={() => setScreen({ kind: "wizard", product: null })}>
          {t("newDepositProduct")}
        </Button>
      )}
    </>
  );

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <PiggyBank size={22} className="text-primary" /> {t("productsTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("productsSubtitle")}</p>
        </div>
      </div>

      <ListTable list={list} actions={listActions} columns={columns} rowKey={(p) => p.id} title={t("productsTitle")} emptyTitle={t("noProducts")} emptyDescription={t("noProductsListHint")} />
    </div>
  );
}
