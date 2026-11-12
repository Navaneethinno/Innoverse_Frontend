import { CheckCircle2, Play } from "lucide-react";
import { cell, dateCell, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status } from "@/Components/InnoCBS/OpsList";
import { today } from "../treasuryShared";
import { TreasuryDashboard, accrualApi, eventApi, warnCell } from "@/Components/InnoTreasury/treasuryOpsShared";

export function TreasurySchedule() {
  const L = useL();
  return (
    <OpsList
      api={eventApi}
      title="treasurySchedule"
      sub="Every contract's events, expected against actual. Settling an event posts it to the GL and books it on the interbank account."
      above={() => <TreasuryDashboard />}
      columns={[
        { key: "due_date", label: L("due_date"), render: (r) => dateCell(r.due_date) },
        { key: "ref_code", label: L("contract"), align: "left", render: (r) => <span className="text-xs"><b>{r.ref_code}</b><span className="block text-[10px] text-muted-foreground">{words(r.kind)}</span></span> },
        { key: "event_type", label: L("event"), render: (r) => cell(words(r.event_type)) },
        { key: "direction", label: L("direction"), render: (r) => cell(r.direction) },
        { key: "amount", label: L("amount"), render: (r) => cell(`${r.amount} ${r.currency}`) },
        { key: "actual_amount", label: L("actual_amount"), render: (r) => cell(r.actual_amount ? `${r.actual_amount} · ${r.actual_date}` : "") },
        { key: "variance", label: L("variance"), render: (r) => warnCell(r.variance, Number(r.variance) !== 0) },
        { key: "note", label: L("note"), render: (r) => cell(r.note) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[{ key: "accrual", label: L("Run accruals"), icon: Play, right: "Authorize", dialog: { title: L("Run accruals"), fields: [{ key: "to", label: L("Up to"), type: "date", required: true }], initial: { to: today() }, run: (x) => accrualApi.run(x) } }]}
      rowActions={(r) => [
        {
          key: "settle",
          label: L("Settle"),
          icon: CheckCircle2,
          right: "Authorize",
          show: (x) => x.status !== "DONE" && x.status !== "CANCELLED",
          dialog: {
            title: `${L("Settle")} · ${r.ref_code} · ${words(r.event_type)}`,
            hint: L("A different amount from the expected one raises a variance alert."),
            fields: [
              { key: "actual_amount", label: L("actual_amount"), type: "amount", required: true, hint: `${L("Expected")}: ${r.amount}` },
              { key: "actual_date", label: L("actual_date"), type: "date", required: true },
              { key: "reference", label: L("reference"), required: true },
              { key: "renew", label: L("Renew on maturity"), type: "bool", showIf: () => String(r.event_type).includes("MATURITY") },
              { key: "renew_rate", label: L("renew_rate"), type: "rate", showIf: (x) => x.renew },
            ],
            initial: { actual_amount: r.amount, actual_date: r.due_date },
            run: (x) => eventApi.settle({ id: Number(r.id), actual_amount: x.actual_amount, actual_date: x.actual_date, reference: x.reference, ...(x.renew ? { renew: true, renew_rate: x.renew_rate } : {}) }),
          },
        },
      ]}
    />
  );
}
