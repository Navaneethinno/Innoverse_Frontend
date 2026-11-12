import { useEffect, useState } from "react";
import { Section } from "@/Components/InnoCBS/Deposits/depositShared";
import { RowsTable, first, pct, useL, words } from "@/Components/InnoCBS/cbsOps";
import { Status } from "@/Components/InnoCBS/OpsList";
import { notifications } from "@/Utils/Lib/notifications";
import { exposureApi, pageHead, utilTone } from "@/Components/InnoTreasury/treasuryOpsShared";

export function ExposureMonitor() {
  const L = useL();
  const [d, setD] = useState(null);
  useEffect(() => {
    exposureApi
      .monitor({})
      .then((r) => setD(first(r)))
      .catch((e) => notifications.error(e.message));
  }, []);
  return (
    <div className="pt-1 pb-6">
      {pageHead(L, "exposureMonitor", "Exposure to each counterparty against its limit, and concentration by group, country, currency, industry and instrument.")}
      {d && (
        <>
          <p className="mb-2 text-xs text-muted-foreground">{`${L("as_of")} ${d.as_of} · ${d.base_currency}`}</p>
          <Section title={L("Counterparties")} className="mb-4">
            <RowsTable
              rows={d.counterparties}
              columns={[
                { key: "name", label: L("counterparty"), render: (c) => <span><b>{c.name}</b> <span className="text-[10px] text-muted-foreground">{c.counterparty_code} · {c.rating} · {words(c.list_status)}</span></span> },
                { key: "placements", label: L("placements"), numeric: true },
                { key: "interbank_balances", label: L("interbank_balances"), numeric: true },
                { key: "securities", label: L("securities"), numeric: true },
                { key: "guarantees_received", label: L("guarantees_received"), numeric: true },
                { key: "current_exposure", label: L("current_exposure"), numeric: true },
                { key: "exposure_limit", label: L("exposure_limit"), numeric: true },
                { key: "utilisation_percent", label: L("utilisation"), render: (c) => <span className={utilTone(c.status)}>{pct(c.utilisation_percent)}</span> },
                { key: "status", label: L("status"), render: (c) => <Status code={c.status} /> },
              ]}
            />
          </Section>
          <Section title={L("Concentration")}>
            <RowsTable
              rows={d.concentrations}
              columns={[
                { key: "limit_kind", label: L("limit_kind"), render: (c) => `${words(c.limit_kind)} · ${c.limit_key}` },
                { key: "exposure", label: L("exposure"), numeric: true },
                { key: "limit_amount", label: L("limit_amount"), numeric: true },
                { key: "utilisation_percent", label: L("utilisation"), render: (c) => <span className={utilTone(c.status)}>{pct(c.utilisation_percent)}</span> },
                { key: "status", label: L("status"), render: (c) => <Status code={c.status} /> },
              ]}
            />
          </Section>
        </>
      )}
    </div>
  );
}
