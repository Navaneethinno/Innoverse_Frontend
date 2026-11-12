import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { cell, codes, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { lockerApi, toNum, useF, useGoldOptions } from "@/Components/InnoCBS/Gold/goldShared";

export function LockerManagement() {
  const L = useL();
  useGoldOptions();
  const f = useF();
  return (
    <RecordScreen
      api={lockerApi}
      title={L("lockerManagement")}
      subtitle={L("Vaults and safes holding the gold, each with two custodians and a capacity.")}
      effectiveDated
      columns={[
        { key: "locker_type", label: L("locker_type"), render: (r) => cell(words(sv(r, "locker_type"))) },
        { key: "location", label: L("location"), render: (r) => cell(sv(r, "location")) },
        { key: "capacity", label: L("capacity"), render: (r) => cell(sv(r, "capacity")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP-LKR-01" }),
        f("name", "text", { required: true }),
        f("locker_number", "text", { required: true }),
        f("locker_type", "select", { required: true, options: codes("locker_types") }),
        f("location", "text", { wide: true }),
        f("branch_id", "select", { label: L("branch"), blank: L("Head office"), options: (c) => (c.branches ?? []).map((b) => ({ value: String(b.id), label: `${b.code} · ${b.name}` })) }),
        f("capacity", "int", { required: true }),
        f("custodian1_userid", "select", { required: true, label: L("First custodian"), options: (c) => (c.custodians ?? []).map((u) => ({ value: String(u.id), label: u.user_name })) }),
        f("custodian2_userid", "select", { required: true, label: L("Second custodian"), options: (c) => (c.custodians ?? []).map((u) => ({ value: String(u.id), label: u.user_name })) }),
        f("last_inspection_date", "date"),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["branch_id", "capacity", "custodian1_userid", "custodian2_userid"])}
    />
  );
}
