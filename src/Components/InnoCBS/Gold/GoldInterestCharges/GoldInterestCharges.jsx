import { cell, dateCell, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status } from "@/Components/InnoCBS/OpsList";
import { chargesApi, useGoldOptions } from "@/Components/InnoCBS/Gold/goldShared";

export function GoldInterestCharges() {
  const L = useL();
  useGoldOptions();
  return (
    <OpsList
      api={chargesApi}
      title="Interest & Charges"
      sub="Interest and charges of gold loans."
      columns={[
        { key: "facility_number", label: L("Facility"), render: (r) => cell(r.facility_number ?? r.facility_id) },
        { key: "customer", label: L("customer"), render: (r) => cell(r.customer) },
        { key: "kind", label: L("kind"), render: (r) => cell(words(r.kind ?? r.charge_type)) },
        { key: "amount", label: L("amount"), render: (r) => cell(r.amount) },
        { key: "date", label: L("date"), render: (r) => dateCell(r.date ?? r.created_time) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
    />
  );
}
