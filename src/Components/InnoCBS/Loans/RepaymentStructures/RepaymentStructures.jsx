import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { RowsInput, byId, cell, codes, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { structureApi, toNum, useF } from "@/Components/InnoCBS/Loans/loanScreensShared";

export function RepaymentStructures() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={structureApi}
      title={L("repaymentStructures")}
      subtitle={L("How a loan product is repaid: EMI, equal principal, interest only, bullet, balloon, step up or down, custom.")}
      effectiveDated
      columns={[
        { key: "repayment_structure", label: L("repayment_structure"), render: (r) => cell(words(sv(r, "repayment_structure"))) },
        { key: "loan_product_id", label: L("product"), render: (r) => cell(r.loan_product_name ?? sv(r, "loan_product_id")) },
      ]}
      fields={[
        f("loan_product_id", "select", { required: true, options: byId("loan_products") }),
        f("repayment_structure", "select", { required: true, options: codes("repayment_structures") }),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("name", "text", { wide: true }),
        f("interest_method", "select", { options: codes("interest_methods") }),
        f("interest_basis", "select", { options: codes("interest_bases") }),
        f("first_instalment_convention", "select", { options: codes("first_instalment_conventions") }),
        f("first_after_days", "int"),
        f("due_day", "int", { hint: L("0 keeps the disbursement day.") }),
        f("interest_only_periods", "int", { showIf: (x) => ["INTEREST_ONLY", "BALLOON", "BULLET"].includes(x.repayment_structure) }),
        f("balloon_percent", "percent", { showIf: (x) => x.repayment_structure === "BALLOON" }),
        f("step_percent", "percent", { showIf: (x) => String(x.repayment_structure).startsWith("STEP") }),
        f("step_every", "int", { showIf: (x) => String(x.repayment_structure).startsWith("STEP") }),
        {
          key: "principal_plan",
          label: L("principal_plan"),
          type: "custom",
          showIf: (x) => x.repayment_structure === "CUSTOM_PRINCIPAL",
          render: (v, set) => <RowsInput value={v} onChange={set} blank={() => ({ instalment: "", percent: "" })} columns={[{ key: "instalment", label: L("instalment"), type: "int" }, { key: "percent", label: L("percent"), type: "percent" }]} />,
        },
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={(x) => ({ ...toNum(["loan_product_id", "due_day", "first_after_days", "interest_only_periods", "step_every"])(x), principal_plan: (x.principal_plan ?? []).map((p) => ({ instalment: Number(p.instalment), percent: String(p.percent) })) })}
    />
  );
}
