import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { cell, codes, pct, sv, useL } from "@/Components/InnoCBS/cbsOps";
import { regRuleApi, useF } from "@/Components/InnoCBS/Loans/loanScreensShared";

// ---------- Settings ----------

export function LendingRegulatoryRules() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={regRuleApi}
      title={L("lendingRegulatoryRules")}
      subtitle={L("Per country: rate cap, default interest cap, penalty cap and disclosure.")}
      effectiveDated
      columns={[
        { key: "country", label: L("country"), render: (r) => cell(sv(r, "country")) },
        { key: "maximum_annual_rate", label: L("maximum_annual_rate"), render: (r) => cell(pct(sv(r, "maximum_annual_rate"))) },
        { key: "rule_version", label: L("rule_version"), render: (r) => cell(sv(r, "rule_version")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "NG_CONSUMER" }),
        f("name", "text", { required: true }),
        f("country", "text", { required: true, placeholder: "NG" }),
        f("regulator", "text", { required: true }),
        f("product_category", "select", { options: codes("product_categories"), hint: L("Leave empty for every category.") }),
        f("rule_version"),
        f("maximum_annual_rate", "rate"),
        f("default_interest_allowed", "bool"),
        f("maximum_default_interest_rate", "rate", { showIf: (x) => x.default_interest_allowed }),
        f("maximum_penalty_percent_of_instalment", "percent"),
        f("compounding_allowed", "bool"),
        f("effective_rate_disclosure_required", "bool"),
        f("islamic_late_charges_to_charity", "bool"),
        f("effective_from", "date", { required: true }),
        f("disclosure_requirements", "textarea"),
      ]}
    />
  );
}
