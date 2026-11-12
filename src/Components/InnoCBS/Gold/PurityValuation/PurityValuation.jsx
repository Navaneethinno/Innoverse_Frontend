import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { cell, codes, pct, sv, useL } from "@/Components/InnoCBS/cbsOps";
import { purityApi, useF, useGoldOptions } from "@/Components/InnoCBS/Gold/goldShared";

// ---------- Settings ----------

export function PurityValuation() {
  const L = useL();
  useGoldOptions();
  const f = useF();
  return (
    <RecordScreen
      api={purityApi}
      title={L("Purity & Valuation")}
      subtitle={L("Purity master: karat, fineness and testing methods.")}
      effectiveDated
      columns={[
        { key: "karat", label: L("karat"), render: (r) => cell(sv(r, "karat")) },
        { key: "fineness", label: L("fineness"), render: (r) => cell(pct(sv(r, "fineness"))) },
        { key: "testing_methods", label: L("testing_methods"), sortable: false, render: (r) => cell((sv(r, "testing_methods") ?? []).join(", ")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "22K" }),
        f("name", "text", { required: true }),
        f("karat", "amount", { required: true }),
        f("fineness", "percent", { required: true, hint: L("Pure gold share, e.g. 91.6 for 22K.") }),
        f("testing_methods", "multi", { options: codes("testing_methods") }),
        f("second_test_required", "bool"),
        f("effective_from", "date", { required: true }),
      ]}
    />
  );
}
