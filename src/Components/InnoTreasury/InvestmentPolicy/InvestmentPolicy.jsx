import { cell, codes, sv, useL } from "@/Components/InnoCBS/cbsOps";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { policyApi, toNum, useF } from "../treasuryShared";

export function InvestmentPolicy() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={policyApi}
      title={L("investmentPolicy")}
      subtitle={L("Approval limit (above it a board reference is needed), caps per issuer, industry and equity, price alerts, stop-loss and review.")}
      effectiveDated
      columns={[{ key: "approval_limit", label: L("approval_limit"), render: (r) => cell(sv(r, "approval_limit")) }]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_POLICY" }),
        f("name", "text", { required: true }),
        f("approval_limit", "amount", { required: true }),
        f("max_per_counterparty", "amount", { hint: L("0 means no cap.") }),
        f("max_per_issuer", "amount"),
        f("max_per_industry", "amount"),
        f("max_equity_exposure", "amount"),
        f("valuation_frequency", "select", { options: codes("valuation_frequencies") }),
        f("price_alert_percent", "percent"),
        f("price_max_age_days", "int"),
        f("stop_loss_percent", "percent"),
        f("review_months", "int"),
        f("post_fair_value_changes", "bool"),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["price_max_age_days", "review_months"])}
    />
  );
}
