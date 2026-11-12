import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { cell, codes, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { categoryApi, toNum, useF } from "@/Components/InnoCBS/Shares/shareShared";

// ---------- Settings ----------

export function ShareCategories() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={categoryApi}
      title={L("shareCategories")}
      subtitle={L("Face value, issue price, limits, voting, dividends, transfer and redemption rules.")}
      effectiveDated
      columns={[
        { key: "instrument_type", label: L("instrument_type"), render: (r) => cell(words(sv(r, "instrument_type"))) },
        { key: "price", label: L("Face value / issue price"), sortable: false, render: (r) => cell(`${sv(r, "face_value") ?? "—"} / ${sv(r, "issue_price") ?? "—"} ${sv(r, "currency") ?? ""}`) },
        { key: "voting_rights", label: L("voting_rights"), render: (r) => cell(words(sv(r, "voting_rights"))) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "E" }),
        f("name", "text", { required: true }),
        f("instrument_type", "select", { required: true, options: codes("instrument_types") }),
        f("currency", "text", { required: true, placeholder: "NGN" }),
        f("face_value", "amount", { required: true }),
        f("issue_price", "amount", { required: true }),
        f("eligibility_types", "multi", { options: codes("eligibility_types") }),
        f("minimum_shares", "int"),
        f("maximum_shares", "int", { hint: L("0 means no limit.") }),
        f("minimum_investment", "amount"),
        f("maximum_investment", "amount"),
        f("instalment_purchase_allowed", "bool"),
        f("voting_rights", "select", { options: codes("voting_rights") }),
        f("dividend_eligible", "bool"),
        f("interest_applicable", "bool"),
        f("return_type", "select", { options: codes("return_types") }),
        f("return_rate", "rate", { showIf: (x) => x.return_type && x.return_type !== "NONE" }),
        f("rate_type", "select", { options: codes("rate_types"), showIf: (x) => x.return_type && x.return_type !== "NONE" }),
        f("interest_scheme_code", "text", { showIf: (x) => x.interest_applicable }),
        f("calculation_method", "select", { options: codes("calculation_methods") }),
        f("calculation_basis", "select", { options: codes("calculation_bases") }),
        f("payment_frequency", "select", { options: codes("payment_frequencies") }),
        f("tax_rate", "rate"),
        f("transfer_permitted", "bool"),
        f("redemption_permitted", "bool"),
        f("partial_redemption", "bool", { showIf: (x) => x.redemption_permitted }),
        f("full_redemption", "bool", { showIf: (x) => x.redemption_permitted }),
        f("redemption_triggers", "multi", { options: codes("redemption_triggers"), showIf: (x) => x.redemption_permitted }),
        f("redemption_maker_checker", "bool", { showIf: (x) => x.redemption_permitted }),
        f("return_on_redemption", "select", { options: codes("return_on_redemption"), showIf: (x) => x.redemption_permitted }),
        f("deduction_percent", "percent", { showIf: (x) => x.redemption_permitted }),
        f("lock_in_months", "int", { showIf: (x) => x.redemption_permitted }),
        f("minimum_holding_days", "int", { showIf: (x) => x.redemption_permitted }),
        f("processing_days", "int", { showIf: (x) => x.redemption_permitted }),
        f("lien_check", "bool", { showIf: (x) => x.redemption_permitted }),
        f("outstanding_loan_check", "bool", { showIf: (x) => x.redemption_permitted }),
        f("pending_liability_check", "bool", { showIf: (x) => x.redemption_permitted }),
        f("effective_from", "date", { required: true }),
        f("description", "textarea"),
      ]}
      bodyOf={toNum(["minimum_shares", "maximum_shares", "lock_in_months", "minimum_holding_days", "processing_days"])}
    />
  );
}
