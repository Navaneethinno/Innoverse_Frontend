import { useState } from "react";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { cell, codes, pct, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { ChargeRequests, chargeRuleApi, useF } from "@/Components/InnoCBS/Deposits/depositSettingsShared";

export function DepositCharges() {
  const L = useL();
  const f = useF();
  const [view, setView] = useState("rules");
  const switcher = <SegmentedSwitch className="mb-3" value={view} onChange={setView} options={[{ value: "rules", label: L("Charge rules") }, { value: "requests", label: L("Charge requests") }]} />;
  if (view === "requests")
    return (
      <div className="pt-1 pb-6">
        {switcher}
        <ChargeRequests />
      </div>
    );
  return (
    <>
      <div className="pt-1">{switcher}</div>
      <RecordScreen
        api={chargeRuleApi}
        title={L("depositCharges")}
        subtitle={L("Maintenance, minimum balance penalty, excess withdrawals, certificate fees: how they are worked out and when collected.")}
        effectiveDated
        columns={[
          { key: "charge_type", label: L("charge_type"), render: (r) => cell(words(sv(r, "charge_type"))) },
          { key: "charge", label: L("charge"), sortable: false, render: (r) => cell(sv(r, "charge_amount") || pct(sv(r, "charge_rate"))) },
          { key: "collection_timing", label: L("collection_timing"), render: (r) => cell(words(sv(r, "collection_timing"))) },
        ]}
        fields={[
          f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_CERT" }),
          f("name", "text", { required: true }),
          f("charge_type", "select", { required: true, options: codes("charge_types") }),
          f("applies_to", "multi", { options: codes("applies_to") }),
          f("acct_product_ids", "multi", { options: (c) => (c.account_products ?? []).map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` })), hint: L("Leave empty for every product of the types above.") }),
          f("calculation_method", "select", { required: true, options: codes("calculation_methods") }),
          f("calculation_base", "select", { options: codes("calculation_bases") }),
          f("charge_amount", "amount"),
          f("charge_rate", "rate"),
          f("minimum_charge", "amount"),
          f("maximum_charge", "amount"),
          f("tax_percent", "percent"),
          f("collection_timing", "select", { required: true, options: codes("collection_timings") }),
          f("gl_purpose", "select", { blank: L("Deposit charge income (default)"), options: (c) => (c.gl_purposes ?? []).map((g) => ({ value: g.code, label: g.name })) }),
          f("waive_if_balance_at_least", "amount"),
          f("waivable", "bool"),
          f("refundable", "bool"),
          f("reversal_allowed", "bool"),
          f("effective_from", "date", { required: true }),
          f("description", "textarea"),
        ]}
      />
    </>
  );
}
