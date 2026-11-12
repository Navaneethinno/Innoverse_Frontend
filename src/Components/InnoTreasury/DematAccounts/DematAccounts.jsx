import { cell, sv, useL } from "@/Components/InnoCBS/cbsOps";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { dematApi, useF } from "../treasuryShared";

export function DematAccounts() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={dematApi}
      title={L("dematAccounts")}
      subtitle={L("Demat and custody accounts holding the securities.")}
      effectiveDated
      columns={[
        { key: "depository", label: L("depository"), render: (r) => cell(sv(r, "depository")) },
        { key: "account_number", label: L("account_number"), render: (r) => cell(sv(r, "account_number")) },
        { key: "participant", label: L("participant"), render: (r) => cell(sv(r, "participant")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "CSCS-01" }),
        f("name", "text", { required: true }),
        f("depository", "text", { required: true }),
        f("participant", "text"),
        f("account_number", "text", { required: true }),
        f("broker_code", "text"),
        f("effective_from", "date", { required: true }),
      ]}
    />
  );
}
