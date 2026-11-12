import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { cell, codes, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { acctProducts, groupSchemeApi, toNum, useF } from "@/Components/InnoCBS/Deposits/depositSettingsShared";

export function GroupSavingsSchemes() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={groupSchemeApi}
      title={L("groupSavingsSchemes")}
      subtitle={L("Members, roles, contributions, late charges and the withdrawal rule of savings groups.")}
      effectiveDated
      columns={[
        { key: "members", label: L("Members"), sortable: false, render: (r) => cell(`${sv(r, "minimum_members") ?? "—"}–${sv(r, "maximum_members") ?? "—"}`) },
        { key: "contribution_amount", label: L("contribution_amount"), render: (r) => cell(`${sv(r, "contribution_amount") ?? "—"} · ${words(sv(r, "contribution_frequency"))}`) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_SHG" }),
        f("name", "text", { required: true }),
        f("acct_product_id", "select", { required: true, options: acctProducts() }),
        f("minimum_members", "int", { required: true }),
        f("maximum_members", "int", { required: true }),
        f("contribution_amount", "amount", { required: true }),
        f("contribution_frequency", "select", { required: true, options: codes("frequencies") }),
        f("member_contribution", "select", { options: codes("contribution_kinds") }),
        f("min_contribution", "amount"),
        f("grace_period_days", "int"),
        f("late_contribution_charge", "amount"),
        f("max_missed_contributions", "int"),
        f("minimum_group_balance", "amount"),
        f("group_leader", "select", { options: codes("requirements") }),
        f("group_treasurer", "select", { options: codes("requirements") }),
        f("group_secretary", "select", { options: codes("requirements") }),
        f("group_withdrawal_rule", "select", { options: codes("operation_rules") }),
        f("group_interest", "select", { options: codes("levels") }),
        f("group_penalty", "select", { options: codes("levels") }),
        f("member_addition", "select", { options: codes("restrictions") }),
        f("member_removal", "select", { options: codes("restrictions") }),
        f("member_default", "select", { options: codes("restrictions") }),
        f("group_dissolution", "select", { options: codes("restrictions") }),
        f("share_requirement", "bool"),
        f("effective_from", "date", { required: true }),
        f("description", "textarea"),
      ]}
      bodyOf={toNum(["acct_product_id", "minimum_members", "maximum_members", "grace_period_days", "max_missed_contributions"])}
    />
  );
}
