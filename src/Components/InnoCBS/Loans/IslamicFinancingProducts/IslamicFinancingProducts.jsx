import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { cell, codes, pct, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { ifProductApi, toNum, useF } from "@/Components/InnoCBS/Loans/loanScreensShared";

export function IslamicFinancingProducts() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={ifProductApi}
      title={L("islamicFinancingProducts")}
      subtitle={L("Murabaha, Ijara, Diminishing Musharaka, Qard Hasan and Mudaraba products with their late charge rules.")}
      effectiveDated
      columns={[
        { key: "contract_type", label: L("contract_type"), render: (r) => cell(words(sv(r, "contract_type"))) },
        { key: "indicative_profit_rate", label: L("indicative_profit_rate"), render: (r) => cell(pct(sv(r, "indicative_profit_rate"))) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_MURABAHA" }),
        f("name", "text", { required: true }),
        f("contract_type", "select", { required: true, options: codes("contract_types") }),
        f("currency", "text", { placeholder: "NGN" }),
        f("indicative_profit_rate", "rate", { showIf: (x) => x.contract_type !== "QARD_HASAN" }),
        f("maximum_instalments", "int"),
        f("grace_period_days", "int"),
        f("tawidh_annual_rate", "rate", { hint: L("Ta'widh: compensation for actual loss, may be income.") }),
        f("tawidh_maximum_per_instalment", "amount"),
        f("gharamah_type", "select", { options: codes("gharamah_types"), hint: L("Gharamah goes to charity, never income.") }),
        f("gharamah_value", "amount", { showIf: (x) => x.gharamah_type && x.gharamah_type !== "NONE" }),
        f("ibra_percent", "percent", { hint: L("Rebate of unearned profit on early settlement.") }),
        f("rental_revision_months", "int", { showIf: (x) => x.contract_type === "IJARA" }),
        f("rental_revision_percent", "percent", { showIf: (x) => x.contract_type === "IJARA" }),
        f("sharia_reference", "text", { required: true }),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["maximum_instalments", "grace_period_days", "rental_revision_months"])}
    />
  );
}
