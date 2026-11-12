import { useEffect, useState } from "react";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { Facts, Section } from "@/Components/InnoCBS/Deposits/depositShared";
import { RowsTable, dateCell, first, pct, useL } from "@/Components/InnoCBS/cbsOps";
import { Status } from "@/Components/InnoCBS/OpsList";
import { notifications } from "@/Utils/Lib/notifications";
import { mapText } from "../treasuryShared";
import { almApi, pageHead, warnCell } from "@/Components/InnoTreasury/treasuryOpsShared";

export function AlmLiquidity() {
  const L = useL();
  const [tab, setTab] = useState("gap");
  const [mode, setMode] = useState("CONTRACTUAL");
  const [data, setData] = useState(null);
  useEffect(() => {
    setData(null);
    almApi[tab](tab === "gap" ? { mode } : {})
      .then((r) => setData(first(r)))
      .catch((e) => notifications.error(e.message));
  }, [tab, mode]);
  const d = data ?? {};
  return (
    <div className="pt-1 pb-6">
      {pageHead(L, "ALM & Liquidity", "Maturity gap, liquidity position, stress tests, funding concentration and the cash-flow forecast.")}
      <SegmentedSwitch className="mb-3" value={tab} onChange={setTab} options={[{ value: "gap", label: L("Maturity gap") }, { value: "liquidity", label: L("Liquidity") }, { value: "stress", label: L("Stress tests") }, { value: "concentration", label: L("Funding concentration") }, { value: "forecast", label: L("Forecast") }]} />
      {tab === "gap" && <SegmentedSwitch className="mb-3" value={mode} onChange={setMode} options={[{ value: "CONTRACTUAL", label: L("Contractual") }, { value: "BEHAVIOURAL", label: L("Behavioural") }]} />}
      {data && (
        <Section title={`${L(tab)}${d.as_of ? ` · ${d.as_of}` : ""}`}>
          {tab === "gap" && (
            <RowsTable
              rows={d.buckets}
              columns={[
                { key: "bucket", label: L("bucket") },
                { key: "expected_inflows", label: L("inflows"), numeric: true },
                { key: "expected_outflows", label: L("outflows"), numeric: true },
                { key: "gap", label: L("gap"), render: (b) => warnCell(b.gap, Number(b.gap) < 0) },
                { key: "cumulative_gap", label: L("cumulative_gap"), render: (b) => warnCell(b.cumulative_gap, Number(b.cumulative_gap) < 0) },
                { key: "gap_to_outflows_percent", label: L("Gap / outflows"), render: (b) => pct(b.gap_to_outflows_percent) },
                { key: "repricing_gap", label: L("repricing_gap"), numeric: true },
                { key: "sources", label: L("By source"), render: (b) => <span className="text-[10px]">{`${L("In")}: ${mapText(b.inflows_by_source)} | ${L("Out")}: ${mapText(b.outflows_by_source)}`}</span> },
              ]}
            />
          )}
          {tab === "liquidity" && <Facts rows={Object.entries(d).filter(([k]) => !["as_of"].includes(k)).map(([k, v]) => [L(k), String(v)])} />}
          {tab === "stress" && (
            <>
              <p className="mb-2 text-xs text-muted-foreground">{`${L("horizon_days")}: ${d.horizon_days}`}</p>
              <RowsTable rows={d.scenarios} columns={[{ key: "scenario", label: L("scenario") }, { key: "deposit_runoff", label: L("deposit_runoff"), numeric: true }, { key: "outflows", label: L("outflows"), numeric: true }, { key: "stressed_inflows", label: L("stressed_inflows"), numeric: true }, { key: "stressed_securities", label: L("stressed_securities"), numeric: true }, { key: "borrowing_lines", label: L("borrowing_lines"), numeric: true }, { key: "available", label: L("available"), numeric: true }, { key: "surplus", label: L("surplus"), render: (s) => warnCell(s.surplus, Number(s.surplus) < 0) }, { key: "status", label: L("status"), render: (s) => <Status code={s.status} /> }]} />
            </>
          )}
          {tab === "concentration" && (
            <>
              <Facts className="mb-3" rows={[[L("total_funding"), d.total_funding], [L("top_depositors_share_percent"), pct(d.top_depositors_share_percent)]]} />
              <div className="grid gap-4 lg:grid-cols-2">
                <RowsTable rows={d.lenders} columns={[{ key: "lender", label: L("lender") }, { key: "amount", label: L("amount"), numeric: true }, { key: "share_percent", label: L("share"), render: (x) => pct(x.share_percent) }]} />
                <RowsTable rows={d.top_depositors} columns={[{ key: "depositor", label: L("depositor") }, { key: "amount", label: L("amount"), numeric: true }, { key: "share_percent", label: L("share"), render: (x) => pct(x.share_percent) }]} />
              </div>
            </>
          )}
          {tab === "forecast" && <RowsTable rows={d.items} columns={[{ key: "date", label: L("date"), render: (x) => dateCell(x.date) }, { key: "contractual_inflows", label: L("contractual_inflows"), numeric: true }, { key: "contractual_outflows", label: L("contractual_outflows"), numeric: true }, { key: "contractual_cumulative", label: L("contractual_cumulative"), render: (x) => warnCell(x.contractual_cumulative, Number(x.contractual_cumulative) < 0) }, { key: "behavioural_inflows", label: L("behavioural_inflows"), numeric: true }, { key: "behavioural_outflows", label: L("behavioural_outflows"), numeric: true }, { key: "behavioural_cumulative", label: L("behavioural_cumulative"), render: (x) => warnCell(x.behavioural_cumulative, Number(x.behavioural_cumulative) < 0) }]} />}
        </Section>
      )}
    </div>
  );
}
