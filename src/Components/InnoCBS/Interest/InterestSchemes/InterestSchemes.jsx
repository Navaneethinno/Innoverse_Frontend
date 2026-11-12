import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { cell, coded, codes, schemeApi, useL, words } from "@/Components/InnoCBS/Interest/interestShared";

export function InterestSchemes() {
  const L = useL();
  const f = (key, type = "select", extra = {}) => ({ key, label: L(key), type, ...extra });
  return (
    <RecordScreen
      api={schemeApi}
      title={L("interestSchemes")}
      subtitle={L("How interest is worked out for a kind of product: frequencies, day count, and what its rates depend on.")}
      effectiveDated
      columns={[
        { key: "category", label: L("category"), render: (r) => cell(words(r.category ?? r.setup?.category)) },
        { key: "rate_type", label: L("rate_type"), render: (r) => cell(words(r.rate_type ?? r.setup?.rate_type)) },
        { key: "calculation_type", label: L("calculation_type"), render: (r) => cell(words(r.calculation_type ?? r.setup?.calculation_type)) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "HL_FLOAT" }),
        f("name", "text", { required: true }),
        f("category", "select", { required: true, options: codes("categories") }),
        f("scheme_type", "select", { required: true, options: codes("scheme_types") }),
        f("deposit_type", "select", { options: codes("deposit_types"), showIf: (x) => x.category === "DEPOSIT" }),
        f("rate_type", "select", { required: true, options: codes("rate_types") }),
        f("calculation_type", "select", { required: true, options: codes("calculation_types") }),
        f("day_count", "select", { required: true, options: codes("day_counts") }),
        f("accrual_frequency", "select", { options: codes("accrual_frequencies") }),
        f("compounding_frequency", "select", { options: codes("compounding_frequencies") }),
        f("credit_frequency", "select", { options: codes("credit_frequencies") }),
        f("balance_method", "select", { options: codes("balance_methods") }),
        f("tier_method", "select", { options: codes("tier_methods") }),
        f("currency", "select", { options: (c) => (c.currencies ?? []).map((x) => ({ value: x.code, label: `${x.code} · ${x.name}` })), hint: L("Leave empty for any currency.") }),
        f("benchmark_code", "select", { options: coded("benchmarks"), showIf: (x) => x.rate_type === "FLOATING" }),
        f("reset_frequency", "select", { options: codes("reset_frequencies"), showIf: (x) => x.rate_type === "FLOATING" }),
        f("floor_rate", "rate"),
        f("cap_rate", "rate"),
        f("min_interest", "amount"),
        f("max_interest", "amount"),
        f("decimals", "int"),
        f("rounding_mode", "select", { options: codes("rounding_modes") }),
        f("rate_change_rule", "select", { options: codes("rate_change_rules") }),
        f("age_reference", "select", { options: codes("age_references") }),
        f("dimensions", "multi", { options: codes("dimensions"), hint: L("What the scheme's rates depend on. Gender and age are optional pricing dimensions; check them against fair-lending rules.") }),
        f("override_allowed", "bool"),
        f("max_override_bps", "int", { showIf: (x) => x.override_allowed }),
        f("effective_from", "date", { required: true }),
        f("description", "textarea"),
      ]}
      bodyOf={(x) => ({ ...x, decimals: Number(x.decimals || 0), max_override_bps: Number(x.max_override_bps || 0) })}
    />
  );
}
