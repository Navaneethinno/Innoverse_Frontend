import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { RowsInput, byId, cell, codes, pct, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { productApi, toNum, useF, useGoldOptions } from "@/Components/InnoCBS/Gold/goldShared";

export function GoldLoanProducts() {
  const L = useL();
  useGoldOptions();
  const f = useF();
  return (
    <RecordScreen
      api={productApi}
      title={L("goldLoanProducts")}
      subtitle={L("The loan product used, LTV slabs, pre-closure, partial release, revaluation threshold and the auction timeline.")}
      effectiveDated
      columns={[
        { key: "maximum_ltv_percent", label: L("maximum_ltv_percent"), render: (r) => cell(pct(sv(r, "maximum_ltv_percent"))) },
        { key: "amount", label: L("Loan amount"), sortable: false, render: (r) => cell(`${sv(r, "minimum_loan_amount") || "—"}–${sv(r, "maximum_loan_amount") || "—"}`) },
        { key: "repayment_type", label: L("repayment_type"), render: (r) => cell(words(sv(r, "repayment_type"))) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_GL01" }),
        f("name", "text", { required: true }),
        f("loan_product_id", "select", { required: true, options: byId("loan_products"), hint: L("Bookings become loan applications on this product.") }),
        f("repayment_type", "select", { options: codes("repayment_types") }),
        f("minimum_loan_amount", "amount"),
        f("maximum_loan_amount", "amount"),
        f("minimum_tenure_months", "int"),
        f("maximum_tenure_months", "int"),
        f("maximum_ltv_percent", "percent", { required: true }),
        {
          key: "ltv_slabs",
          label: L("ltv_slabs"),
          type: "custom",
          render: (v, set) => <RowsInput value={v} onChange={set} blank={() => ({ up_to_amount: "", ltv_percent: "" })} columns={[{ key: "up_to_amount", label: L("up_to_amount"), type: "amount" }, { key: "ltv_percent", label: L("ltv_percent"), type: "percent" }]} />,
        },
        f("revaluation_ltv_threshold", "percent"),
        f("valuation_max_age_days", "int"),
        f("packet_verification_max_age_days", "int"),
        f("grace_period_days", "int"),
        f("minimum_interest_days", "int"),
        f("partial_payment_allowed", "bool"),
        f("preclosure_allowed", "bool"),
        f("preclosure_lock_in_days", "int", { showIf: (x) => x.preclosure_allowed }),
        f("preclosure_charge_type", "select", { options: codes("preclosure_charge_types"), showIf: (x) => x.preclosure_allowed }),
        f("preclosure_charge_value", "amount", { showIf: (x) => x.preclosure_allowed && x.preclosure_charge_type !== "NONE" }),
        f("preclosure_interest_calculation", "select", { options: codes("preclosure_interest_calculations"), showIf: (x) => x.preclosure_allowed }),
        f("partial_release_allowed", "bool"),
        f("maximum_ltv_after_release", "percent", { showIf: (x) => x.partial_release_allowed }),
        f("minimum_remaining_collateral_value", "amount", { showIf: (x) => x.partial_release_allowed }),
        f("auction_applicable", "bool"),
        f("first_reminder_day", "int", { showIf: (x) => x.auction_applicable }),
        f("second_reminder_day", "int", { showIf: (x) => x.auction_applicable }),
        f("overdue_notice_day", "int", { showIf: (x) => x.auction_applicable }),
        f("demand_notice_day", "int", { showIf: (x) => x.auction_applicable }),
        f("final_notice_day", "int", { showIf: (x) => x.auction_applicable }),
        f("auction_review_day", "int", { showIf: (x) => x.auction_applicable }),
        f("minimum_auction_notice_days", "int", { showIf: (x) => x.auction_applicable }),
        f("reserve_price_percent", "percent", { showIf: (x) => x.auction_applicable }),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["loan_product_id", "minimum_tenure_months", "maximum_tenure_months", "valuation_max_age_days", "packet_verification_max_age_days", "grace_period_days", "minimum_interest_days", "preclosure_lock_in_days", "first_reminder_day", "second_reminder_day", "overdue_notice_day", "demand_notice_day", "final_notice_day", "auction_review_day", "minimum_auction_notice_days"])}
    />
  );
}
