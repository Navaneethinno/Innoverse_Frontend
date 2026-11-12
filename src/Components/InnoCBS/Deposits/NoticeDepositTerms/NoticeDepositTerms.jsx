import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { byId, cell, sv, useL } from "@/Components/InnoCBS/cbsOps";
import { noticeTermsApi, toNum, useF } from "@/Components/InnoCBS/Deposits/depositSettingsShared";

export function NoticeDepositTerms() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={noticeTermsApi}
      title={L("noticeDepositTerms")}
      subtitle={L("Notice period, withdrawal window and early withdrawal charge of a savings product.")}
      columns={[{ key: "notice", label: L("Notice days"), sortable: false, render: (r) => cell(`${sv(r, "minimum_notice_days") ?? "—"}–${sv(r, "maximum_notice_days") ?? "—"}`) }]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "AP_NOTICE7" }),
        f("name", "text", { required: true }),
        f("acct_product_id", "select", { required: true, label: L("Savings product"), options: byId("account_products") }),
        f("minimum_notice_days", "int", { required: true }),
        f("maximum_notice_days", "int"),
        f("withdrawal_window_days", "int"),
        f("early_withdrawal_allowed", "bool"),
        f("early_withdrawal_charge_percent", "percent", { showIf: (x) => x.early_withdrawal_allowed }),
        f("notice_cancellation_allowed", "bool"),
        f("partial_withdrawal_allowed", "bool"),
        f("effective_from", "date"),
      ]}
      bodyOf={toNum(["acct_product_id", "minimum_notice_days", "maximum_notice_days", "withdrawal_window_days"])}
    />
  );
}
