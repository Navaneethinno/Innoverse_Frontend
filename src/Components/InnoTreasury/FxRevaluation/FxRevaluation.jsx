import { useState } from "react";
import { Play, Search } from "lucide-react";
import { Facts, Section } from "@/Components/InnoCBS/Deposits/depositShared";
import { RowsTable, cell, first, useL, words } from "@/Components/InnoCBS/cbsOps";
import { OpsList, itemsOf } from "@/Components/InnoCBS/OpsList";
import { today } from "../treasuryShared";
import { fxApi, listOf, n, warnCell } from "@/Components/InnoTreasury/treasuryOpsShared";

export function FxRevaluation() {
  const L = useL();
  const [preview, setPreview] = useState(null);
  return (
    <OpsList
      api={listOf(fxApi.position)}
      select={itemsOf}
      title="fxRevaluation"
      sub="The open position in each currency, and the revaluation at today's rates."
      rowKey={(r) => r.currency}
      above={() =>
        preview && (
          <Section title={L("Revaluation preview")} className="mb-3">
            <Facts rows={Object.entries(preview).filter(([, v]) => typeof v !== "object").map(([k, v]) => [L(k), String(v)])} />
            <RowsTable
              rows={preview.lines}
              columns={[
                { key: "source", label: L("source"), render: (x) => words(x.source) },
                { key: "code", label: L("code") },
                { key: "currency", label: L("currency") },
                { key: "amount", label: L("amount"), numeric: true },
                { key: "rate", label: L("rate"), render: (x) => (x.rate_missing ? <b className="text-red-700">{L("Missing")}</b> : `${Number(x.previous_rate)} → ${Number(x.rate)}`) },
                { key: "base_value", label: L("base_value"), numeric: true },
                { key: "gain_loss", label: L("gain_loss"), render: (x) => warnCell(x.gain_loss, Number(x.gain_loss) < 0) },
              ]}
            />
          </Section>
        )
      }
      columns={[
        { key: "currency", label: L("currency"), render: (r) => <b className="text-xs">{r.currency}</b> },
        { key: "assets", label: L("assets"), render: (r) => cell(r.assets) },
        { key: "liabilities", label: L("liabilities"), render: (r) => cell(r.liabilities) },
        { key: "net_position", label: L("net_position"), render: (r) => warnCell(r.net_position, n(r, "net_position") < 0) },
        { key: "rate", label: L("rate"), render: (r) => warnCell(r.rate_missing ? L("Missing") : Number(r.rate).toString(), r.rate_missing) },
        { key: "base_value", label: L("base_value"), render: (r) => cell(`${r.base_value} ${r.base_currency}`) },
      ]}
      toolbar={[
        { key: "preview", label: L("Preview revaluation"), icon: Search, right: "Authorize", dialog: { title: L("Preview revaluation"), hint: L("Works it out without posting."), fields: [{ key: "date", label: L("date"), type: "date", required: true }], initial: { date: today() }, run: (x) => fxApi.revalue({ date: x.date, post: false }), after: (r) => setPreview(first(r)) } },
        { key: "post", label: L("Revalue and post"), icon: Play, right: "Authorize", dialog: { title: L("Revalue and post"), hint: L("Posts the revaluation gain or loss to the GL."), fields: [{ key: "date", label: L("date"), type: "date", required: true }], initial: { date: today() }, run: (x) => fxApi.revalue({ date: x.date, post: true }), after: () => setPreview(null) } },
      ]}
    />
  );
}
