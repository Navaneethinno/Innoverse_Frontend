import { useEffect, useState } from "react";
import { HandCoins } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { Section } from "@/Components/InnoCBS/Deposits/depositShared";
import { OpDialog, RowsTable, cell, dateCell, first, useL } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { charityApi, header } from "@/Components/InnoCBS/Loans/loanScreensShared";

// ---------- Charity fund ----------

export function CharityFund() {
  const L = useL();
  const can = usePagePermission();
  const [fund, setFund] = useState(null);
  const [remitting, setRemitting] = useState(false);
  const list = useServerList({ api: charityApi.listPath, call: charityApi.list });
  const loadFund = () =>
    charityApi
      .fund({})
      .then((r) => setFund(first(r)?.items ?? []))
      .catch(() => setFund([]));
  useEffect(() => {
    void loadFund();
  }, []);
  if (!can("View")) return <NoAccess />;
  return (
    <div className="pt-1 pb-6">
      {header(L, "charityFund", "Gharamah collected from late payers, and what has been remitted to charities. It is never income.")}
      <Section title={L("Fund balance")} className="mb-4">
        <RowsTable rows={fund ?? []} empty={L("Nothing collected yet.")} columns={Object.keys(fund?.[0] ?? { currency: 1, balance: 1 }).map((k) => ({ key: k, label: L(k) }))} />
      </Section>
      <ListTable
        list={list}
        rowKey={(r) => r.id}
        title={L("Remittances")}
        emptyTitle={L("No remittances yet")}
        actions={
          can("Authorize") && (
            <Button size="sm" icon={HandCoins} onClick={() => setRemitting(true)}>
              {L("Remit to a charity")}
            </Button>
          )
        }
        columns={[
          { key: "beneficiary", label: L("beneficiary"), render: (r) => cell(r.beneficiary) },
          { key: "amount", label: L("amount"), render: (r) => cell(`${r.amount} ${r.currency ?? r.currency_name ?? ""}`) },
          { key: "remitted_at", label: L("when"), render: (r) => dateCell(r.remitted_at ?? r.created_time ?? r.at) },
          { key: "remitted_by", label: L("by"), render: (r) => cell(r.remitted_by ?? r.actor) },
          { key: "rrn", label: "RRN", render: (r) => cell(r.rrn) },
        ]}
      />
      {remitting && (
        <OpDialog
          title={L("Remit to a charity")}
          fields={[
            { key: "currency_id", label: L("currency"), type: "select", required: true, options: (fund ?? []).filter((x) => x.currency_id).map((x) => ({ value: String(x.currency_id), label: `${x.currency} · ${L("held")} ${x.held}` })) },
            { key: "amount", label: L("amount"), type: "amount", required: true },
            { key: "beneficiary", label: L("beneficiary"), required: true, wide: true },
          ]}
          run={(x) => charityApi.remit({ currency_id: Number(x.currency_id), amount: x.amount, beneficiary: x.beneficiary })}
          onClose={() => setRemitting(false)}
          onDone={() => (setRemitting(false), list.reload(), loadFund())}
        />
      )}
    </div>
  );
}
