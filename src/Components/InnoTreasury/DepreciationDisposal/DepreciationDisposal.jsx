import { Play, Plus } from "lucide-react";
import { cell, dateCell, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList, itemsOf } from "@/Components/InnoCBS/OpsList";
import { choices, glChoices, useTreasuryOptions, fixedAssetApi, useActive } from "../treasuryShared";
import { listOf } from "@/Components/InnoTreasury/treasuryOpsShared";

// ---------- Fixed assets ----------

export function DepreciationDisposal() {
  const L = useL();
  const topt = useTreasuryOptions();
  const assets = useActive(fixedAssetApi, { value: (r) => r.id ?? r.record_id });
  return (
    <OpsList
      api={listOf(fixedAssetApi.events)}
      select={itemsOf}
      title="Depreciation & Disposal"
      sub="Monthly depreciation, impairment, transfer, maintenance and disposal; every asset event."
      columns={[
        { key: "event_date", label: L("event_date"), render: (r) => dateCell(r.event_date) },
        { key: "asset_code", label: L("asset"), render: (r) => cell(r.asset_code) },
        { key: "event_type", label: L("event"), render: (r) => cell(words(r.event_type)) },
        { key: "amount", label: L("amount"), render: (r) => cell(r.amount) },
        { key: "book_value_after", label: L("book_value_after"), render: (r) => cell(r.book_value_after) },
        { key: "to_location", label: L("to_location"), render: (r) => cell(r.to_location) },
        { key: "remarks", label: L("remarks"), render: (r) => cell(r.remarks) },
        { key: "created_by", label: L("by"), render: (r) => cell(r.created_by) },
      ]}
      toolbar={[
        { key: "depreciate", label: L("Run depreciation"), icon: Play, right: "Authorize", dialog: { title: L("Run depreciation"), hint: L("Once a month per asset."), fields: [{ key: "month", label: L("Month end"), type: "date", required: true }], run: (x) => fixedAssetApi.depreciate(x) } },
        {
          key: "action",
          label: L("Asset action"),
          icon: Plus,
          right: "Authorize",
          dialog: {
            title: L("Asset action"),
            fields: [
              { key: "id", label: L("asset"), type: "select", required: true, options: assets },
              { key: "action", label: L("action"), type: "select", required: true, options: choices(topt.asset_actions) },
              { key: "amount", label: L("amount"), type: "amount", showIf: (x) => x.action !== "TRANSFER" },
              { key: "proceeds_gl_id", label: L("Proceeds GL"), type: "select", options: glChoices(topt.gl_accounts), showIf: (x) => x.action === "DISPOSAL" },
              { key: "to_branch_id", label: L("To branch"), type: "select", options: choices(topt.branches), showIf: (x) => x.action === "TRANSFER" },
              { key: "to_location", label: L("to_location"), showIf: (x) => x.action === "TRANSFER" },
              { key: "remarks", label: L("remarks"), type: "textarea", required: true },
            ],
            run: (x) => fixedAssetApi.action(Object.fromEntries(Object.entries(x).filter(([, v]) => v !== "").map(([k, v]) => [k, ["id", "proceeds_gl_id", "to_branch_id"].includes(k) ? Number(v) : v]))),
          },
        },
      ]}
    />
  );
}
