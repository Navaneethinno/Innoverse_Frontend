import { cell, codes, dateCell, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { choices, bankAccountApi, counterpartyApi, guaranteeApi, toNum, useActive, useF } from "../treasuryShared";
import { scheduleTab } from "@/Components/InnoTreasury/treasuryRecordsShared";

export function GuaranteesLcs() {
  const L = useL();
  const f = useF();
  const parties = useActive(counterpartyApi);
  const accounts = useActive(bankAccountApi);
  return (
    <RecordScreen
      api={guaranteeApi}
      title={L("Guarantees & LCs")}
      subtitle={L("Bank guarantees and letters of credit issued or received: commission schedule, claims and release.")}
      effectiveDated
      extraTabs={scheduleTab(L, "GUARANTEE")}
      columns={[
        { key: "guarantee_kind", label: L("guarantee_kind"), render: (r) => cell(words(sv(r, "guarantee_kind"))) },
        { key: "beneficiary", label: L("beneficiary"), render: (r) => cell(sv(r, "beneficiary")) },
        { key: "amount", label: L("amount"), render: (r) => cell(`${sv(r, "amount") ?? ""} ${sv(r, "currency") ?? ""}`) },
        { key: "expiry_date", label: L("expiry_date"), render: (r) => dateCell(sv(r, "expiry_date")) },
      ]}
      fields={[
        f("guarantee_kind", "select", { required: true, options: codes("guarantee_kinds") }),
        f("counterparty_code", "select", { required: true, options: parties }),
        f("applicant", "text", { required: true }),
        f("beneficiary", "text", { required: true }),
        f("amount", "amount", { required: true }),
        f("currency", "select", { required: true, options: (c) => choices(c.currencies) }),
        f("issue_date", "date", { required: true }),
        f("expiry_date", "date", { required: true }),
        f("claim_expiry_date", "date"),
        f("commission_percent", "percent"),
        f("commission_frequency", "select", { options: codes("commission_frequencies") }),
        f("margin_percent", "percent"),
        f("collateral_code", "text"),
        f("settlement_account", "select", { options: accounts }),
        f("renewal_notice_days", "int"),
        f("purpose", "textarea"),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("name", "text"),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["renewal_notice_days"])}
    />
  );
}
