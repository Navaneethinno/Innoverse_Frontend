import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Calculator, CheckCircle2, FileBarChart, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { RowActions } from "@/Components/Common/RowActions";
import { OpDialog, cell, first, useL } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { notifications } from "@/Utils/Lib/notifications";
import { DistributionFacts, Status, act, header, profitApi } from "@/Components/InnoCBS/Deposits/depositOpsShared";

export function ProfitDistribution() {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const [open, setOpen] = useState(null);
  const [calc, setCalc] = useState(false);
  const [preview, setPreview] = useState(null);
  const list = useServerList({ api: profitApi.listPath, call: profitApi.list });
  if (!can("View")) return <NoAccess />;
  const view = (id) =>
    profitApi
      .get({ id })
      .then((r) => setOpen(first(r)))
      .catch((e) => notifications.error(e.message));
  const decide = (verb) => act(profitApi[verb], { id: open.id }, () => (setOpen(null), list.reload()));
  const fields = [
    { key: "product_code", label: L("product_code"), type: "code", required: true, placeholder: "AP_MUDARABA" },
    { key: "pool_result", label: L("pool_result"), type: "amount", required: true },
    { key: "period_from", label: L("period_from"), type: "date", required: true },
    { key: "period_to", label: L("period_to"), type: "date", required: true },
  ];
  return (
    <div className="pt-1 pb-6">
      {header(L, "profitDistribution", "Islamic profit distribution: preview, calculate, then a checker approves and the profit is posted to depositors.")}
      <ListTable
        list={list}
        rowKey={(r) => r.id}
        title={L("profitDistribution")}
        emptyTitle={L("No distributions yet")}
        actions={
          can("Add") && (
            <Button size="sm" icon={Calculator} onClick={() => setCalc(true)}>
              {L("Calculate a distribution")}
            </Button>
          )
        }
        columns={[
          { key: "product_code", label: L("product"), render: (r) => cell(r.product_code) },
          { key: "period", label: L("period"), sortable: false, render: (r) => cell(`${r.period_from} → ${r.period_to}`) },
          { key: "pool_result", label: L("pool_result"), render: (r) => cell(r.pool_result) },
          { key: "distributable_to_depositors", label: L("distributable_to_depositors"), render: (r) => cell(r.distributable_to_depositors) },
          { key: "calculated_by", label: L("calculated_by"), render: (r) => cell(r.calculated_by) },
          { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
          { key: "actions", label: t("actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => view(r.id)} /> },
        ]}
      />
      {open && (
        <OpDialog size="lg" title={L("profitDistribution")} fields={[]} confirmLabel={L("Close")} run={async () => null} onClose={() => setOpen(null)} onDone={() => setOpen(null)}>
          {() => (
            <>
              <DistributionFacts d={open} />
              {(open.actions?.approve || open.actions?.reject) && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="danger" icon={XCircle} onClick={() => decide("reject")}>
                    {L("reject")}
                  </Button>
                  <Button size="sm" icon={CheckCircle2} onClick={() => decide("approve")}>
                    {L("Approve and post")}
                  </Button>
                </div>
              )}
            </>
          )}
        </OpDialog>
      )}
      {calc && (
        <OpDialog
          size="lg"
          title={L("Calculate a distribution")}
          hint={L("Preview first; calculating saves it for a checker.")}
          fields={fields}
          confirmLabel={L("Calculate")}
          run={(x) => profitApi.calculate(x)}
          onClose={() => (setCalc(false), setPreview(null))}
          onDone={() => (setCalc(false), setPreview(null), list.reload())}
        >
          {(form) => (
            <div className="mb-3">
              <Button
                size="sm"
                variant="secondary"
                icon={FileBarChart}
                disabled={!fields.every((f) => form[f.key])}
                disabledReason={t("blockedFillRequired")}
                onClick={() =>
                  profitApi
                    .preview(form)
                    .then((r) => setPreview(first(r)))
                    .catch((e) => notifications.error(e.message))
                }
              >
                {L("Preview")}
              </Button>
              {preview && (
                <div className="mt-3">
                  <DistributionFacts d={preview} />
                </div>
              )}
            </div>
          )}
        </OpDialog>
      )}
    </div>
  );
}
