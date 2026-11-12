import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { cell, codes, pct, sv, useL } from "@/Components/InnoCBS/cbsOps";
import { Coverage, insuranceApi, useF } from "@/Components/InnoCBS/Deposits/depositSettingsShared";

export function DepositInsurance() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={insuranceApi}
      title={L("depositInsurance")}
      subtitle={L("Deposit insurance schemes: coverage per depositor and premium.")}
      columns={[
        { key: "insurer", label: L("insurer"), render: (r) => cell(sv(r, "insurer")) },
        { key: "coverage_limit_per_depositor", label: L("coverage_limit_per_depositor"), render: (r) => cell(sv(r, "coverage_limit_per_depositor")) },
        { key: "premium_rate", label: L("premium_rate"), render: (r) => cell(pct(sv(r, "premium_rate"))) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_NDIC" }),
        f("name", "text", { required: true }),
        f("insurer", "text", { required: true, wide: true }),
        f("currency", "select", { options: (c) => (c.currencies ?? []).map((x) => (typeof x === "object" ? { value: x.code, label: `${x.code} · ${x.name}` } : { value: x, label: x })) }),
        f("coverage_limit_per_depositor", "amount", { required: true }),
        f("premium_rate", "rate"),
        f("covered_deposits", "multi", { options: codes("covered_deposits") }),
        f("effective_from", "date"),
      ]}
      extraTabs={[{ key: "coverage", label: L("Coverage"), render: (r) => <Coverage code={r.code ?? r.setup?.code} /> }]}
    />
  );
}
