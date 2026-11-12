import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { byId, cell, codes, pct, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { schemeApi, toNum, useF } from "@/Components/InnoCBS/Loans/loanScreensShared";

export function LoanSchemes() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={schemeApi}
      title={L("loanSchemes")}
      subtitle={L("Special pricing for a segment: rate override, maximum amount, fees waived.")}
      effectiveDated
      columns={[
        { key: "scheme_type", label: L("scheme_type"), render: (r) => cell(words(sv(r, "scheme_type"))) },
        { key: "rate_override", label: L("rate"), render: (r) => cell(sv(r, "rate_override") ? pct(sv(r, "rate_override")) : sv(r, "rate_discount") ? `−${pct(sv(r, "rate_discount"))}` : "—") },
        { key: "maximum_amount", label: L("maximum_amount"), render: (r) => cell(sv(r, "maximum_amount")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_WOMEN_SME" }),
        f("name", "text", { required: true }),
        f("loan_product_id", "select", { required: true, options: byId("loan_products") }),
        f("scheme_type", "select", { required: true, options: codes("scheme_types") }),
        f("customer_segments", "multi", { options: codes("customer_segments") }),
        f("rate_override", "rate", { hint: L("Or a discount below; not both.") }),
        f("rate_discount", "rate"),
        f("rate_floor", "rate"),
        f("minimum_amount", "amount"),
        f("maximum_amount", "amount"),
        f("maximum_tenure_months", "int"),
        f("fees_waived", "multi", { options: () => [], optionsFor: (c, x) => (c.product_fees ?? []).filter((p) => String(p.loan_product_id) === String(x.loan_product_id)).map((p) => ({ value: p.fee_code, label: p.fee_name })), hint: L("The fees of the chosen loan product.") }),
        f("fee_discount_percent", "percent"),
        f("override_approval_required", "bool"),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["loan_product_id", "maximum_tenure_months"])}
    />
  );
}
