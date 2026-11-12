import { ArrowLeftRight, CheckCircle2, XCircle } from "lucide-react";
import { cell, dateCell, useL } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status, isPending } from "@/Components/InnoCBS/OpsList";
import { bankAccountApi, useActive } from "../treasuryShared";
import { transferApi } from "@/Components/InnoTreasury/treasuryOpsShared";

export function InterbankTransfers() {
  const L = useL();
  const accounts = useActive(bankAccountApi, { value: (r) => r.id ?? r.record_id });
  return (
    <OpsList
      api={transferApi}
      title="interbankTransfers"
      sub="Transfers between interbank accounts; a checker approves."
      columns={[
        { key: "created_time", label: L("when"), render: (r) => dateCell(r.created_time ?? r.requested_at) },
        { key: "route", label: L("From → to"), sortable: false, render: (r) => cell(`${r.from_account} → ${r.to_account}`) },
        { key: "transfer_date", label: L("transfer_date"), render: (r) => dateCell(r.transfer_date) },
        { key: "to_amount", label: L("to_amount"), render: (r) => cell(r.to_amount) },
        { key: "amount", label: L("amount"), render: (r) => cell(r.amount) },
        { key: "fx_rate", label: L("fx_rate"), render: (r) => cell(r.fx_rate) },
        { key: "reference", label: L("reference"), render: (r) => cell(r.reference) },
        { key: "purpose", label: L("purpose"), render: (r) => cell(r.purpose) },
        { key: "requested_by", label: L("requested_by"), render: (r) => cell(r.requested_by) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      toolbar={[
        {
          key: "add",
          label: L("New transfer"),
          icon: ArrowLeftRight,
          right: "Add",
          dialog: {
            title: L("New transfer"),
            hint: L("A checker approves it."),
            fields: [
              { key: "from_account_id", label: L("From account"), type: "select", required: true, options: accounts },
              { key: "to_account_id", label: L("To account"), type: "select", required: true, options: accounts },
              { key: "amount", label: L("amount"), type: "amount", required: true },
              { key: "fx_rate", label: L("fx_rate"), type: "rate", hint: L("Only when the currencies differ."), showIf: (x) => { const a = accounts.find((o) => o.value === x.from_account_id)?.row; const b = accounts.find((o) => o.value === x.to_account_id)?.row; return a && b && a.currency !== b.currency; } },
              { key: "reference", label: L("reference"), required: true },
              { key: "purpose", label: L("purpose"), required: true },
            ],
            run: (x) => transferApi.add({ ...x, from_account_id: Number(x.from_account_id), to_account_id: Number(x.to_account_id), ...(x.fx_rate ? {} : { fx_rate: undefined }) }),
          },
        },
      ]}
      rowActions={(r) => [
        { key: "auth", label: L("approve"), icon: CheckCircle2, right: "Authorize", show: isPending, call: transferApi.auth, body: { id: Number(r.id) } },
        { key: "deauth", label: L("reject"), icon: XCircle, right: "Authorize", show: isPending, dialog: { title: L("reject"), variant: "danger", fields: [{ key: "remarks", label: L("remarks"), type: "textarea", required: true }], run: (x) => transferApi.deauth({ id: Number(r.id), remarks: x.remarks }) } },
      ]}
    />
  );
}
