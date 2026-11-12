import { useState } from "react";
import { Play, Search } from "lucide-react";
import { OpDialog, cell, dateCell, pct, useL } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status, itemsOf } from "@/Components/InnoCBS/OpsList";
import { listOf, reserveApi, warnCell } from "@/Components/InnoTreasury/treasuryOpsShared";

export function ReserveCompliance() {
  const L = useL();
  const [open, setOpen] = useState(null);
  const evidence = (e) => {
    try {
      return JSON.stringify(typeof e === "string" ? JSON.parse(e) : e, null, 2);
    } catch {
      return String(e ?? "");
    }
  };
  return (
    <>
      <OpsList
        api={listOf(reserveApi.history)}
        select={itemsOf}
        title="reserveCompliance"
        sub="Reserve calculations (daily) and their history with the evidence."
        columns={[
          { key: "calc_date", label: L("calc_date"), render: (r) => dateCell(r.calc_date) },
          { key: "requirement_code", label: L("requirement"), render: (r) => cell(`${r.requirement_code} · ${r.requirement_type} v${r.requirement_version}`) },
          { key: "liability_base", label: L("liability_base"), render: (r) => cell(r.liability_base) },
          { key: "required_reserve", label: L("required_reserve"), render: (r) => cell(`${r.required_reserve} (${pct(r.required_percent)})`) },
          { key: "eligible_reserve", label: L("eligible_reserve"), render: (r) => cell(r.eligible_reserve) },
          { key: "shortfall", label: L("shortfall"), render: (r) => warnCell(r.shortfall, Number(r.shortfall) > 0) },
          { key: "excess", label: L("excess"), render: (r) => cell(r.excess) },
          { key: "penalty_per_day", label: L("penalty_per_day"), render: (r) => cell(r.penalty_per_day) },
          { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
        ]}
        rowActions={(r) => [{ key: "evidence", label: L("Evidence"), icon: Search, onPress: () => setOpen(r) }]}
        toolbar={[
          {
            key: "calc",
            label: L("Calculate reserves"),
            icon: Play,
            right: "Authorize",
            dialog: {
              title: L("Calculate reserves"),
              hint: L("Leave the requirement empty for all. A manual base is needed for a MANUAL basis."),
              fields: [
                { key: "requirement_code", label: L("requirement_code"), placeholder: "CRR" },
                { key: "manual_base", label: L("manual_base"), type: "amount" },
              ],
              run: (x) => reserveApi.calculate(Object.fromEntries(Object.entries(x).filter(([, v]) => v !== ""))),
            },
          },
        ]}
      />
      {open && (
        <OpDialog size="lg" title={`${L("Evidence")} · ${open.requirement_code} · ${open.calc_date}`} fields={[]} confirmLabel={L("Close")} run={async () => null} onClose={() => setOpen(null)} onDone={() => setOpen(null)}>
          {() => <pre className="max-h-96 overflow-auto rounded-xl bg-muted/40 p-3 text-[11px]">{evidence(open.evidence)}</pre>}
        </OpDialog>
      )}
    </>
  );
}
