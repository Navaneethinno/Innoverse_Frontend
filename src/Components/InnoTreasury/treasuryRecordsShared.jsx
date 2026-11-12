import { useEffect, useState } from "react";
import { Section } from "@/Components/InnoCBS/Deposits/depositShared";
import { RowsTable, cell, codes, dateCell, pct, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { Status } from "@/Components/InnoCBS/OpsList";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { Button } from "@/Components/Common/Button";
import { Facts } from "@/Components/InnoCBS/Deposits/depositShared";
import { OpDialog, first } from "@/Components/InnoCBS/cbsOps";
import { usePagePermission } from "@/Hooks/usePermission";
import { notifications } from "@/Utils/Lib/notifications";
import { calls, rowsOf } from "@/Services/Epurse/onboarding.api";
import { T, choices, borrowingApi, collateralApi, counterpartyApi, guaranteeApi, placementApi, securityApi, useActive, useF } from "./treasuryShared";

export const eventApi = calls(`${T}/event`, ["list"]);

export const csv = (v) =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export const csvField = (L, key, placeholder) => ({ key, label: L(key), type: "text", from: (s) => (s[key] ?? []).join(", "), placeholder, hint: L("Comma separated.") });

// The events a contract wrote into the Treasury Schedule.
export function ContractEvents({ kind, id }) {
  const L = useL();
  const [rows, setRows] = useState(null);
  useEffect(() => {
    eventApi
      .list({ filters: { kind, ref_id: id }, page: 1, limit: 100 })
      .then((r) => setRows(rowsOf(r)))
      .catch(() => setRows([]));
  }, [kind, id]);
  return (
    <Section title={L("Schedule")}>
      <RowsTable
        rows={rows ?? []}
        empty={L("No events yet; they are written when the contract is approved.")}
        columns={[
          { key: "due_date", label: L("due_date"), render: (e) => dateCell(e.due_date) },
          { key: "event_type", label: L("event"), render: (e) => words(e.event_type) },
          { key: "direction", label: L("direction") },
          { key: "amount", label: L("amount"), numeric: true },
          { key: "actual_amount", label: L("actual_amount"), numeric: true, render: (e) => e.actual_amount || "—" },
          { key: "variance", label: L("variance"), numeric: true },
          { key: "status", label: L("status"), render: (e) => <Status code={e.status} /> },
        ]}
      />
    </Section>
  );
}

// Actions on an approved contract (close early, claim, revalue, release...).
export function ContractActions({ kind, record }) {
  const L = useL();
  const can = usePagePermission();
  const [dialog, setDialog] = useState(null);
  const [info, setInfo] = useState(null);
  const id = record.id;
  const today0 = new Date().toISOString().slice(0, 10);
  useEffect(() => {
    if (kind === "BORROWING")
      borrowingApi
        .utilisation({ id })
        .then((r) => setInfo(first(r)))
        .catch(() => {});
  }, [kind, id]);
  if (Number(record.status) !== 1) return <Section title={L("Actions")}><p className="text-xs text-muted-foreground">{L("Available once the contract is approved and active.")}</p></Section>;
  const close = () => setDialog(null);
  const buttons = {
    PLACEMENT: [{ key: "close", label: L("Close early"), right: "Authorize" }],
    GUARANTEE: [{ key: "claim", label: L("Record a claim"), right: "Authorize" }, { key: "release", label: L("Release"), right: "Authorize" }],
    COLLATERAL: [{ key: "revalue", label: L("Revalue"), right: "Edit" }, { key: "release", label: L("Release"), right: "Authorize" }],
    BORROWING: [],
  }[kind].filter((b) => can(b.right));
  return (
    <Section title={L(kind === "BORROWING" ? "Utilisation" : "Actions")}>
      {info && (
        <Facts
          className="mb-3"
          rows={[
            [L("sanctioned_limit"), info.sanctioned_limit],
            [L("total_drawn"), info.total_drawn],
            [L("utilised_amount"), info.utilised_amount],
            [L("available_limit"), info.available_limit],
            [L("expired_amount"), info.expired_amount],
            [L("utilisation_percent"), pct(info.utilisation_percent)],
            [L("revolving"), info.revolving ? "✓" : "—"],
            [L("facility_expiry_date"), info.facility_expiry_date],
          ]}
        />
      )}
      <div className="flex flex-wrap gap-2">
        {buttons.map((b) => (
          <Button key={b.key} size="sm" variant={b.key === "release" ? "danger" : "secondary"} onClick={() => setDialog(b.key)}>
            {b.label}
          </Button>
        ))}
      </div>
      {dialog === "close" && (
        <OpDialog
          title={L("Close early")}
          hint={L("Quote first. Leave the amount empty to book the quoted total.")}
          fields={[
            { key: "close_date", label: L("close_date"), type: "date", required: true },
            { key: "amount_received", label: L("amount_received"), type: "amount" },
            { key: "reference", label: L("reference"), required: true },
          ]}
          initial={{ close_date: today0 }}
          variant="danger"
          run={(x) => placementApi.close({ id, ...x })}
          onClose={() => (close(), setInfo(null))}
          onDone={close}
        >
          {(form) => (
            <div className="mb-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  placementApi
                    .close_quote({ id, date: form.close_date })
                    .then((r) => setInfo(first(r)))
                    .catch((e) => notifications.error(e.message))
                }
              >
                {L("Quote")}
              </Button>
              {info && <Facts className="mt-3" rows={Object.entries(info).filter(([k]) => k !== "code").map(([k, v]) => [L(k), String(v), k === "interest_due" && Number(v) < 0 ? "text-red-700" : undefined])} />}
            </div>
          )}
        </OpDialog>
      )}
      {dialog === "claim" && (
        <OpDialog
          title={L("Record a claim")}
          hint={L("The contingent amount falls by the claim; it goes on the schedule as a payment or receipt.")}
          fields={[
            { key: "amount", label: L("amount"), type: "amount", required: true },
            { key: "claim_date", label: L("claim_date"), type: "date", required: true },
            { key: "reference", label: L("reference"), required: true },
            { key: "remarks", label: L("remarks"), type: "textarea" },
          ]}
          initial={{ claim_date: today0 }}
          run={(x) => guaranteeApi.claim({ id, ...x })}
          onClose={close}
          onDone={(r) => {
            const d = first(r);
            if (d) notifications.success(`${L("Remaining")}: ${d.remaining} · ${words(d.status)}`);
            close();
          }}
        />
      )}
      {dialog === "revalue" && (
        <OpDialog
          title={L("Revalue")}
          hint={L("A margin call is raised when the cover falls below the margin-call level.")}
          fields={[
            { key: "market_value", label: L("market_value"), type: "amount", required: true },
            { key: "source", label: L("source"), type: "select", options: ["MANUAL", "MARKET", "VALUER"].map((v) => ({ value: v, label: words(v) })) },
          ]}
          initial={{ source: "MANUAL" }}
          run={(x) => collateralApi.revalue({ id, ...x })}
          onClose={close}
          onDone={(r) => {
            const d = first(r);
            if (d?.margin_call) notifications.error(`${L("Margin call")}: ${d.margin_call.shortfall}`);
            close();
          }}
        />
      )}
      {dialog === "release" && (
        <OpDialog title={L("Release")} variant="danger" fields={[{ key: "remarks", label: L("remarks"), type: "textarea", required: true }]} run={(x) => (kind === "GUARANTEE" ? guaranteeApi : collateralApi).release({ id, remarks: x.remarks })} onClose={close} onDone={close} />
      )}
    </Section>
  );
}

