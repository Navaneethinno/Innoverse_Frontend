import { cell, useL, words } from "@/Components/InnoCBS/cbsOps";
import { FacilityChangeScreen, prepayApi } from "@/Components/InnoCBS/Loans/loanScreensShared";

export function Prepayments() {
  const L = useL();
  return (
    <FacilityChangeScreen
      api={prepayApi}
      title="prepayments"
      sub="Quote, request and approve prepayments. Approval debits the repayment account and reschedules the loan."
      addLabel="Request a prepayment"
      amountField={{ key: "amount", label: L("amount"), type: "amount", required: true }}
      columns={[
        { key: "amount", label: L("amount"), render: (r) => cell(r.amount) },
        { key: "prepayment_effect", label: L("prepayment_effect"), render: (r) => cell(words(r.prepayment_effect)) },
        { key: "instalment", label: L("instalment"), sortable: false, render: (r) => cell(`${r.instalment_before} → ${r.instalment_after}`) },
        { key: "maturity", label: L("maturity"), sortable: false, render: (r) => cell(`${r.maturity_before} → ${r.maturity_after}`) },
        { key: "interest_saved", label: L("interest_saved"), render: (r) => cell(r.interest_saved) },
      ]}
    />
  );
}
