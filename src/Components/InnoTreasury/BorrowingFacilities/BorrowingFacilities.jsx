import { RowsInput, cell, codes, dateCell, pct, sv, useL } from "@/Components/InnoCBS/cbsOps";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { choices, glChoices, bankAccountApi, borrowingApi, counterpartyApi, toNum, useActive, useF } from "../treasuryShared";
import { csv, csvField, scheduleTab } from "@/Components/InnoTreasury/treasuryRecordsShared";

export function BorrowingFacilities() {
  const L = useL();
  const f = useF();
  const parties = useActive(counterpartyApi);
  const accounts = useActive(bankAccountApi);
  return (
    <RecordScreen
      api={borrowingApi}
      title={L("borrowingFacilities")}
      subtitle={L("Facilities the bank borrows on: limit, terms, security, covenants, and their utilisation.")}
      effectiveDated
      extraTabs={scheduleTab(L, "BORROWING")}
      columns={[
        { key: "lender_code", label: L("lender"), render: (r) => cell(sv(r, "lender_code")) },
        { key: "facility_limit", label: L("facility_limit"), render: (r) => cell(`${sv(r, "facility_limit") ?? ""} ${sv(r, "currency") ?? ""}`) },
        { key: "utilised", label: L("utilised"), sortable: false, render: (r) => cell(r.utilised ?? r.outstanding) },
        { key: "interest_rate", label: L("interest_rate"), render: (r) => cell(pct(sv(r, "interest_rate"))) },
        { key: "facility_expiry_date", label: L("facility_expiry_date"), render: (r) => dateCell(sv(r, "facility_expiry_date")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "BOR-DBN-01" }),
        f("name", "text", { required: true }),
        f("lender_code", "select", { required: true, options: parties }),
        f("facility_type", "select", { required: true, options: codes("facility_types") }),
        f("facility_limit", "amount", { required: true }),
        f("currency", "select", { required: true, options: (c) => choices(c.currencies) }),
        f("revolving", "bool"),
        f("sanction_date", "date", { required: true }),
        f("facility_expiry_date", "date", { required: true }),
        f("maturity_date", "date", { required: true }),
        f("rate_type", "select", { options: codes("rate_types") }),
        f("interest_rate", "rate", { required: true }),
        f("benchmark", "text", { showIf: (x) => x.rate_type === "FLOATING" }),
        f("spread", "rate", { showIf: (x) => x.rate_type === "FLOATING" }),
        f("reset_frequency", "select", { options: codes("reset_frequencies"), showIf: (x) => x.rate_type === "FLOATING" }),
        f("interest_scheme", "text"),
        f("day_count", "select", { options: codes("day_counts") }),
        f("interest_frequency", "select", { options: codes("interest_frequencies") }),
        f("repayment_type", "select", { options: codes("repayment_types") }),
        f("principal_frequency", "select", { options: codes("principal_frequencies") }),
        f("settlement_account", "select", { required: true, options: accounts }),
        f("utilisation_warn_percent", "percent"),
        f("security", "text", { wide: true }),
        csvField(L, "collateral_codes", "COL-000001"),
        f("collateral_valuation_due", "date"),
        f("insurance_expiry", "date"),
        f("lender_confirmation_frequency", "select", { options: codes("interest_frequencies") }),
        {
          key: "covenants",
          label: L("covenants"),
          type: "custom",
          render: (v, set, _x, c) => <RowsInput value={v} onChange={set} blank={() => ({ name: "", condition: "", review_frequency: "", next_review: "" })} columns={[{ key: "name", label: L("name") }, { key: "condition", label: L("condition") }, { key: "review_frequency", label: L("review_frequency"), type: "select", options: codes("interest_frequencies")(c) }, { key: "next_review", label: L("next_review"), type: "date" }]} />,
        },
        f("liability_gl_id", "select", { label: L("Liability GL"), options: (c) => glChoices(c.gl_accounts) }),
        f("interest_expense_gl_id", "select", { label: L("Interest expense GL"), options: (c) => glChoices(c.gl_accounts) }),
        f("effective_from", "date", { required: true }),
        f("remarks", "textarea"),
      ]}
      bodyOf={(x, rec) => ({ ...toNum(["liability_gl_id", "interest_expense_gl_id"])(x), collateral_codes: csv(x.collateral_codes), custom_schedule: (rec?.setup ?? {}).custom_schedule ?? [] })}
    />
  );
}
