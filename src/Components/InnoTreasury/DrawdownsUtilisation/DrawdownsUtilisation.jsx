import { Banknote, TrendingDown } from "lucide-react";
import { cell, dateCell, pct, useL } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status } from "@/Components/InnoCBS/OpsList";
import { borrowingApi, today, useActive } from "../treasuryShared";
import { approveReject, drawdownApi } from "@/Components/InnoTreasury/treasuryOpsShared";

// ---------- Borrowings ----------

export function DrawdownsUtilisation() {
  const L = useL();
  const facilities = useActive(borrowingApi, { value: (r) => r.id ?? r.record_id, label: (r) => `${r.code} · ${r.name} · ${r.facility_limit} ${r.currency}` });
  return (
    <OpsList
      api={drawdownApi}
      title="Drawdowns & Utilisation"
      sub="Drawdowns on borrowing facilities (a checker approves when the money is received) and prepayments."
      columns={[
        { key: "drawdown_number", label: L("drawdown"), align: "left", render: (r) => <span className="text-xs"><b>{r.drawdown_number || "—"}</b><span className="block text-[10px] text-muted-foreground">{r.borrowing_code}</span></span> },
        { key: "draw_date", label: L("draw_date"), render: (r) => dateCell(r.draw_date) },
        { key: "amount", label: L("amount"), render: (r) => cell(r.amount) },
        { key: "outstanding", label: L("outstanding"), render: (r) => cell(r.outstanding) },
        { key: "rate", label: L("rate"), render: (r) => cell(pct(r.rate)) },
        { key: "maturity_date", label: L("maturity_date"), render: (r) => dateCell(r.maturity_date) },
        { key: "reference", label: L("reference"), render: (r) => cell(r.reference) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[
        {
          key: "add",
          label: L("New drawdown"),
          icon: Banknote,
          right: "Add",
          dialog: {
            title: L("New drawdown"),
            hint: L("Within the available limit and before the facility expires; a checker approves."),
            fields: [
              { key: "borrowing_id", label: L("Facility"), type: "select", required: true, options: facilities },
              { key: "amount", label: L("amount"), type: "amount", required: true },
              { key: "draw_date", label: L("draw_date"), type: "date", required: true },
              { key: "reference", label: L("reference"), required: true },
            ],
            initial: { draw_date: today() },
            run: (x) => drawdownApi.add({ ...x, borrowing_id: Number(x.borrowing_id) }),
          },
        },
      ]}
      rowActions={(r) => [
        ...approveReject(L, drawdownApi)(r),
        {
          key: "prepay",
          label: L("Prepay"),
          icon: TrendingDown,
          right: "Authorize",
          show: (x) => x.status === "ACTIVE" && Number(x.outstanding) > 0,
          dialog: {
            title: `${L("Prepay")} · ${r.drawdown_number}`,
            fields: [
              { key: "amount", label: L("amount"), type: "amount", required: true, hint: `${L("outstanding")}: ${r.outstanding}` },
              { key: "repay_date", label: L("repay_date"), type: "date", required: true },
              { key: "reference", label: L("reference"), required: true },
            ],
            initial: { repay_date: today() },
            run: (x) => drawdownApi.prepay({ drawdown_id: Number(r.id), ...x }),
          },
        },
      ]}
    />
  );
}
