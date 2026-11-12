import { cell, codes, dateCell, pct, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { choices, glChoices, bankAccountApi, counterpartyApi, placementApi, toNum, useActive, useF } from "../treasuryShared";
import { scheduleTab } from "@/Components/InnoTreasury/treasuryRecordsShared";

// ---------- Contracts ----------

export function FdMoneyMarket() {
  const L = useL();
  const f = useF();
  const parties = useActive(counterpartyApi);
  const accounts = useActive(bankAccountApi);
  return (
    <RecordScreen
      api={placementApi}
      title={L("FD & Money Market")}
      subtitle={L("Fixed deposits and money market placements. On approval the schedule is written; settle its events in the Treasury Schedule.")}
      effectiveDated
      extraTabs={scheduleTab(L, "PLACEMENT")}
      columns={[
        { key: "counterparty_code", label: L("counterparty"), render: (r) => cell(sv(r, "counterparty_code")) },
        { key: "instrument", label: L("instrument"), render: (r) => cell(words(sv(r, "instrument"))) },
        { key: "amount", label: L("amount"), render: (r) => cell(`${sv(r, "amount") ?? ""} ${sv(r, "currency") ?? ""}`) },
        { key: "interest_rate", label: L("interest_rate"), render: (r) => cell(pct(sv(r, "interest_rate"))) },
        { key: "maturity_date", label: L("maturity_date"), render: (r) => dateCell(sv(r, "maturity_date")) },
      ]}
      fields={[
        f("counterparty_code", "select", { required: true, options: parties }),
        f("instrument", "select", { required: true, options: codes("instruments") }),
        f("amount", "amount", { required: true }),
        f("currency", "select", { required: true, options: (c) => choices(c.currencies) }),
        f("booking_date", "date", { required: true }),
        f("value_date", "date", { required: true }),
        f("maturity_date", "date", { required: true }),
        f("rate_type", "select", { options: codes("rate_types") }),
        f("interest_rate", "rate", { required: true }),
        f("benchmark", "text", { showIf: (x) => x.rate_type === "FLOATING" }),
        f("spread", "rate", { showIf: (x) => x.rate_type === "FLOATING" }),
        f("reset_frequency", "select", { options: codes("reset_frequencies"), showIf: (x) => x.rate_type === "FLOATING" }),
        f("interest_calculation", "select", { options: codes("interest_calculations") }),
        f("day_count", "select", { options: codes("day_counts") }),
        f("interest_payment_frequency", "select", { options: codes("payment_frequencies") }),
        f("maturity_instruction", "select", { options: codes("maturity_instructions") }),
        f("settlement_account", "select", { required: true, options: accounts }),
        f("premature_closure_allowed", "bool"),
        f("premature_penalty_percent", "percent", { showIf: (x) => x.premature_closure_allowed }),
        f("external_reference", "text"),
        f("board_reference", "text", { hint: L("Needed above the policy's approval limit.") }),
        f("collateral_code", "text"),
        f("confirmation_received", "bool"),
        f("instruction_confirmed", "bool"),
        f("investment_gl_id", "select", { label: L("Investment GL"), options: (c) => glChoices(c.gl_accounts) }),
        f("interest_income_gl_id", "select", { label: L("Interest income GL"), options: (c) => glChoices(c.gl_accounts) }),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("name", "text"),
        f("effective_from", "date", { required: true }),
        f("remarks", "textarea"),
      ]}
      bodyOf={toNum(["investment_gl_id", "interest_income_gl_id"])}
    />
  );
}
