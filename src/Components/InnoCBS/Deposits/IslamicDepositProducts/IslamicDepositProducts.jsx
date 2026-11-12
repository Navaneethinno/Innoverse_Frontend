import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { RowsInput, cell, codes, pct, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { acctProducts, islamicApi, useF } from "@/Components/InnoCBS/Deposits/depositSettingsShared";

export function IslamicDepositProducts() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={islamicApi}
      title={L("islamicDepositProducts")}
      subtitle={L("Mudaraba savings and term, Wadiah, Qard current: profit sharing ratio, expected rate, Sharia approval.")}
      effectiveDated
      columns={[
        { key: "contract_type", label: L("contract_type"), render: (r) => cell(words(sv(r, "contract_type"))) },
        { key: "share", label: L("Depositor / mudarib"), sortable: false, render: (r) => cell(`${sv(r, "depositor_profit_share") || "—"} / ${sv(r, "mudarib_profit_share") || "—"}`) },
        { key: "expected_profit_rate", label: L("expected_profit_rate"), render: (r) => cell(pct(sv(r, "expected_profit_rate"))) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_MUDARABA" }),
        f("name", "text", { required: true }),
        f("contract_type", "select", { required: true, options: codes("contract_types") }),
        f("acct_product_id", "select", { required: true, options: acctProducts("acct_products") }),
        f("currency", "select", { options: (c) => (c.currencies ?? []).map((x) => (typeof x === "object" ? { value: x.code, label: `${x.code} · ${x.name}` } : { value: x, label: x })) }),
        f("depositor_profit_share", "percent", { hint: L("Depositor and mudarib shares add up to 100.") }),
        f("mudarib_profit_share", "percent"),
        f("agency_fee_percent", "percent"),
        f("expected_profit_rate", "rate", { hint: L("Indicative only: depositors get the pool's actual profit.") }),
        f("profit_calculation_period", "select", { options: codes("profit_calculation_periods") }),
        f("profit_distribution_frequency", "select", { options: codes("profit_distribution_frequencies") }),
        f("loss_allocation", "select", { options: codes("loss_allocations") }),
        f("early_termination", "select", { options: codes("early_terminations") }),
        f("minimum_balance", "amount"),
        f("sharia_approval_reference", "text", { required: true }),
        f("effective_from", "date", { required: true }),
        f("withdrawal_rules", "textarea"),
        {
          key: "weightages",
          label: L("Weightages"),
          type: "custom",
          render: (v, set) => <RowsInput value={v} onChange={set} blank={() => ({ min_balance: "", weight: "" })} addLabel={L("Add a balance band")} columns={[{ key: "min_balance", label: L("min_balance"), type: "amount" }, { key: "weight", label: L("weight"), type: "rate" }]} />,
        },
      ]}
      bodyOf={(x) => ({ ...x, acct_product_id: Number(x.acct_product_id), weightages: (x.weightages ?? []).filter((w) => w.min_balance !== "" && w.weight !== "") })}
    />
  );
}
