import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { cell, codes, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { RequirementCheck, requirementRuleApi, toNum, useF } from "@/Components/InnoCBS/Shares/shareShared";

export function ShareRequirementRules() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={requirementRuleApi}
      title={L("shareRequirementRules")}
      subtitle={L("Shares a customer must hold to get a loan or deposit product.")}
      effectiveDated
      pageActions={<RequirementCheck />}
      columns={[
        { key: "module", label: L("module"), render: (r) => cell(words(sv(r, "module"))) },
        { key: "share_category_code", label: L("share_category_code"), render: (r) => cell(sv(r, "share_category_code")) },
        { key: "value", label: L("requirement"), sortable: false, render: (r) => cell(`${sv(r, "value") ?? "—"} · ${words(sv(r, "calculation_method"))}`) },
      ]}
      fields={[
        f("module", "select", { required: true, options: codes("modules") }),
        f("product_id", "select", { required: true, optionsFor: (c, x) => (c.products?.[x.module] ?? []).map((p) => ({ value: String(p.id), label: p.name })) }),
        f("share_category_code", "select", { required: true, options: (c) => (c.share_categories ?? []).map((x) => ({ value: x.code, label: `${x.code} · ${x.name}` })) }),
        f("requirement_type", "select", { required: true, options: codes("requirement_types") }),
        f("calculation_method", "select", { required: true, options: codes("calculation_methods") }),
        f("value", "amount", { required: true, hint: L("A percentage, an amount or a number of shares, by the method.") }),
        f("percentage_basis", "select", { options: codes("percentage_bases"), showIf: (x) => x.calculation_method === "PERCENTAGE" }),
        f("minimum_quantity", "int"),
        f("maximum_quantity", "int"),
        f("minimum_share_amount", "amount"),
        f("maximum_share_amount", "amount"),
        f("purchase_timing", "select", { options: codes("purchase_timings") }),
        f("redemption_condition", "select", { options: codes("redemption_conditions") }),
        f("existing_share_adjustment", "bool"),
        f("required_for_every_account", "bool"),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("name", "text", { wide: true }),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["product_id", "minimum_quantity", "maximum_quantity"])}
    />
  );
}
