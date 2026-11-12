import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { cell, codes, coded, pct, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { acctProducts, rdProductApi, toNum, useF } from "@/Components/InnoCBS/Deposits/depositSettingsShared";

export function RecurringDepositProducts() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={rdProductApi}
      title={L("recurringDepositProducts")}
      subtitle={L("Instalment limits, frequency, tenure, interest, late payment penalties, suspension, revival and pre-closure.")}
      effectiveDated
      columns={[
        { key: "frequency", label: L("frequency"), render: (r) => cell(words(sv(r, "frequency"))) },
        { key: "annual_rate", label: L("annual_rate"), render: (r) => cell(pct(sv(r, "annual_rate"))) },
        { key: "tenure", label: L("tenure"), sortable: false, render: (r) => cell(`${sv(r, "min_tenure_months") ?? "—"}–${sv(r, "max_tenure_months") ?? "—"} ${L("months")}`) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_RD" }),
        f("name", "text", { required: true }),
        f("acct_product_id", "select", { required: true, options: acctProducts() }),
        f("currency", "select", { required: true, options: codes("currencies") }),
        f("frequency", "select", { required: true, options: codes("frequencies") }),
        f("due_day_rule", "select", { options: codes("due_day_rules") }),
        f("due_day", "int"),
        f("min_instalment", "amount", { required: true }),
        f("max_instalment", "amount"),
        f("instalment_multiple", "amount"),
        f("fixed_instalment", "bool"),
        f("variable_instalment", "bool"),
        f("partial_instalment_allowed", "bool"),
        f("advance_instalment_allowed", "bool"),
        f("max_advance_instalments", "int", { showIf: (x) => x.advance_instalment_allowed }),
        f("auto_debit", "bool"),
        f("min_tenure_months", "int", { required: true }),
        f("max_tenure_months", "int", { required: true }),
        f("scheme_code", "select", { options: coded("schemes"), hint: L("Leave empty to use the annual rate below.") }),
        f("annual_rate", "rate"),
        f("interest_method", "select", { options: codes("interest_methods") }),
        f("compounding_frequency", "select", { options: codes("compounding_frequencies") }),
        f("day_count", "select", { options: codes("day_counts") }),
        f("interest_payment", "select", { options: codes("interest_payments") }),
        f("maturity_instruction", "select", { options: codes("maturity_instructions") }),
        f("maturity_extension_allowed", "bool"),
        f("late_payment_allowed", "bool"),
        f("grace_period_days", "int"),
        f("penalty_methods", "multi", { options: codes("penalty_methods") }),
        f("penalty_fixed", "amount"),
        f("penalty_percent", "percent"),
        f("daily_charge_rate", "rate"),
        f("delayed_interest_rate", "rate"),
        f("penalty_frequency", "select", { options: codes("penalty_frequencies") }),
        f("max_penalty_amount", "amount"),
        f("max_penalty_percent", "percent"),
        f("recovery_mode", "select", { options: codes("recovery_modes") }),
        f("max_missed_instalments", "int"),
        f("suspend_after_missed", "int"),
        f("close_after_missed", "int"),
        f("revival_allowed", "bool"),
        f("revival_fee_type", "select", { options: codes("fee_types"), showIf: (x) => x.revival_allowed }),
        f("revival_fee_value", "amount", { showIf: (x) => x.revival_allowed }),
        f("preclosure_allowed", "bool"),
        f("preclosure_method", "select", { options: codes("preclosure_methods"), showIf: (x) => x.preclosure_allowed }),
        f("preclosure_penalty_rate", "rate", { showIf: (x) => x.preclosure_allowed }),
        f("preclosure_fixed_penalty", "amount", { showIf: (x) => x.preclosure_allowed }),
        f("min_completed_instalments", "int", { showIf: (x) => x.preclosure_allowed }),
        f("min_holding_months", "int", { showIf: (x) => x.preclosure_allowed }),
        f("effective_from", "date", { required: true }),
        f("description", "textarea"),
      ]}
      bodyOf={toNum(["acct_product_id", "due_day", "max_advance_instalments", "min_tenure_months", "max_tenure_months", "grace_period_days", "max_missed_instalments", "suspend_after_missed", "close_after_missed", "min_completed_instalments", "min_holding_months"])}
    />
  );
}
