import { cell, codes, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { choices, glChoices, fixedAssetApi, toNum, useF } from "../treasuryShared";

export function AssetRegister() {
  const L = useL();
  const f = useF();
  return (
    <RecordScreen
      api={fixedAssetApi}
      title={L("assetRegister")}
      subtitle={L("Fixed assets: acquisition, depreciation method, insurance, maintenance and lease.")}
      effectiveDated
      columns={[
        { key: "category", label: L("category"), render: (r) => cell(words(sv(r, "category"))) },
        { key: "cost", label: L("cost"), render: (r) => cell(sv(r, "cost")) },
        { key: "book_value", label: L("book_value"), sortable: false, render: (r) => cell(r.book_value ?? r.net_book_value) },
        { key: "location", label: L("location"), render: (r) => cell(sv(r, "location")) },
      ]}
      fields={[
        f("name", "text", { required: true }),
        f("category", "select", { required: true, options: codes("categories") }),
        f("ownership", "select", { required: true, options: codes("ownership") }),
        f("acquisition_date", "date", { required: true }),
        f("cost", "amount", { required: true }),
        f("currency", "select", { required: true, options: (c) => choices(c.currencies) }),
        f("salvage_value", "amount"),
        f("depreciation_method", "select", { required: true, options: codes("depreciation_methods") }),
        f("useful_life_months", "int"),
        f("wdv_rate_percent", "percent", { showIf: (x) => String(x.depreciation_method).includes("WDV") || String(x.depreciation_method).includes("DECLINING") }),
        f("lease_end_date", "date", { showIf: (x) => x.ownership === "LEASED" }),
        f("location", "text"),
        f("branch_id", "int", { label: L("Branch ID") }),
        f("serial_number", "text"),
        f("supplier", "text"),
        f("insurance_policy", "text"),
        f("insurance_expiry", "date"),
        f("maintenance_interval_months", "int"),
        f("maintenance_due", "date"),
        f("asset_gl_id", "select", { label: L("Asset GL"), options: (c) => glChoices(c.gl_accounts) }),
        f("paid_from_gl_id", "select", { label: L("Paid from GL"), options: (c) => glChoices(c.gl_accounts) }),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("effective_from", "date", { required: true }),
      ]}
      bodyOf={toNum(["useful_life_months", "branch_id", "maintenance_interval_months", "asset_gl_id", "paid_from_gl_id"])}
    />
  );
}
