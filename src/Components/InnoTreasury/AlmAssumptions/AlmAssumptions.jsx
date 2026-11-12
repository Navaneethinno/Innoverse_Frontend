import { RowsInput, cell, sv, useL } from "@/Components/InnoCBS/cbsOps";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { almApi, useF } from "../treasuryShared";
import { csv, csvField } from "@/Components/InnoTreasury/treasuryRecordsShared";

export function AlmAssumptions() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={almApi}
      title={L("almAssumptions")}
      subtitle={L("Maturity buckets, behavioural run-off and renewals, prepayments, haircuts and stress scenarios.")}
      effectiveDated
      columns={[{ key: "buckets", label: L("buckets"), sortable: false, render: (r) => cell((sv(r, "buckets") ?? []).length) }]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_ALM" }),
        f("name", "text", { required: true }),
        f("demand_stable_percent", "percent"),
        csvField(L, "demand_runoff_spread", "40, 30, 20, 10"),
        f("td_renewal_percent", "percent"),
        f("td_premature_percent", "percent"),
        f("loan_prepayment_percent", "percent"),
        f("liquid_security_haircut_percent", "percent"),
        {
          key: "buckets",
          label: L("buckets"),
          type: "custom",
          render: (v, set, _x, c) => (
            <>
              {!(v ?? []).length && (c?.default_buckets ?? []).length > 0 && (
                <button type="button" className="mb-1 text-xs font-semibold text-primary underline" onClick={() => set(c.default_buckets)}>
                  {L("Use the standard buckets")}
                </button>
              )}
              <RowsInput value={v} onChange={set} blank={() => ({ label: "", from_days: "", to_days: "" })} columns={[{ key: "label", label: L("label") }, { key: "from_days", label: L("from_days"), type: "int" }, { key: "to_days", label: L("to_days"), type: "int" }]} />
            </>
          ),
        },
        {
          key: "scenarios",
          label: L("scenarios"),
          type: "custom",
          render: (v, set) => (
            <RowsInput
              value={v}
              onChange={set}
              blank={() => ({ name: "", deposit_runoff_percent: "", loan_inflow_haircut_percent: "", investment_haircut_percent: "", facility_freeze: false })}
              columns={[
                { key: "name", label: L("name") },
                { key: "deposit_runoff_percent", label: L("deposit_runoff_percent"), type: "percent" },
                { key: "loan_inflow_haircut_percent", label: L("loan_inflow_haircut_percent"), type: "percent" },
                { key: "investment_haircut_percent", label: L("investment_haircut_percent"), type: "percent" },
                { key: "facility_freeze", label: L("facility_freeze"), type: "bool" },
              ]}
            />
          ),
        },
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={(x) => ({ ...x, demand_runoff_spread: csv(x.demand_runoff_spread), buckets: (x.buckets ?? []).map((b) => ({ ...b, from_days: Number(b.from_days || 0), to_days: Number(b.to_days || 0) })) })}
    />
  );
}
