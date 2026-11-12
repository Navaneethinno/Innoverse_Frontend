import { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { cell, dateCell, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status } from "@/Components/InnoCBS/OpsList";
import { choices, useTreasuryOptions, bankAccountApi, counterpartyApi, today, useActive } from "../treasuryShared";
import { approveReject, forexApi, rowsOrOne } from "@/Components/InnoTreasury/treasuryOpsShared";

// ---------- Forex ----------

export function ForexDeals() {
  const L = useL();
  const topt = useTreasuryOptions();
  const [nearLegs, setNearLegs] = useState([]);
  useEffect(() => {
    forexApi
      .list({ page: 1, limit: 100, filters: { deal_type: "SWAP_NEAR" } })
      .then((r) => setNearLegs(rowsOrOne(r).filter((d) => !d.linked_deal_id && !["REJECTED", "CANCELLED"].includes(d.status)).map((d) => ({ value: String(d.id), label: `${d.deal_number} · ${d.counterparty_code} · ${d.buy_amount} ${d.buy_currency} / ${d.sell_currency} · ${d.value_date}` }))))
      .catch(() => {});
  }, []);
  const parties = useActive(counterpartyApi);
  const accounts = useActive(bankAccountApi);
  return (
    <OpsList
      api={forexApi}
      select={rowsOrOne}
      title="forexDeals"
      sub="Forex deals; on approval the settlement goes on the Treasury Schedule for the value date."
      columns={[
        { key: "deal_number", label: L("deal"), render: (r) => <span className="font-mono text-xs font-bold">{r.deal_number}</span> },
        { key: "deal_type", label: L("deal_type"), render: (r) => cell(words(r.deal_type)) },
        { key: "counterparty_code", label: L("counterparty"), render: (r) => cell(r.counterparty_code) },
        { key: "buy", label: L("Buy"), sortable: false, render: (r) => cell(`${r.buy_amount} ${r.buy_currency}`) },
        { key: "sell", label: L("Sell"), sortable: false, render: (r) => cell(`${r.sell_amount} ${r.sell_currency}`) },
        { key: "deal_rate", label: L("deal_rate"), render: (r) => cell(Number(r.deal_rate).toString()) },
        { key: "value_date", label: L("value_date"), render: (r) => dateCell(r.value_date) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[
        {
          key: "add",
          label: L("New deal"),
          icon: ArrowLeftRight,
          right: "Add",
          dialog: {
            title: L("New deal"),
            hint: L("A checker approves it."),
            fields: [
              { key: "deal_type", label: L("deal_type"), type: "select", required: true, options: choices(topt.deal_types) },
              { key: "linked_deal_id", label: L("Near leg"), type: "select", required: true, options: nearLegs, hint: L("The far leg reverses the near leg's currencies, with a later value date."), showIf: (x) => x.deal_type === "SWAP_FAR" },
              { key: "counterparty_code", label: L("counterparty"), type: "select", required: true, options: parties },
              { key: "buy_currency", label: L("buy_currency"), type: "select", required: true, options: choices(topt.currencies) },
              { key: "buy_amount", label: L("buy_amount"), type: "amount", required: true },
              { key: "sell_currency", label: L("sell_currency"), type: "select", required: true, options: choices(topt.currencies) },
              { key: "deal_rate", label: L("deal_rate"), type: "rate", required: true },
              { key: "value_date", label: L("value_date"), type: "date", required: true },
              { key: "buy_account", label: L("buy_account"), type: "select", required: true, options: (_c, x) => accounts.filter((a) => !x.buy_currency || a.row.currency === x.buy_currency) },
              { key: "sell_account", label: L("sell_account"), type: "select", required: true, options: (_c, x) => accounts.filter((a) => !x.sell_currency || a.row.currency === x.sell_currency) },
            ],
            initial: { deal_type: "SPOT", value_date: today() },
            run: (x) => forexApi.add({ ...x, ...(x.deal_type === "SWAP_FAR" ? { linked_deal_id: Number(x.linked_deal_id) } : { linked_deal_id: undefined }) }),
          },
        },
      ]}
      rowActions={approveReject(L, forexApi)}
    />
  );
}
