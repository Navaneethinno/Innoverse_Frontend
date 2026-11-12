import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { AcctPick, cell, codes, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { SweepLinks, sweepRuleApi, toNum, useF } from "@/Components/InnoCBS/Deposits/depositSettingsShared";

export function SweepFlexiDeposits() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={sweepRuleApi}
      title={L("Sweep & Flexi Deposits")}
      subtitle={L("Excess savings swept into fixed deposits, broken back when needed.")}
      columns={[
        { key: "acct_num", label: L("account"), render: (r) => cell(sv(r, "acct_num")) },
        { key: "mode", label: L("mode"), render: (r) => cell(words(sv(r, "mode"))) },
        { key: "sweep_threshold", label: L("sweep_threshold"), render: (r) => cell(sv(r, "sweep_threshold")) },
      ]}
      fields={[
        { key: "acct_id", label: L("account"), type: "custom", required: true, render: (v, set, form) => <AcctPick value={v} label={form.acct_num} onChange={set} /> },
        f("mode", "select", { required: true, options: codes("modes") }),
        f("tenor_id", "select", { required: true, options: (c) => (c.deposit_tenors ?? []).map((x) => ({ value: String(x.tenor_id), label: `${x.product_name} · ${x.label}` })) }),
        f("sweep_threshold", "amount", { required: true }),
        f("minimum_savings_balance", "amount"),
        f("sweep_in_multiple", "amount"),
        f("minimum_fd_amount", "amount"),
        f("max_linked_deposits", "int", { hint: L("0 means no limit.") }),
        f("reverse_sweep_priority", "select", { options: codes("reverse_priorities") }),
        f("partial_liquidation", "bool"),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("name"),
        f("effective_from", "date"),
      ]}
      bodyOf={toNum(["acct_id", "tenor_id", "max_linked_deposits"])}
      extraTabs={[{ key: "links", label: L("Linked deposits"), render: (r) => <SweepLinks acctId={r.acct_id ?? r.setup?.acct_id} /> }]}
    />
  );
}
