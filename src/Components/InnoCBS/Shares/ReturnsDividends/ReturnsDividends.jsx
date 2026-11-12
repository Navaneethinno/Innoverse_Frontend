import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Calculator, Plus } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { RowActions } from "@/Components/Common/RowActions";
import { Facts } from "@/Components/InnoCBS/Deposits/depositShared";
import { OpDialog, RowsTable, cell, first, pct, useL, words } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { notifications } from "@/Utils/Lib/notifications";
import { DistributionView, Status, distributionApi, header, useCategories, useShareOptions } from "@/Components/InnoCBS/Shares/shareShared";

export function ReturnsDividends() {
  const L = useL();
  const shareOpts = useShareOptions();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const categories = useCategories();
  const [open, setOpen] = useState(null);
  const [declaring, setDeclaring] = useState(false);
  const [preview, setPreview] = useState(null);
  const list = useServerList({ api: distributionApi.listPath, call: distributionApi.list });
  if (!can("View")) return <NoAccess />;
  const view = (id) =>
    distributionApi
      .get({ id: Number(id) })
      .then((r) => setOpen(first(r)))
      .catch((e) => notifications.error(e.message));
  const fields = [
    { key: "kind", label: L("kind"), type: "select", required: true, options: (shareOpts.distribution_kinds ?? ["DIVIDEND", "INTEREST"]).map((v) => ({ value: v, label: words(v) })) },
    { key: "share_category_code", label: L("category"), type: "select", required: true, options: categories },
    { key: "period_from", label: L("period_from"), type: "date", required: true },
    { key: "period_to", label: L("period_to"), type: "date", required: true },
    { key: "rate", label: L("rate"), type: "rate", required: true },
  ];
  return (
    <div className="pt-1 pb-6">
      {header(L, "Returns & Dividends", "Dividends and interest on shares: declare (worked out per member), then a checker approves and pays.")}
      <ListTable
        list={list}
        rowKey={(r) => r.id}
        title={L("Returns & Dividends")}
        emptyTitle={L("Nothing declared yet")}
        actions={
          can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setDeclaring(true)}>
              {L("Declare")}
            </Button>
          )
        }
        columns={[
          { key: "kind", label: L("kind"), render: (r) => cell(words(r.kind)) },
          { key: "share_category_code", label: L("category"), render: (r) => cell(r.share_category_code) },
          { key: "period", label: L("period"), sortable: false, render: (r) => cell(`${r.period_from} → ${r.period_to}`) },
          { key: "rate", label: L("rate"), render: (r) => cell(pct(r.rate)) },
          { key: "members", label: L("members"), render: (r) => cell(r.members) },
          { key: "total_net", label: L("total_net"), render: (r) => cell(r.total_net) },
          { key: "calculated_by", label: L("calculated_by"), render: (r) => cell(r.calculated_by) },
          { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
          { key: "actions", label: t("actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => view(r.id)} /> },
        ]}
      />
      {open && <DistributionView d={open} onClose={() => setOpen(null)} onDecided={() => (setOpen(null), list.reload())} />}
      {declaring && (
        <OpDialog
          size="lg"
          title={L("Declare")}
          hint={L("Preview the per-member split first; declaring saves it for a checker.")}
          fields={fields}
          initial={{ kind: "DIVIDEND" }}
          confirmLabel={L("Declare")}
          run={(x) => distributionApi.add(x)}
          onClose={() => (setDeclaring(false), setPreview(null))}
          onDone={() => (setDeclaring(false), setPreview(null), list.reload())}
        >
          {(form) => (
            <div className="mb-3">
              <Button
                size="sm"
                variant="secondary"
                icon={Calculator}
                disabled={!fields.every((f) => form[f.key])}
                disabledReason={t("blockedFillRequired")}
                onClick={() =>
                  distributionApi
                    .preview(form)
                    .then((r) => setPreview(first(r)))
                    .catch((e) => notifications.error(e.message))
                }
              >
                {L("Preview")}
              </Button>
              {preview && (
                <div className="mt-3">
                  <Facts className="mb-2" rows={[[L("total_gross"), preview.total_gross], [L("total_tax"), preview.total_tax], [L("total_net"), preview.total_net], [L("members"), (preview.lines ?? []).length]]} />
                  <RowsTable rows={preview.lines} empty={L("No members qualify.")} columns={[{ key: "member_number", label: L("member"), render: (x) => `${x.member_number} · ${x.name}` }, { key: "shares", label: L("shares"), numeric: true }, { key: "gross", label: L("gross"), numeric: true }, { key: "tax", label: L("tax"), numeric: true }, { key: "net", label: L("net"), numeric: true }]} />
                </div>
              )}
            </div>
          )}
        </OpDialog>
      )}
    </div>
  );
}
