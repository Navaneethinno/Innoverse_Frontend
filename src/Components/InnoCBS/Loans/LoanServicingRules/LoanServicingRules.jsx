import { Button } from "@/Components/Common/Button";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { RowsInput, byId, cell, codes, sv, useL } from "@/Components/InnoCBS/cbsOps";
import { servicingApi, toNum, useF } from "@/Components/InnoCBS/Loans/loanScreensShared";

export function LoanServicingRules() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={servicingApi}
      title={L("loanServicingRules")}
      subtitle={L("Prepayment, moratorium, grace, penalties, allocation order and DPD buckets of a loan product.")}
      effectiveDated
      columns={[
        { key: "loan_product_id", label: L("product"), render: (r) => cell(r.loan_product_name ?? sv(r, "loan_product_id")) },
        { key: "grace_period_days", label: L("grace_period_days"), render: (r) => cell(sv(r, "grace_period_days")) },
        { key: "prepayment_allowed", label: L("prepayment_allowed"), render: (r) => cell(sv(r, "prepayment_allowed") ? "✓" : "—") },
      ]}
      fields={[
        f("loan_product_id", "select", { required: true, fixedOnEdit: true, options: byId("loan_products") }),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("name", "text", { wide: true }),
        // Prepayment
        f("prepayment_allowed", "bool"),
        f("prepayment_type", "select", { options: codes("prepayment_types"), showIf: (x) => x.prepayment_allowed }),
        f("prepayment_effect", "select", { options: codes("prepayment_effects"), showIf: (x) => x.prepayment_allowed }),
        f("prepayment_approval", "select", { options: codes("approvals"), showIf: (x) => x.prepayment_allowed }),
        f("prepayment_on_overdue", "select", { options: codes("prepayment_on_overdue"), showIf: (x) => x.prepayment_allowed }),
        f("lock_in_months", "int", { showIf: (x) => x.prepayment_allowed }),
        f("lock_in_from", "select", { options: codes("lock_in_from"), showIf: (x) => x.prepayment_allowed }),
        f("minimum_prepayment_amount", "amount", { showIf: (x) => x.prepayment_allowed }),
        f("maximum_prepayment_amount", "amount", { showIf: (x) => x.prepayment_allowed }),
        f("minimum_prepayment_percent", "percent", { showIf: (x) => x.prepayment_allowed }),
        f("maximum_prepayment_percent", "percent", { showIf: (x) => x.prepayment_allowed }),
        f("maximum_prepayments", "int", { showIf: (x) => x.prepayment_allowed }),
        f("count_basis", "select", { options: codes("count_bases"), showIf: (x) => x.prepayment_allowed }),
        f("financial_year_start_month", "int", { showIf: (x) => x.prepayment_allowed && x.count_basis === "FINANCIAL_YEAR" }),
        f("minimum_interval_days", "int", { showIf: (x) => x.prepayment_allowed }),
        f("minimum_remaining_instalments", "int", { showIf: (x) => x.prepayment_allowed }),
        f("notice_days", "int", { showIf: (x) => x.prepayment_allowed }),
        f("multiple_prepayments_per_day", "bool", { showIf: (x) => x.prepayment_allowed }),
        f("prepayment_fee_type", "select", { options: codes("prepayment_fee_types"), showIf: (x) => x.prepayment_allowed }),
        f("prepayment_fee_value", "amount", { showIf: (x) => x.prepayment_allowed && x.prepayment_fee_type && x.prepayment_fee_type !== "NONE" }),
        {
          key: "prepayment_fee_tiers",
          label: L("prepayment_fee_tiers"),
          type: "custom",
          showIf: (x) => x.prepayment_allowed && x.prepayment_fee_type === "TIERED",
          render: (v, set) => <RowsInput value={v} onChange={set} blank={() => ({ from_month: "", percent: "" })} addLabel={L("Add a tier")} columns={[{ key: "from_month", label: L("From loan age (months)"), type: "int" }, { key: "percent", label: L("percent"), type: "percent" }]} />,
        },
        f("prepayment_fee_base", "select", { options: codes("prepayment_fee_bases"), showIf: (x) => x.prepayment_allowed && x.prepayment_fee_type && x.prepayment_fee_type !== "NONE" }),
        // Settlement
        f("settlement_fee_type", "select", { options: codes("settlement_fee_types") }),
        f("settlement_fee_value", "amount", { showIf: (x) => x.settlement_fee_type && x.settlement_fee_type !== "NONE" }),
        f("settlement_notice_days", "int"),
        f("minimum_loan_age_months_for_settlement", "int"),
        // Moratorium
        f("moratorium_allowed", "bool"),
        f("moratorium_type", "select", { options: codes("moratorium_types"), showIf: (x) => x.moratorium_allowed }),
        f("maximum_moratorium_months", "int", { showIf: (x) => x.moratorium_allowed }),
        f("maximum_moratorium_extensions", "int", { showIf: (x) => x.moratorium_allowed }),
        f("interest_during_moratorium", "select", { options: codes("interest_during_moratorium"), showIf: (x) => x.moratorium_allowed }),
        f("post_moratorium_repayment", "select", { options: codes("post_moratorium_repayment"), showIf: (x) => x.moratorium_allowed }),
        f("prepayment_during_moratorium", "bool", { showIf: (x) => x.moratorium_allowed }),
        // Grace, penalties, allocation
        f("grace_period_days", "int"),
        f("grace_period_kind", "select", { options: codes("grace_period_kinds") }),
        f("maximum_penalty_per_loan", "amount"),
        f("allocation_mode", "select", { options: codes("allocation_modes") }),
        f("allocation_order", "multi", { options: codes("allocation_parts"), hint: L("Pick in the order repayments pay them.") }),
        f("sharia_compliant", "bool"),
        {
          key: "penalties",
          label: L("penalties"),
          type: "custom",
          render: (v, set, _f, c) => (
            <RowsInput
              value={v}
              onChange={set}
              blank={() => ({ method: "", value: "", base: "", minimum: "", maximum_per_instalment: "", default_after_dpd: 0, charity: false })}
              columns={[
                { key: "method", label: L("method"), type: "select", options: codes("penalty_methods")(c) },
                { key: "value", label: L("value"), type: "amount" },
                { key: "base", label: L("base"), type: "select", options: codes("penalty_bases")(c) },
                { key: "minimum", label: L("minimum"), type: "amount" },
                { key: "maximum_per_instalment", label: L("maximum_per_instalment"), type: "amount" },
                { key: "default_after_dpd", label: L("default_after_dpd"), type: "int" },
                { key: "charity", label: L("charity"), type: "bool" },
              ]}
            />
          ),
        },
        {
          key: "dpd_buckets",
          label: L("dpd_buckets"),
          type: "custom",
          render: (v, set, _f, c) => (
            <>
              {!(v ?? []).length && (c?.default_dpd_buckets ?? []).length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => set(c.default_dpd_buckets)}>
                  {L("Use the standard buckets")}
                </Button>
              )}
              <RowsInput value={v} onChange={set} blank={() => ({ label: "", from_dpd: "", to_dpd: "" })} columns={[{ key: "label", label: L("label") }, { key: "from_dpd", label: L("from_dpd"), type: "int" }, { key: "to_dpd", label: L("to_dpd"), type: "int" }]} />
            </>
          ),
        },
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={(x) => ({
        ...toNum(["loan_product_id", "lock_in_months", "maximum_prepayments", "financial_year_start_month", "minimum_interval_days", "minimum_remaining_instalments", "notice_days", "settlement_notice_days", "minimum_loan_age_months_for_settlement", "maximum_moratorium_months", "maximum_moratorium_extensions", "grace_period_days"])(x),
        penalties: (x.penalties ?? []).map((p) => ({ ...p, default_after_dpd: Number(p.default_after_dpd || 0) })),
        dpd_buckets: (x.dpd_buckets ?? []).map((b) => ({ ...b, from_dpd: Number(b.from_dpd || 0), to_dpd: Number(b.to_dpd || 0) })),
        prepayment_fee_tiers: (x.prepayment_fee_tiers ?? []).map((t) => ({ from_month: Number(t.from_month || 0), percent: String(t.percent) })),
      })}
    />
  );
}