export const actionsTab = (L, kind) => ({ key: "actions", label: L(kind === "BORROWING" ? "Utilisation" : "Actions"), render: (r) => <ContractActions kind={kind} record={r} /> });

export const scheduleTab = (L, kind) => [actionsTab(L, kind), { key: "schedule", label: L("Schedule"), render: (r) => <ContractEvents kind={kind} id={r.id} /> }];

export function CollateralMargin() {
  const L = useL();
  const f = useF();
  const parties = useActive(counterpartyApi);
  const securities = useActive(securityApi);
  return (
    <RecordScreen
      api={collateralApi}
      title={L("Collateral & Margin")}
      extraTabs={[actionsTab(L, "COLLATERAL")]}
      subtitle={L("Collateral pledged or received: valuations, cover after haircut, margin calls.")}
      effectiveDated
      columns={[
        { key: "direction", label: L("direction"), render: (r) => cell(words(sv(r, "direction"))) },
        { key: "counterparty_code", label: L("counterparty"), render: (r) => cell(sv(r, "counterparty_code")) },
        { key: "market_value", label: L("market_value"), render: (r) => cell(sv(r, "market_value")) },
        { key: "required_cover", label: L("required_cover"), render: (r) => cell(sv(r, "required_cover")) },
      ]}
      fields={[
        f("direction", "select", { required: true, options: codes("directions") }),
        f("collateral_type", "select", { required: true, options: codes("collateral_types") }),
        f("counterparty_code", "select", { required: true, options: parties }),
        f("linked_to", "select", { options: (c) => choices(c.linked_to) }),
        f("security_code", "select", { options: securities, showIf: (x) => x.collateral_type === "SECURITY" }),
        f("quantity", "amount", { showIf: (x) => x.collateral_type === "SECURITY" }),
        f("currency", "select", { required: true, options: (c) => choices(c.currencies) }),
        f("market_value", "amount", { required: true }),
        f("haircut_percent", "percent"),
        f("required_cover", "amount"),
        f("margin_call_threshold_percent", "percent"),
        f("valuation_frequency", "select", { options: codes("valuation_frequencies") }),
        f("next_valuation_date", "date"),
        f("maturity_date", "date"),
        f("insurance_expiry", "date"),
        f("code", "code", { fixedOnEdit: true, hint: L("Leave empty and the server gives one.") }),
        f("name", "text"),
        f("effective_from", "date", { required: true }),
      ]}
    />
  );
}
