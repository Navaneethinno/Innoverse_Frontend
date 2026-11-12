import { cell, codes, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { choices, glChoices, bankAccountApi, counterpartyApi, toNum, useActive, useF } from "../treasuryShared";

export function InterbankAccounts() {
  const L = useL();
  const f = useF();
  const parties = useActive(counterpartyApi);
  return (
    <RecordScreen
      api={bankAccountApi}
      title={L("interbankAccounts")}
      subtitle={L("Accounts held with other banks. Balances are kept from bookings, statements and transfers.")}
      effectiveDated
      columns={[
        { key: "counterparty_code", label: L("bank"), render: (r) => cell(sv(r, "counterparty_code")) },
        { key: "account_number", label: L("account_number"), render: (r) => cell(`${sv(r, "account_number") ?? ""} · ${sv(r, "currency") ?? ""}`) },
        { key: "account_type", label: L("account_type"), render: (r) => cell(words(sv(r, "account_type"))) },
        { key: "balance", label: L("balance"), sortable: false, render: (r) => cell(r.balance ?? r.book_balance) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "ZEN-USD" }),
        f("name", "text", { required: true }),
        f("counterparty_code", "select", { required: true, options: parties }),
        f("account_number", "text", { required: true }),
        f("currency", "select", { required: true, options: (c) => choices(c.currencies) }),
        f("account_type", "select", { required: true, options: codes("account_types") }),
        f("account_purpose", "select", { options: codes("account_purposes") }),
        f("account_status", "select", { options: codes("account_statuses") }),
        f("branch", "text"),
        f("gl_account_id", "select", { required: true, label: L("GL account"), options: (c) => glChoices(c.gl_accounts) }),
        f("opening_balance", "amount"),
        f("opening_date", "date"),
        f("minimum_balance", "amount"),
        f("target_balance", "amount"),
        f("overdraft_facility", "bool"),
        f("overdraft_limit", "amount", { showIf: (x) => x.overdraft_facility }),
        f("interest_applicable", "bool"),
        f("interest_rate", "rate", { showIf: (x) => x.interest_applicable }),
        f("interest_scheme", "text", { showIf: (x) => x.interest_applicable }),
        f("reconciliation_frequency", "select", { options: codes("reconciliation_frequencies") }),
        f("match_tolerance_days", "int"),
        f("reserve_eligible", "bool"),
        f("reserve_types", "multi", { options: codes("reserve_types"), showIf: (x) => x.reserve_eligible }),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["gl_account_id", "match_tolerance_days"])}
    />
  );
}
