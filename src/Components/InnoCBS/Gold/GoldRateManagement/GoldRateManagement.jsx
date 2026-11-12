import { useState } from "react";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { inputClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { cell, codes, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { DailyRates, ratePolicyApi, useF, useGoldOptions } from "@/Components/InnoCBS/Gold/goldShared";

export function GoldRateManagement() {
  const L = useL();
  useGoldOptions();
  const f = useF();
  const [view, setView] = useState("rates");
  const switcher = <SegmentedSwitch className="mb-3" value={view} onChange={setView} options={[{ value: "rates", label: L("Daily rates") }, { value: "policy", label: L("Rate policy") }]} />;
  return (
    <>
      <div className="pt-1">{switcher}</div>
      {view === "rates" ? (
        <DailyRates />
      ) : (
        <RecordScreen
          api={ratePolicyApi}
          title={L("Gold Rate Management")}
          subtitle={L("How and when gold rates are entered, and what happens when one is missing.")}
          effectiveDated
          columns={[
            { key: "rate_basis", label: L("rate_basis"), render: (r) => cell(words(sv(r, "rate_basis"))) },
            { key: "rate_times", label: L("rate_times"), sortable: false, render: (r) => cell((sv(r, "rate_times") ?? []).join(", ")) },
            { key: "missing_rate_action", label: L("missing_rate_action"), render: (r) => cell(words(sv(r, "missing_rate_action"))) },
          ]}
          fields={[
            f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_GOLD" }),
            f("name", "text", { required: true }),
            f("currency", "text", { required: true, placeholder: "NGN" }),
            f("rate_source", "select", { options: codes("rate_sources") }),
            f("rate_basis", "select", { required: true, options: codes("rate_bases") }),
            f("rate_unit", "select", { options: codes("rate_units") }),
            f("rate_entry_frequency", "select", { options: codes("frequencies") }),
            { key: "rate_times", label: L("rate_times"), type: "custom", from: (s) => (s.rate_times ?? []).join(", "), render: (v, set) => <input className={inputClass} placeholder="09:00, 14:00, 17:00" value={v ?? ""} onChange={(e) => set(e.target.value)} /> },
            f("valuation_rate_rule", "select", { options: codes("valuation_rate_rules") }),
            f("specific_rate_time", "text", { placeholder: "09:00", showIf: (x) => String(x.valuation_rate_rule).includes("SPECIFIC") }),
            f("missing_rate_action", "select", { options: codes("missing_rate_actions") }),
            f("fallback_rule", "select", { options: codes("fallback_rules") }),
            f("effective_from", "date", { required: true }),
          ]}
          bodyOf={(x) => ({ ...x, rate_times: String(x.rate_times ?? "").split(",").map((s) => s.trim()).filter(Boolean) })}
        />
      )}
    </>
  );
}
