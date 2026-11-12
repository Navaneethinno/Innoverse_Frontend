import { cell, dateCell, pct, useL } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status } from "@/Components/InnoCBS/OpsList";
import { GoldDashboard, accountApi, useGoldOptions } from "@/Components/InnoCBS/Gold/goldShared";

export function GoldLoanAccounts() {
  const L = useL();
  useGoldOptions();
  return (
    <OpsList
      api={accountApi}
      title="goldLoanAccounts"
      sub="Gold loan facilities with their gold, LTV and dues."
      above={() => <GoldDashboard />}
      rowKey={(r) => r.facility_id}
      columns={[
        { key: "facility_number", label: L("Facility"), align: "left", render: (r) => <span className="text-xs"><b>{r.facility_number}</b><span className="block text-[10px] text-muted-foreground">{r.customer}</span></span> },
        { key: "disbursed", label: L("disbursed"), render: (r) => cell(r.disbursed) },
        { key: "principal_outstanding", label: L("principal_outstanding"), render: (r) => cell(r.principal_outstanding) },
        { key: "interest_accrued", label: L("interest_accrued"), render: (r) => cell(r.interest_accrued) },
        { key: "gold_value", label: L("gold_value"), render: (r) => cell(r.gold_value) },
        { key: "ltv", label: "LTV", render: (r) => cell(pct(r.ltv)) },
        { key: "annual_rate", label: L("annual_rate"), render: (r) => cell(pct(r.annual_rate)) },
        { key: "days_past_due", label: "DPD", render: (r) => <span className={`text-xs ${Number(r.days_past_due) > 0 ? "font-bold text-red-700" : ""}`}>{r.days_past_due}</span> },
        { key: "maturity_date", label: L("maturity_date"), render: (r) => dateCell(r.maturity_date) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
    />
  );
}
