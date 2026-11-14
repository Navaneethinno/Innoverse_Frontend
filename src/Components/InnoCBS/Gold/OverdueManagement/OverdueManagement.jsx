import { useState } from "react";
import { CheckCircle2, MailCheck, Play, RefreshCcw, ShieldAlert } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { OpDialog, cell, dateCell, pct, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status } from "@/Components/InnoCBS/OpsList";
import { usePagePermission } from "@/Hooks/usePermission";
import { facilityInput, gl, holdApi, noticeApi, revaluationApi, uploadField, useGoldOptions, viewGoldFile } from "@/Components/InnoCBS/Gold/goldShared";
import { PageTitle } from "@/Components/Common/PageTitle";

// ---------- Overdue ----------

export function OverdueManagement() {
  const L = useL();
  useGoldOptions();
  const can = usePagePermission();
  const [tab, setTab] = useState("notices");
  const [hold, setHold] = useState(null);
  const holdDialog = (
    <>
      {can("Add") && (
        <Button size="sm" variant="secondary" icon={ShieldAlert} onClick={() => setHold("add")}>
          {L("Place a hold")}
        </Button>
      )}
    </>
  );
  return (
    <div className="pt-1">
      <PageTitle>{L("overdueManagement")}</PageTitle>
      <p className="mt-1 mb-3 text-sm text-muted-foreground">{L("Overdue notices and their delivery, holds that stop an auction, and revaluation at today's rates.")}</p>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SegmentedSwitch value={tab} onChange={setTab} options={[{ value: "notices", label: L("Notices") }, { value: "holds", label: L("Holds") }, { value: "revaluation", label: L("Revaluation") }]} />
        <div className="flex gap-2">{holdDialog}</div>
      </div>
      {tab === "notices" && (
        <OpsList
          api={noticeApi}
          columns={[
            { key: "facility_number", label: L("Facility"), render: (r) => cell(r.facility_number ?? r.facility_id) },
            { key: "customer", label: L("customer"), render: (r) => cell(r.customer) },
            { key: "kind", label: L("notice"), render: (r) => cell(words(r.kind)) },
            { key: "channel", label: L("channel"), render: (r) => cell(words(r.channel)) },
            { key: "due_reference", label: L("Due"), render: (r) => dateCell(r.due_reference) },
            { key: "generated_at", label: L("generated"), render: (r) => dateCell(r.generated_at) },
            { key: "provider_reference", label: L("reference"), render: (r) => cell(r.provider_reference) },
            { key: "proof", label: L("proof"), render: (r) => (r.proof ? <button type="button" className="text-xs text-primary underline" onClick={() => viewGoldFile(r.proof)}>{L("View")}</button> : "—") },
            { key: "delivery_status", label: L("status"), render: (r) => <Status code={r.delivery_status} /> },
          ]}
          toolbar={[{ key: "run", label: L("Generate due notices"), icon: Play, right: "Authorize", call: noticeApi.run, body: {} }]}
          rowActions={(r) => [
            {
              key: "delivery",
              label: L("Record delivery"),
              icon: MailCheck,
              right: "Edit",
              show: (x) => x.status !== "SERVED",
              dialog: {
                title: L("Record delivery"),
                fields: [
                  { key: "status", label: L("status"), type: "select", required: true, options: gl("delivery_statuses", ["DISPATCHED", "SERVED", "FAILED", "RETURNED"]) },
                                    { key: "provider_reference", label: L("reference") },
                  uploadField(L, "proof", "NOTICE_PROOF"),
                ],
                initial: { status: "SERVED" },
                run: (x) => noticeApi.delivery({ id: Number(r.id), ...x }),
              },
            },
          ]}
        />
      )}
      {tab === "holds" && (
        <OpsList
          api={holdApi}
          prefix="hd_"
          columns={[
            { key: "created_time", label: L("when"), render: (r) => dateCell(r.created_time) },
            { key: "facility_number", label: L("Facility"), align: "left", render: (r) => <span className="text-xs"><b>{r.facility_number}</b><span className="block text-[10px] text-muted-foreground">{r.customer}</span></span> },
            { key: "kind", label: L("kind"), render: (r) => cell(words(r.kind)) },
            { key: "detail", label: L("detail"), render: (r) => cell(r.detail) },
            { key: "created_by", label: L("by"), render: (r) => cell(r.created_by) },
            { key: "resolved_by", label: L("resolved_by"), render: (r) => cell(r.resolved_by ? `${r.resolved_by} · ${r.resolved_at}` : "") },
            { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
          ]}
          rowActions={(r) => [{ key: "resolve", label: L("Resolve"), icon: CheckCircle2, right: "Edit", call: holdApi.resolve, body: { id: r.id } }]}
        />
      )}
      {tab === "revaluation" && (
        <OpsList
          api={revaluationApi}
          prefix="rv_"
          columns={[
            { key: "facility_number", label: L("Facility"), render: (r) => cell(r.facility_number ?? r.facility_id) },
            { key: "customer", label: L("customer"), render: (r) => cell(r.customer) },
            { key: "revalued_on", label: L("date"), render: (r) => dateCell(r.revalued_on ?? r.created_time) },
            { key: "old_value", label: L("old_value"), render: (r) => cell(r.old_value ?? r.previous_value) },
            { key: "new_value", label: L("new_value"), render: (r) => cell(r.new_value ?? r.gold_value) },
            { key: "ltv", label: "LTV", render: (r) => <span className={`text-xs ${r.flagged || r.breached ? "font-bold text-red-700" : ""}`}>{pct(r.ltv ?? r.new_ltv)}</span> },
            { key: "status", label: L("status"), render: (r) => <Status code={r.status ?? (r.flagged ? "FLAGGED" : "")} /> },
          ]}
          toolbar={[{ key: "run", label: L("Revalue at today's rates"), icon: RefreshCcw, right: "Authorize", call: revaluationApi.run, body: {} }]}
        />
      )}
      {hold === "add" && (
        <OpDialog
          title={L("Place a hold")}
          hint={L("A hold stops notices and auction until it is resolved.")}
          fields={[
            { key: "kind", label: L("kind"), type: "select", required: true, options: gl("hold_kinds", ["DISPUTE"]) },
            { key: "detail", label: L("detail"), type: "textarea", required: true },
          ]}
          needs={(x) => Boolean(x.facility_id)}
          run={(x) => holdApi.add({ facility_id: Number(x.facility_id), kind: x.kind, detail: x.detail })}
          onClose={() => setHold(null)}
          onDone={() => setHold(null)}
        >
          {facilityInput(L)}
        </OpDialog>
      )}
    </div>
  );
}
