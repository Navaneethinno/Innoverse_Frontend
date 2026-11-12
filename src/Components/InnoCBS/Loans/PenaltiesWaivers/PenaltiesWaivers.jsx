import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calculator, HandCoins, Play } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { NoAccess } from "@/Components/Common/NoAccess";
import { RowActions } from "@/Components/Common/RowActions";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { Facts, Section, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { OpDialog, RowsTable, cell, dateCell, first, useL, words } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { notifications } from "@/Utils/Lib/notifications";
import { FacilityPick, Status, act, header, penaltyApi, waiverApi } from "@/Components/InnoCBS/Loans/loanScreensShared";

// ---------- Penalties & waivers ----------

export function PenaltiesWaivers() {
  const L = useL();
  const { t } = useTranslation("common");
  const can = usePagePermission();
  const [tab, setTab] = useState("dpd");
  const [dpd, setDpd] = useState(null);
  const [facility, setFacility] = useState("");
  const [quote, setQuote] = useState(null);
  const [adding, setAdding] = useState(false);
  const penalties = useServerList({ api: penaltyApi.listPath, call: penaltyApi.list, enabled: tab === "penalties" });
  const waivers = useServerList({ api: waiverApi.listPath, call: waiverApi.list, prefix: "w_", enabled: tab === "waivers" });
  useEffect(() => {
    penaltyApi
      .dpd({})
      .then((r) => setDpd(first(r)?.items ?? []))
      .catch(() => setDpd([]));
  }, []);
  if (!can("View")) return <NoAccess />;
  const getQuote = () =>
    penaltyApi
      .quote({ facility_id: Number(facility) })
      .then((r) => setQuote(first(r)))
      .catch((e) => notifications.error(e.message));
  return (
    <div className="pt-1 pb-6">
      {header(L, "Penalties & Waivers", "Penalties due by the servicing rule, charging them, the DPD picture, and penalty waivers.")}
      <SegmentedSwitch className="mb-3" value={tab} onChange={setTab} options={[{ value: "dpd", label: L("DPD and quote") }, { value: "penalties", label: L("Penalties charged") }, { value: "waivers", label: L("Waivers") }]} />
      {tab === "dpd" && (
        <>
          <Section title={L("Days past due")} className="mb-4">
            <RowsTable rows={dpd ?? []} columns={[{ key: "bucket", label: L("bucket") }, { key: "loans", label: L("loans"), numeric: true }, { key: "principal_outstanding", label: L("principal_outstanding"), numeric: true }]} />
          </Section>
          <Section title={L("Penalties due on a facility")}>
            <div className="flex flex-wrap items-end gap-2">
              <div className={`${labelClass} min-w-64`}>
                {L("Facility")}
                <FacilityPick value={facility} onChange={(v) => (setFacility(v), setQuote(null))} />
              </div>
              <Button size="sm" variant="secondary" icon={Calculator} disabled={!facility} disabledReason={L("Pick a facility.")} onClick={getQuote}>
                {L("Quote")}
              </Button>
              {can("Authorize") && (
                <Button size="sm" icon={Play} disabled={!facility} disabledReason={L("Pick a facility.")} onClick={() => act(penaltyApi.run, { facility_id: Number(facility) }, getQuote)}>
                  {L("Charge now")}
                </Button>
              )}
            </div>
            {quote && (
              <div className="mt-3">
                <Facts className="mb-3" rows={[[L("as_of"), quote.as_of], [L("rule_code"), quote.rule_code], [L("grace"), `${quote.grace_period_days} · ${words(quote.grace_period_kind)}`], [L("total"), quote.total]]} />
                <RowsTable rows={quote.lines} empty={L("No penalties are due.")} columns={Object.keys(quote.lines?.[0] ?? { line: 1 }).map((k) => ({ key: k, label: L(k) }))} />
              </div>
            )}
          </Section>
        </>
      )}
      {tab === "penalties" && (
        <ListTable
          list={penalties}
          rowKey={(r) => r.id}
          title={L("Penalties charged")}
          emptyTitle={L("No penalties charged")}
          columns={[
            { key: "facility_number", label: L("Facility"), render: (r) => cell(r.facility_number ?? r.facility_id) },
            { key: "borrower", label: L("borrower"), render: (r) => cell(r.borrower) },
            { key: "installment_number", label: "#", render: (r) => cell(r.installment_number) },
            { key: "method", label: L("method"), render: (r) => cell(`${words(r.method)} · ${words(r.base)}`) },
            { key: "period", label: L("period"), sortable: false, render: (r) => cell(`${r.period_from} → ${r.period_to} (${r.days})`) },
            { key: "amount", label: L("amount"), render: (r) => cell(r.amount) },
            { key: "outstanding", label: L("outstanding"), render: (r) => cell(r.outstanding) },
            { key: "created_time", label: L("when"), render: (r) => dateCell(r.created_time) },
            { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
            { key: "_a", label: "", sortable: false, render: (r) => r.actions?.waive && <Button size="sm" variant="ghost" icon={HandCoins} onClick={() => setAdding({ facility_id: String(r.facility_id), schedule_id: r.schedule_id, amount: r.outstanding })}>{L("Waive")}</Button> },
          ]}
        />
      )}
      {tab === "waivers" && (
        <ListTable
          list={waivers}
          rowKey={(r) => r.id}
          title={L("Waivers")}
          emptyTitle={L("No waivers yet")}
          actions={
            can("Add") && (
              <Button size="sm" icon={HandCoins} onClick={() => setAdding(true)}>
                {L("Request a waiver")}
              </Button>
            )
          }
          columns={[
            { key: "facility_number", label: L("Facility"), render: (r) => cell(r.facility_number ?? r.facility_id) },
            { key: "borrower", label: L("borrower"), render: (r) => cell(r.borrower) },
            { key: "installment_number", label: "#", render: (r) => cell(r.installment_number) },
            { key: "original_amount", label: L("original_amount"), render: (r) => cell(r.original_amount) },
            { key: "waived_amount", label: L("waived_amount"), render: (r) => cell(r.waived_amount) },
            { key: "reason", label: L("reason"), render: (r) => cell(r.reason) },
            { key: "maker", label: L("maker"), render: (r) => cell(r.maker) },
            { key: "checker", label: L("checker"), render: (r) => cell(r.checker) },
            { key: "audit_reference", label: L("reference"), render: (r) => cell(r.audit_reference) },
            { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
            {
              key: "actions",
              label: t("actions"),
              sortable: false,
              render: (r) => {
                return <RowActions buttons={{ authorize: Boolean(r.actions?.approve), deauthorize: Boolean(r.actions?.reject) }} onAuthorize={() => act(waiverApi.auth, { id: r.id }, waivers.reload)} onDeauthorize={() => act(waiverApi.deauth, { id: r.id }, waivers.reload)} />;
              },
            },
          ]}
        />
      )}
      {adding && (
        <OpDialog
          title={L("Request a waiver")}
          hint={L("A checker approves the waiver.")}
          fields={[
            { key: "amount", label: L("amount"), type: "amount", required: true },
            { key: "reason", label: L("reason"), type: "textarea", required: true },
          ]}
          needs={(x) => Boolean(x.facility_id)}
          initial={typeof adding === "object" ? adding : {}}
          run={(x) => waiverApi.add({ facility_id: Number(x.facility_id), amount: x.amount, reason: x.reason, ...(x.schedule_id ? { schedule_id: x.schedule_id } : {}) })}
          onClose={() => setAdding(false)}
          onDone={() => (setAdding(false), waivers.reload())}
        >
          {(form, setForm) => (
            <div className={`${labelClass} mb-3`}>
              {L("Facility")}
              <FacilityPick value={form.facility_id} onChange={(v) => setForm((x) => ({ ...x, facility_id: v }))} />
            </div>
          )}
        </OpDialog>
      )}
    </div>
  );
}
