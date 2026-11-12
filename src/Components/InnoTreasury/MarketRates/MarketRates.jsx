import { Plus } from "lucide-react";
import { cell, dateCell, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList } from "@/Components/InnoCBS/OpsList";
import { choices, useTreasuryOptions, today } from "../treasuryShared";
import { rateApi } from "@/Components/InnoTreasury/treasuryOpsShared";

// ---------- Market rates ----------

export function MarketRates() {
  const L = useL();
  const topt = useTreasuryOptions();
  return (
    <OpsList
      api={rateApi}
      title="marketRates"
      sub="FX rates and benchmarks, with their source and time."
      columns={[
        { key: "rate_date", label: L("rate_date"), render: (r) => dateCell(r.rate_date) },
        { key: "rate_kind", label: L("kind"), render: (r) => cell(words(r.rate_kind)) },
        { key: "code", label: L("Rate"), render: (r) => cell(r.rate_kind === "FX" ? `${r.base_currency}/${r.quote_currency}` : r.code) },
        { key: "rate", label: L("rate"), render: (r) => cell(Number(r.rate).toString()) },
        { key: "source", label: L("source"), render: (r) => cell(r.source) },
        { key: "entered_by", label: L("entered_by"), render: (r) => cell(r.entered_by) },
        { key: "captured_at", label: L("captured_at"), render: (r) => dateCell(r.captured_at) },
      ]}
      toolbar={[
        {
          key: "add",
          label: L("Enter a rate"),
          icon: Plus,
          right: "Add",
          dialog: {
            title: L("Enter a rate"),
            fields: [
              { key: "rate_kind", label: L("kind"), type: "select", required: true, options: topt.rate_kinds?.length ? choices(topt.rate_kinds) : [{ value: "FX", label: "FX" }, { value: "BENCHMARK", label: L("Benchmark") }] },
              { key: "base_currency", label: L("base_currency"), type: "select", options: choices(topt.currencies), showIf: (x) => x.rate_kind === "FX" },
              { key: "quote_currency", label: L("quote_currency"), type: "select", options: choices(topt.currencies), showIf: (x) => x.rate_kind === "FX" },
              { key: "benchmark_code", label: L("benchmark_code"), placeholder: "NIBOR_3M", showIf: (x) => x.rate_kind === "BENCHMARK" },
              { key: "rate", label: L("rate"), type: "rate", required: true },
              { key: "rate_date", label: L("rate_date"), type: "date", required: true },
              { key: "source", label: L("source"), required: true },
            ],
            initial: { rate_kind: "FX", rate_date: today() },
            run: (x) => rateApi.add({ rates: [Object.fromEntries(Object.entries(x).filter(([, v]) => v !== ""))] }),
          },
        },
      ]}
    />
  );
}
