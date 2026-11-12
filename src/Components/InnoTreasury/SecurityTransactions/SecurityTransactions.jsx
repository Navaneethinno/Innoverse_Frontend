import { Plus } from "lucide-react";
import { cell, dateCell, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status } from "@/Components/InnoCBS/OpsList";
import { choices, useTreasuryOptions, bankAccountApi, dematApi, securityApi, useActive } from "../treasuryShared";
import { TRADE_TYPES, approveReject, n, tradeApi, warnCell } from "@/Components/InnoTreasury/treasuryOpsShared";

export function SecurityTransactions() {
  const L = useL();
  const topt = useTreasuryOptions();
  const securities = useActive(securityApi);
  const demats = useActive(dematApi);
  const accounts = useActive(bankAccountApi);
  const is = (...t) => (x) => t.includes(x.txn_type);
  return (
    <OpsList
      api={tradeApi}
      title="securityTransactions"
      sub="Trades and corporate actions; a checker approves."
      columns={[
        { key: "trade_date", label: L("trade_date"), render: (r) => dateCell(r.trade_date) },
        { key: "txn_type", label: L("txn_type"), render: (r) => cell(words(r.txn_type)) },
        { key: "security_code", label: L("security"), render: (r) => cell(r.security_code) },
        { key: "quantity", label: L("quantity"), render: (r) => cell(Number(r.quantity).toString()) },
        { key: "price", label: L("price"), render: (r) => cell(r.price) },
        { key: "amount", label: L("amount"), render: (r) => cell(r.amount) },
        { key: "realised_gain", label: L("realised_gain"), render: (r) => warnCell(r.realised_gain, n(r, "realised_gain") < 0) },
        { key: "reference", label: L("reference"), render: (r) => cell(r.reference) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[
        {
          key: "add",
          label: L("New transaction"),
          icon: Plus,
          right: "Add",
          dialog: {
            size: "lg",
            title: L("New transaction"),
            hint: L("A checker approves it."),
            fields: [
              { key: "txn_type", label: L("txn_type"), type: "select", required: true, options: topt.trade_types ? choices(topt.trade_types) : TRADE_TYPES.map((v) => ({ value: v, label: words(v) })) },
              { key: "security_code", label: L("security"), type: "select", required: true, options: securities },
              { key: "demat_code", label: L("demat"), type: "select", required: true, options: demats },
              { key: "quantity", label: L("quantity"), type: "amount", showIf: (x) => !is("BONUS", "SPLIT", "DIVIDEND")(x) },
              { key: "price", label: L("price"), type: "amount", showIf: is("BUY", "SELL", "RIGHTS", "BUYBACK") },
              { key: "charges", label: L("charges"), type: "amount", showIf: is("BUY", "SELL", "RIGHTS", "BUYBACK") },
              { key: "ratio_from", label: L("ratio_from"), type: "int", showIf: is("BONUS", "SPLIT") },
              { key: "ratio_to", label: L("ratio_to"), type: "int", showIf: is("BONUS", "SPLIT") },
              { key: "new_security_code", label: L("new_security_code"), type: "select", options: securities, showIf: is("MERGER", "DEMERGER") },
              { key: "ratio", label: L("ratio"), type: "amount", showIf: is("MERGER", "DEMERGER") },
              { key: "cost_percent", label: L("cost_percent"), type: "percent", showIf: is("MERGER", "DEMERGER") },
              { key: "to_demat_code", label: L("to_demat_code"), type: "select", options: demats, showIf: is("TRANSFER") },
              { key: "dividend_per_share", label: L("dividend_per_share"), type: "amount", showIf: is("DIVIDEND") },
              { key: "payment_date", label: L("payment_date"), type: "date", showIf: is("DIVIDEND") },
              { key: "settlement_account", label: L("settlement_account"), type: "select", options: accounts, showIf: is("BUY", "SELL", "RIGHTS", "BUYBACK", "DIVIDEND") },
              { key: "broker_code", label: L("broker_code"), showIf: is("BUY", "SELL") },
              { key: "reference", label: L("reference"), required: true },
            ],
            initial: { txn_type: "BUY" },
            run: (x) => tradeApi.add(Object.fromEntries(Object.entries(x).filter(([, v]) => v !== "").map(([k, v]) => [k, ["ratio_from", "ratio_to"].includes(k) ? Number(v) : v]))),
          },
        },
      ]}
      rowActions={approveReject(L, tradeApi)}
    />
  );
}
