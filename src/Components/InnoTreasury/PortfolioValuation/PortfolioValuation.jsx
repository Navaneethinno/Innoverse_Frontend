import { useState } from "react";
import { Play, Plus } from "lucide-react";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { cell, dateCell, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList, itemsOf } from "@/Components/InnoCBS/OpsList";
import { securityApi, today, useActive } from "../treasuryShared";
import { holdingApi, listOf, n, pageHead, priceApi, valuationApi, warnCell } from "@/Components/InnoTreasury/treasuryOpsShared";

export function PortfolioValuation() {
  const L = useL();
  const securities = useActive(securityApi);
  const [tab, setTab] = useState("holdings");
  const runBtn = { key: "run", label: L("Run valuation"), icon: Play, right: "Authorize", dialog: { title: L("Run valuation"), hint: L("Values every holding; price movement, stop-loss and stale price alerts are raised."), fields: [{ key: "date", label: L("date"), type: "date", required: true }], initial: { date: today() }, run: (x) => valuationApi.run(x) } };
  return (
    <div className="pt-1">
      {pageHead(L, "portfolioValuation", "Holdings, prices and valuation: cost, carrying value, market value and unrealised gain.")}
      <SegmentedSwitch className="mb-3" value={tab} onChange={setTab} options={[{ value: "holdings", label: L("Holdings") }, { value: "prices", label: L("Prices") }, { value: "history", label: L("Valuations") }]} />
      {tab === "holdings" && (
        <OpsList
          api={holdingApi}
          toolbar={[runBtn]}
          columns={[
            { key: "security_code", label: L("security"), align: "left", render: (r) => <span className="text-xs"><b>{r.name}</b><span className="block font-mono text-[10px] text-muted-foreground">{r.security_code} · {words(r.instrument_type)}</span></span> },
            { key: "classification", label: L("classification"), render: (r) => cell(r.classification) },
            { key: "demat_code", label: L("demat"), render: (r) => cell(r.demat_code) },
            { key: "quantity", label: L("quantity"), render: (r) => cell(`${Number(r.quantity)}${Number(r.pledged_quantity) ? ` (${Number(r.pledged_quantity)} ${L("pledged")})` : ""}`) },
            { key: "average_cost", label: L("average_cost"), render: (r) => cell(Number(r.average_cost).toString()) },
            { key: "total_cost", label: L("total_cost"), render: (r) => cell(r.total_cost) },
            { key: "carrying_value", label: L("carrying_value"), render: (r) => cell(r.carrying_value) },
            { key: "accrued_income", label: L("accrued_income"), render: (r) => cell(r.accrued_income) },
            { key: "review_date", label: L("review_date"), render: (r) => dateCell(r.review_date) },
          ]}
        />
      )}
      {tab === "prices" && (
        <OpsList
          api={priceApi}
          prefix="pr_"
          columns={[
            { key: "price_date", label: L("price_date"), render: (r) => dateCell(r.price_date) },
            { key: "security_code", label: L("security"), render: (r) => cell(r.security_code) },
            { key: "price", label: L("price"), render: (r) => cell(Number(r.price).toString()) },
            { key: "source", label: L("source"), render: (r) => cell(r.source) },
            { key: "entered_by", label: L("entered_by"), render: (r) => cell(r.entered_by) },
          ]}
          toolbar={[
            {
              key: "add",
              label: L("Enter a price"),
              icon: Plus,
              right: "Add",
              dialog: {
                title: L("Enter a price"),
                fields: [
                  { key: "security_code", label: L("security"), type: "select", required: true, options: securities },
                  { key: "price", label: L("price"), type: "amount", required: true },
                  { key: "price_date", label: L("price_date"), type: "date", required: true },
                  { key: "source", label: L("source"), required: true },
                ],
                initial: { price_date: today() },
                run: (x) => priceApi.add({ prices: [x] }),
              },
            },
          ]}
        />
      )}
      {tab === "history" && (
        <OpsList
          api={listOf(valuationApi.history)}
          select={itemsOf}
          prefix="vh_"
          toolbar={[runBtn]}
          columns={[
            { key: "valuation_date", label: L("valuation_date"), render: (r) => dateCell(r.valuation_date) },
            { key: "security_code", label: L("security"), render: (r) => cell(r.security_code) },
            { key: "classification", label: L("classification"), render: (r) => cell(r.classification) },
            { key: "price", label: L("price"), render: (r) => cell(`${Number(r.price)} · ${r.price_source}`) },
            { key: "total_cost", label: L("total_cost"), render: (r) => cell(r.total_cost) },
            { key: "carrying_value", label: L("carrying_value"), render: (r) => cell(r.carrying_value) },
            { key: "market_value", label: L("market_value"), render: (r) => cell(r.market_value) },
            { key: "unrealised_gain", label: L("unrealised_gain"), render: (r) => warnCell(r.unrealised_gain, n(r, "unrealised_gain") < 0) },
            { key: "posted_to_income", label: L("posted_to_income"), render: (r) => cell(r.posted_to_income) },
          ]}
        />
      )}
    </div>
  );
}
