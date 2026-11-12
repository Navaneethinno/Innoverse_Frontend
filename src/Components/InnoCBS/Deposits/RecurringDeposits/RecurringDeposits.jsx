import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { RowActions } from "@/Components/Common/RowActions";
import { cell, dateCell, useL, words } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { RdOpen, RdView, Status, header, rdApi } from "@/Components/InnoCBS/Deposits/depositOpsShared";

export function RecurringDeposits() {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const list = useServerList({ api: rdApi.listPath, call: rdApi.list, enabled: !openId });
  if (!can("View")) return <NoAccess />;
  if (openId) return <RdView id={openId} onBack={() => (setOpenId(null), list.reload())} />;
  return (
    <div className="pt-1 pb-6">
      {header(L, "recurringDeposits", "Quote, open, collect instalments, waive penalties and pre-close recurring deposits.")}
      <ListTable
        list={list}
        rowKey={(r) => r.id}
        title={L("recurringDeposits")}
        emptyTitle={L("No recurring deposits yet")}
        actions={
          can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
              {L("Open a recurring deposit")}
            </Button>
          )
        }
        columns={[
          { key: "reference_no", label: L("reference_no"), align: "left", render: (r) => <button type="button" className="text-left text-xs font-bold text-primary hover:underline" onClick={() => setOpenId(r.id)}>{r.reference_no}<span className="block text-[10px] font-normal text-muted-foreground">{r.deposit_number}</span></button> },
          { key: "owner_name", label: L("owner"), render: (r) => cell(r.owner_name) },
          { key: "product_code", label: L("product"), render: (r) => cell(r.product_code) },
          { key: "instalment_amount", label: L("instalment_amount"), render: (r) => cell(`${r.instalment_amount} · ${words(r.frequency)}`) },
          { key: "paid", label: L("paid"), sortable: false, render: (r) => cell(`${r.paid_instalments}/${r.total_instalments}${r.missed_instalments ? ` · ${r.missed_instalments} ${L("missed")}` : ""}`) },
          { key: "maturity_date", label: L("maturity_date"), render: (r) => dateCell(r.maturity_date) },
          { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
          { key: "actions", label: t("actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpenId(r.id)} /> },
        ]}
      />
      {adding && <RdOpen onClose={() => setAdding(false)} onDone={() => (setAdding(false), list.reload())} />}
    </div>
  );
}
