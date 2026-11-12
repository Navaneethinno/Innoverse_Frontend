import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { RowActions } from "@/Components/Common/RowActions";
import { cell, useL, words } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { ContractOpen, ContractView, Status, contractApi, header } from "@/Components/InnoCBS/Loans/loanScreensShared";

export function IslamicFinancing() {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const list = useServerList({ api: contractApi.listPath, call: contractApi.list, enabled: !openId });
  if (!can("View")) return <NoAccess />;
  if (openId) return <ContractView id={openId} onBack={() => (setOpenId(null), list.reload())} />;
  return (
    <div className="pt-1 pb-6">
      {header(L, "islamicFinancing", "Islamic financing contracts: open with the asset, approve, pay, late charges, settlement with Ibra'.")}
      <ListTable
        list={list}
        rowKey={(r) => r.id}
        title={L("islamicFinancing")}
        emptyTitle={L("No contracts yet")}
        actions={
          can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
              {L("Open a contract")}
            </Button>
          )
        }
        columns={[
          { key: "contract_number", label: L("contract"), align: "left", render: (r) => <button type="button" className="text-left text-xs font-bold text-primary hover:underline" onClick={() => setOpenId(r.id)}>{r.contract_number}<span className="block text-[10px] font-normal text-muted-foreground">{words(r.contract_type)}</span></button> },
          { key: "customer", label: L("customer"), render: (r) => cell(r.customer) },
          { key: "product_code", label: L("product"), render: (r) => cell(r.product_code) },
          { key: "financed", label: L("financed"), render: (r) => cell(`${r.financed} ${r.currency ?? ""}`) },
          { key: "outstanding", label: L("outstanding"), render: (r) => cell(r.outstanding) },
          { key: "paid", label: L("paid"), sortable: false, render: (r) => cell(`${r.paid_through}/${r.instalments}`) },
          { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
          { key: "actions", label: t("actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpenId(r.id)} /> },
        ]}
      />
      {adding && <ContractOpen onClose={() => setAdding(false)} onDone={() => (setAdding(false), list.reload())} />}
    </div>
  );
}
