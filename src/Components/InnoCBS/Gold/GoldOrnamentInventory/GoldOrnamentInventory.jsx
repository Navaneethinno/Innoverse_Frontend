import { cell, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status } from "@/Components/InnoCBS/OpsList";
import { ornamentApi, useGoldOptions } from "@/Components/InnoCBS/Gold/goldShared";

// ---------- Inventory, packets, movements ----------

export function GoldOrnamentInventory() {
  const L = useL();
  useGoldOptions();
  return (
    <OpsList
      api={ornamentApi}
      title="goldOrnamentInventory"
      sub="Every pledged ornament, its weights, value and packet."
      columns={[
        { key: "ornament_ref", label: L("ref"), render: (r) => <span className="font-mono text-xs font-bold">{r.ornament_ref}</span> },
        { key: "description", label: L("description"), align: "left", render: (r) => cell(`${words(r.category)} · ${r.description}`) },
        { key: "customer", label: L("customer"), render: (r) => cell(r.customer) },
        { key: "purity_code", label: L("purity"), render: (r) => cell(r.purity_code) },
        { key: "weights", label: L("Gross / net / fine"), sortable: false, render: (r) => cell(`${r.gross_weight} / ${r.net_weight} / ${r.fine_weight} g`) },
        { key: "gold_value", label: L("gold_value"), render: (r) => cell(r.gold_value) },
        { key: "packet_number", label: L("packet"), render: (r) => cell(r.packet_number) },
        { key: "valuation_number", label: L("valuation"), render: (r) => cell(r.valuation_number) },
        { key: "ornament_status", label: L("status"), render: (r) => <Status code={r.ornament_status} /> },
      ]}
    />
  );
}
