import { useState } from "react";
import { Plus } from "lucide-react";
import { cell, pct, useL } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status } from "@/Components/InnoCBS/OpsList";
import { ValuationNew, ValuationView, grams, useGoldOptions, valuationApi } from "@/Components/InnoCBS/Gold/goldShared";

export function NewGoldLoanApplication() {
  const L = useL();
  useGoldOptions();
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [key, setKey] = useState(0);
  if (openId) return <ValuationView id={openId} onBack={() => setOpenId(null)} />;
  return (
    <>
      <OpsList
        key={key}
        api={valuationApi}
        title="newGoldLoanApplication"
        sub="Value each ornament, an independent appraiser approves, the customer acknowledges, then the loan is booked."
        columns={[
          { key: "valuation_number", label: L("valuation"), align: "left", render: (r) => <button type="button" className="text-left text-xs font-bold text-primary hover:underline" onClick={() => setOpenId(Number(r.id))}>{r.valuation_number}<span className="block text-[10px] font-normal text-muted-foreground">{r.customer}</span></button> },
          { key: "product_code", label: L("product"), render: (r) => cell(r.product_code) },
          { key: "net_weight", label: L("net_weight"), render: (r) => cell(grams(r.net_weight)) },
          { key: "gold_value", label: L("gold_value"), render: (r) => cell(r.gold_value) },
          { key: "maximum_eligible_loan", label: L("maximum_eligible_loan"), render: (r) => cell(`${r.maximum_eligible_loan} · ${pct(r.ltv)}`) },
          { key: "requested_amount", label: L("requested_amount"), render: (r) => cell(r.requested_amount) },
          { key: "facility_number", label: L("Facility"), render: (r) => cell(r.facility_number) },
          { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
        ]}
        toolbar={[{ key: "new", label: L("New valuation"), icon: Plus, right: "Add", onPress: () => setAdding(true) }]}
      />
      {adding && <ValuationNew onClose={() => setAdding(false)} onDone={() => (setAdding(false), setKey((k) => k + 1))} />}
    </>
  );
}
