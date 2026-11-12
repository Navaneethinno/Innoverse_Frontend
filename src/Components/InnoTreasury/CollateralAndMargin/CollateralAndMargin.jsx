import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { cell, dateCell, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status } from "@/Components/InnoCBS/OpsList";
import { CollateralMargin } from "../treasuryRecordsShared";
import { marginApi, rowsOrOne, warnCell } from "@/Components/InnoTreasury/treasuryOpsShared";

// ---------- Collateral: records and margin calls ----------

export function CollateralAndMargin() {
  const L = useL();
  const [tab, setTab] = useState("collateral");
  const switcher = <SegmentedSwitch className="mb-3" value={tab} onChange={setTab} options={[{ value: "collateral", label: L("Collateral") }, { value: "calls", label: L("Margin calls") }]} />;
  if (tab === "collateral")
    return (
      <>
        <div className="pt-1">{switcher}</div>
        <CollateralMargin />
      </>
    );
  return (
    <div className="pt-1">
      {switcher}
      <OpsList
        api={marginApi}
        select={rowsOrOne}
        title="Margin calls"
        sub="Margin calls raised when cover falls below the threshold."
        columns={[
          { key: "call_date", label: L("call_date"), render: (r) => dateCell(r.call_date) },
          { key: "collateral_code", label: L("collateral"), render: (r) => cell(r.collateral_code) },
          { key: "direction", label: L("direction"), render: (r) => cell(words(r.direction)) },
          { key: "shortfall", label: L("shortfall"), render: (r) => warnCell(r.shortfall, true) },
          { key: "settled_amount", label: L("settled_amount"), render: (r) => cell(r.settled_amount) },
          { key: "settled_by", label: L("settled_by"), render: (r) => cell(r.settled_by) },
          { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
        ]}
        rowActions={(r) => [
          {
            key: "settle",
            label: L("Settle"),
            icon: CheckCircle2,
            right: "Authorize",
            show: (x) => x.status === "OPEN",
            dialog: {
              title: `${L("Settle the margin call")} · ${r.collateral_code}`,
              fields: [
                { key: "amount", label: L("amount"), type: "amount", required: true, hint: `${L("shortfall")}: ${r.shortfall}` },
                { key: "remarks", label: L("remarks"), type: "textarea", required: true },
              ],
              initial: { amount: r.shortfall },
              run: (x) => marginApi.settle({ id: Number(r.id), ...x }),
            },
          },
        ]}
      />
    </div>
  );
}
