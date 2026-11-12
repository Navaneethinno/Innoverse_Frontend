import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { cell, codes, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { prematureApi, toNum, useF } from "@/Components/InnoCBS/Deposits/depositSettingsShared";

export function PrematureClosureRules() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={prematureApi}
      title={L("prematureClosureRules")}
      subtitle={L("By closure reason: the rate used and the penalty when a term deposit closes early.")}
      effectiveDated
      columns={[
        { key: "closure_reasons", label: L("closure_reasons"), sortable: false, render: (r) => cell((sv(r, "closure_reasons") ?? []).map(words).join(", ")) },
        { key: "method", label: L("method"), render: (r) => cell(words(sv(r, "method"))) },
        { key: "priority", label: L("priority"), render: (r) => cell(sv(r, "priority")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_PC_MED" }),
        f("name", "text", { required: true }),
        f("product_codes", "multi", { options: (c) => (c.deposit_products ?? []).map((p) => ({ value: p.code, label: `${p.code} · ${p.name}` })) }),
        f("closure_reasons", "multi", { options: codes("closure_reasons") }),
        f("premature_allowed", "bool"),
        f("approval_required", "bool"),
        f("customer_segment"),
        f("priority", "int"),
        f("min_principal", "amount"),
        f("max_principal", "amount"),
        f("min_tenor_days", "int"),
        f("max_tenor_days", "int"),
        f("min_holding_days", "int"),
        f("below_min_holding", "select", { options: codes("below_min_holding") }),
        f("method", "select", { required: true, options: codes("methods") }),
        f("rate_selection", "select", { options: codes("rate_selections") }),
        f("special_rate", "rate"),
        f("penalty_type", "select", { options: codes("penalty_types") }),
        f("penalty_value", "rate"),
        f("penalty_base", "select", { options: codes("penalty_bases") }),
        f("deduct_from", "select", { options: codes("deduct_from") }),
        f("partial_closure_allowed", "bool"),
        f("partial_min_amount", "amount", { showIf: (x) => x.partial_closure_allowed }),
        f("partial_max_percent", "percent", { showIf: (x) => x.partial_closure_allowed }),
        f("max_partial_withdrawals", "int", { showIf: (x) => x.partial_closure_allowed }),
        f("min_remaining_deposit", "amount", { showIf: (x) => x.partial_closure_allowed }),
        f("remaining_deposit", "select", { options: codes("remaining_deposit"), showIf: (x) => x.partial_closure_allowed }),
        f("effective_from", "date", { required: true }),
        f("description", "textarea"),
      ]}
      bodyOf={(x) => ({ ...toNum(["priority", "min_holding_days", "max_partial_withdrawals"])(x), min_tenor_days: x.min_tenor_days === "" ? null : Number(x.min_tenor_days), max_tenor_days: x.max_tenor_days === "" ? null : Number(x.max_tenor_days) })}
    />
  );
}
