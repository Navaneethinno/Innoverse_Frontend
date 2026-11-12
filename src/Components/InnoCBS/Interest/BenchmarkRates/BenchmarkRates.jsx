import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import { benchmarkApi, cell, codes, pct, useL } from "@/Components/InnoCBS/Interest/interestShared";

export function BenchmarkRates() {
  const L = useL();
  return (
    <RecordScreen
      api={benchmarkApi}
      title={L("benchmarkRates")}
      subtitle={L("Benchmark rates for floating schemes, effective-dated.")}
      effectiveDated
      columns={[
        { key: "rate", label: L("rate"), render: (r) => cell(pct(r.rate ?? r.setup?.rate)) },
        { key: "effective_from", label: L("effective_from"), render: (r) => cell(accountDate(r.effective_from ?? r.setup?.effective_from)) },
      ]}
      fields={[
        { key: "code", label: L("code"), type: "code", required: true, fixedOnEdit: true, placeholder: "MPR" },
        { key: "name", label: L("name"), required: true },
        { key: "kind", label: L("kind"), type: "select", required: true, options: codes("kinds") },
        { key: "rate", label: L("rate"), type: "rate", required: true },
        { key: "currency", label: L("currency"), type: "select", options: (c) => (c.currencies ?? []).map((x) => ({ value: x.code, label: `${x.code} · ${x.name}` })) },
        { key: "effective_from", label: L("effective_from"), type: "date", required: true },
        { key: "source", label: L("source"), placeholder: "Central Bank" },
        { key: "fallback_benchmark", label: L("fallback_benchmark") },
        { key: "publication_note", label: L("publication_note"), wide: true },
        { key: "description", label: L("description"), type: "textarea" },
      ]}
    />
  );
}
