import { CheckCheck, Plus } from "lucide-react";
import { cell, dateCell, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList, Status } from "@/Components/InnoCBS/OpsList";
import { choices, glChoices, useTreasuryOptions, bankAccountApi, today, useActive } from "../treasuryShared";
import { entryApi } from "@/Components/InnoTreasury/treasuryOpsShared";

// ---------- Interbank ----------

export function InterbankTransactions() {
  const L = useL();
  const topt = useTreasuryOptions();
  const accounts = useActive(bankAccountApi, { value: (r) => r.id ?? r.record_id });
  return (
    <OpsList
      api={entryApi}
      title="interbankTransactions"
      sub="The book of each interbank account: charges, interest, inward and outward amounts."
      columns={[
        { key: "entry_date", label: L("entry_date"), render: (r) => dateCell(r.entry_date) },
        { key: "account_code", label: L("account"), render: (r) => cell(r.account_code) },
        { key: "entry_type", label: L("entry_type"), render: (r) => cell(words(r.entry_type)) },
        { key: "amount", label: L("amount"), render: (r) => cell(r.amount) },
        { key: "narration", label: L("narration"), align: "left", render: (r) => cell(r.narration) },
        { key: "reference", label: L("reference"), render: (r) => cell(r.reference) },
        { key: "source", label: L("source"), render: (r) => cell(words(r.source)) },
        { key: "match_status", label: L("match_status"), render: (r) => <Status code={r.match_status} /> },
      ]}
      toolbar={[
        { key: "close", label: L("Close the day"), icon: CheckCheck, right: "Authorize", dialog: { title: L("Close the day"), hint: L("Records each account's opening and closing. The daily job does this too."), fields: [{ key: "date", label: L("date"), type: "date", required: true }], initial: { date: today() }, run: (x) => bankAccountApi.close_day(x) } },
        {
          key: "add",
          label: L("Book an entry"),
          icon: Plus,
          right: "Add",
          dialog: {
            title: L("Book an entry"),
            fields: [
              { key: "account_id", label: L("account"), type: "select", required: true, options: accounts },
              { key: "entry_type", label: L("entry_type"), type: "select", required: true, options: choices(topt.entry_types) },
              { key: "direction", label: L("direction"), type: "select", options: choices(topt.adjustment_directions ?? ["IN", "OUT"]), showIf: (x) => x.entry_type === "ADJUSTMENT" },
              { key: "contra_gl_id", label: L("Contra GL"), type: "select", options: glChoices(topt.gl_accounts), showIf: (x) => (topt.entry_types_needing_gl ?? ["INWARD", "OUTWARD", "ADJUSTMENT"]).includes(x.entry_type) },
              { key: "amount", label: L("amount"), type: "amount", required: true },
              { key: "entry_date", label: L("entry_date"), type: "date", required: true },
              { key: "statement_line_id", label: L("Statement line ID"), type: "int", hint: L("Matches it to a statement line.") },
              { key: "narration", label: L("narration"), wide: true, required: true },
            ],
            initial: { entry_date: today() },
            run: (x) => entryApi.add({ ...Object.fromEntries(Object.entries(x).filter(([, v]) => v !== "")), account_id: Number(x.account_id), ...(x.contra_gl_id ? { contra_gl_id: Number(x.contra_gl_id) } : {}), ...(x.statement_line_id ? { statement_line_id: Number(x.statement_line_id) } : {}) }),
          },
        },
      ]}
    />
  );
}
