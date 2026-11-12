import { cell, useL, words } from "@/Components/InnoCBS/cbsOps";
import { FacilityChangeScreen, moratoriumApi } from "@/Components/InnoCBS/Loans/loanScreensShared";

export function Moratoriums() {
  const L = useL();
  return (
    <FacilityChangeScreen
      api={moratoriumApi}
      title="moratoriums"
      sub="Quote, request and approve repayment holidays."
      addLabel="Request a moratorium"
      amountField={{ key: "months", label: L("months"), type: "int", required: true }}
      columns={[
        { key: "months", label: L("months"), render: (r) => cell(r.months) },
        { key: "moratorium_type", label: L("moratorium_type"), render: (r) => cell(words(r.moratorium_type)) },
        { key: "period", label: L("period"), sortable: false, render: (r) => cell(`${r.from_date} → ${r.to_date}`) },
        { key: "maturity", label: L("maturity"), sortable: false, render: (r) => cell(`${r.maturity_before} → ${r.maturity_after}`) },
        { key: "deferred_interest", label: L("deferred_interest"), render: (r) => cell(r.deferred_interest) },
      ]}
    />
  );
}
