import { useState } from "react";
import { Ban, Calculator } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { Facts, Section, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { FacilityPick } from "@/Components/InnoCBS/Loans/loanScreensShared";
import { OpDialog, first, useL } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { notifications } from "@/Utils/Lib/notifications";
import { gl, preclosureApi, useGoldOptions } from "@/Components/InnoCBS/Gold/goldShared";

export function GoldPreclosure() {
  const L = useL();
  useGoldOptions();
  const can = usePagePermission();
  const [facility, setFacility] = useState("");
  const [q, setQ] = useState(null);
  const [settling, setSettling] = useState(false);
  const quote = () =>
    preclosureApi
      .quote({ facility_id: Number(facility) })
      .then((r) => setQ(first(r)))
      .catch((e) => notifications.error(e.message));
  return (
    <div className="pt-1 pb-6">
      <h1 className="text-2xl font-black">{L("Repayment & Pre-closure")}</h1>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">{L("Quote what closes a gold loan today, then settle it.")}</p>
      <Section title={L("Facility")} className="mb-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className={`${labelClass} min-w-72`}>
            {L("Facility")}
            <FacilityPick value={facility} onChange={(v) => (setFacility(v), setQ(null))} />
          </div>
          <Button size="sm" icon={Calculator} disabled={!facility} disabledReason={L("Pick a facility.")} onClick={quote}>
            {L("Quote")}
          </Button>
        </div>
      </Section>
      {q && (
        <Section
          title={`${L("Pre-closure quote")} · ${q.facility_number}`}
          action={
            can("Authorize") && (
              <Button size="sm" variant="danger" icon={Ban} disabled={!q.preclosure_allowed} disabledReason={L("The product does not allow pre-closure now.")} onClick={() => setSettling(true)}>
                {L("Settle")}
              </Button>
            )
          }
        >
          <Facts className="mb-3" rows={[[L("amount_to_close"), q.amount_to_close], [L("preclosure_charge"), q.preclosure_charge], [L("days_held"), q.days_held], [L("preclosure_allowed"), q.preclosure_allowed ? "✓" : "✕"]]} />
          <Facts rows={Object.entries(q.settlement ?? {}).map(([k, v]) => [L(k), typeof v === "boolean" ? (v ? "✓" : "—") : String(v)])} />
        </Section>
      )}
      {settling && (
        <OpDialog
          title={L("Settle")}
          hint={L("Closes the loan; the gold can then be released.")}
          fields={[
            { key: "source", label: L("source"), type: "select", required: true, options: gl("settle_sources", ["WALLET", "CASH", "TILL"]) },
            { key: "narration", label: L("narration"), wide: true },
          ]}
          initial={{ source: "WALLET" }}
          run={(x) => preclosureApi.settle({ facility_id: Number(facility), settle: x })}
          onClose={() => setSettling(false)}
          onDone={() => (setSettling(false), quote())}
        />
      )}
    </div>
  );
}
