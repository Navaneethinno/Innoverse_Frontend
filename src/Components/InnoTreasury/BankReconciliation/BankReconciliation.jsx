import { useState } from "react";
import { FileUp, Link2, RefreshCcw, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { Section, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field } from "@/Components/InnoCBS/Loans/loanShared";
import { OpDialog, cell, dateCell, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status, itemsOf, runCall } from "@/Components/InnoCBS/OpsList";
import { usePagePermission } from "@/Hooks/usePermission";
import { bankAccountApi, useActive } from "../treasuryShared";
import { EntryFinder, ReconStatus, listOf, n, pageHead, reconApi, statementApi, warnCell } from "@/Components/InnoTreasury/treasuryOpsShared";

export function BankReconciliation() {
  const L = useL();
  const can = usePagePermission();
  const accounts = useActive(bankAccountApi, { value: (r) => r.id ?? r.record_id });
  const [account, setAccount] = useState("");
  const [version, setVersion] = useState(0);
  const [importing, setImporting] = useState(false);
  const bump = () => setVersion((v) => v + 1);
  return (
    <div className="pt-1">
      {pageHead(L, "bankReconciliation", "Import a bank statement, reconcile automatically, then match what is left by hand.")}
      <Section title={L("account")} className="mb-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className={`${labelClass} min-w-72`}>
            {L("account")}
            <Field field={{ type: "select", blank: L("choose"), options: accounts }} value={account} onChange={setAccount} />
          </label>
          {can("Add") && (
            <Button size="sm" variant="secondary" icon={FileUp} disabled={!account} disabledReason={L("Pick an account.")} onClick={() => setImporting(true)}>
              {L("Import statement")}
            </Button>
          )}
          {can("Edit") && (
            <Button size="sm" icon={RefreshCcw} disabled={!account} disabledReason={L("Pick an account.")} onClick={() => runCall(reconApi.run, { account_id: Number(account) }, bump)}>
              {L("Reconcile now")}
            </Button>
          )}
        </div>
      </Section>
      <ReconStatus accountId={account} version={version} />
      <OpsList
        key={`${account}:${version}`}
        api={listOf(statementApi.lines)}
        select={itemsOf}
        extra={account ? { account_id: Number(account) } : null}
        title="Statement lines"
        columns={[
          { key: "txn_date", label: L("txn_date"), render: (r) => dateCell(r.txn_date) },
          { key: "account_code", label: L("account"), render: (r) => cell(r.account_code) },
          { key: "description", label: L("description"), align: "left", render: (r) => cell(r.description) },
          { key: "reference", label: L("reference"), render: (r) => cell(r.reference) },
          { key: "amount", label: L("amount"), render: (r) => warnCell(r.amount, n(r, "amount") < 0) },
          { key: "matched_how", label: L("matched_how"), render: (r) => cell(words(r.matched_how)) },
          { key: "match_status", label: L("match_status"), render: (r) => <Status code={r.match_status} /> },
        ]}
        rowActions={(r) => [
          { key: "match", label: L("Match"), icon: Link2, right: "Edit", show: (x) => x.match_status !== "MATCHED", dialog: { size: "lg", title: `${L("Match to a book entry")} · ${r.description} · ${r.amount}`, fields: [], needs: (x) => Boolean(x.entry_id), children: (form, setForm) => <EntryFinder line={r} accountId={account} value={form.entry_id} onChange={(v) => setForm((x) => ({ ...x, entry_id: v }))} />, run: (x) => reconApi.match({ line_id: r.id, entry_id: Number(x.entry_id), unmatch: false }), after: bump } },
          { key: "unmatch", label: L("Unmatch"), icon: XCircle, right: "Edit", show: (x) => x.match_status === "MATCHED", call: reconApi.match, body: { line_id: Number(r.id), entry_id: Number(r.entry_id || 0), unmatch: true } },
        ]}
      />
      {importing && (
        <OpDialog
          size="lg"
          title={L("Import statement")}
          hint={L("Paste the CSV: date, value_date, description, reference, debit, credit, balance. Reconciliation runs after the import.")}
          fields={[
            { key: "from", label: L("from"), type: "date", required: true },
            { key: "to", label: L("to"), type: "date", required: true },
            { key: "file_name", label: L("file_name") },
            { key: "csv", label: "CSV", type: "textarea", required: true },
          ]}
          children={(_form, setForm) => (
            <label className={`${labelClass} mb-3 block`}>
              {L("Or pick a CSV file")}
              <input
                type="file"
                accept=".csv,text/csv"
                className="mt-1 block text-xs"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) file.text().then((text) => setForm((x) => ({ ...x, csv: text, file_name: x.file_name || file.name })));
                }}
              />
            </label>
          )}
          run={(x) => statementApi.import({ account_id: Number(account), ...x })}
          onClose={() => setImporting(false)}
          onDone={() => (setImporting(false), bump())}
        />
      )}
    </div>
  );
}
