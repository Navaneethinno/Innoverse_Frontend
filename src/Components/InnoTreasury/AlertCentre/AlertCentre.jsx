import { Bell, CheckCheck, CheckCircle2 } from "lucide-react";
import { cell, dateCell, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status } from "@/Components/InnoCBS/OpsList";
import { alertApi } from "@/Components/InnoTreasury/treasuryOpsShared";

export function AlertCentre() {
  const L = useL();
  const sev = (s) => (s === "CRITICAL" ? "FAILED" : s === "HIGH" || s === "WARNING" ? "OVERDUE" : s);
  return (
    <OpsList
      api={alertApi}
      title="alertCentre"
      sub="Treasury alerts raised daily (02:30) and on events: acknowledge and close them."
      columns={[
        { key: "raised_at", label: L("raised_at"), render: (r) => dateCell(r.raised_at) },
        { key: "severity", label: L("severity"), render: (r) => <Status code={sev(r.severity)} /> },
        { key: "title", label: L("alert"), align: "left", render: (r) => <span className="text-xs"><b>{r.title}</b><span className="block text-[10px] text-muted-foreground">{r.body}</span></span> },
        { key: "alert_type", label: L("alert_type"), render: (r) => cell(words(r.alert_type)) },
        { key: "due_date", label: L("due_date"), render: (r) => dateCell(r.due_date) },
        { key: "notified_roles", label: L("notified"), render: (r) => cell(`${words(r.notified_roles)} · L${r.level}`) },
        { key: "acknowledged_by", label: L("acknowledged_by"), render: (r) => cell(r.acknowledged_by) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[{ key: "run", label: L("Raise alerts now"), icon: Bell, right: "Authorize", call: alertApi.run, body: {} }]}
      rowActions={(r) => [
        { key: "ack", flag: "acknowledge", label: L("Acknowledge"), icon: CheckCircle2, right: "Edit", show: (x) => x.status === "OPEN", dialog: { title: L("Acknowledge"), fields: [{ key: "remarks", label: L("remarks"), type: "textarea", required: true }], run: (x) => alertApi.acknowledge({ ids: [Number(r.id)], close: false, remarks: x.remarks }) } },
        { key: "close", label: L("Close"), icon: CheckCheck, right: "Edit", show: (x) => x.status !== "CLOSED", dialog: { title: L("Close the alert"), fields: [{ key: "remarks", label: L("remarks"), type: "textarea", required: true }], run: (x) => alertApi.acknowledge({ ids: [Number(r.id)], close: true, remarks: x.remarks }) } },
      ]}
    />
  );
}
