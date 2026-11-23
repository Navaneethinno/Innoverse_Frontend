import { useCallback, useEffect, useRef, useState } from "react";
import { FileBarChart } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DateInput } from "@/Components/Common/DateInput";
import { PageTitle } from "@/Components/Common/PageTitle";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { PartyPick, useL, words } from "@/Components/InnoCBS/cbsOps";
import { inputClass, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import { fuelReportApi } from "@/Services/Fms/fms.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { num } from "./fmsShared";
import { ownerOf } from "./FleetScreen";

// InnoFMS › Fuel Reports (Admin_42, menu 406): what the pumps sold. Voided
// sales are left out; days are the institution's. Any other cut, with CSV or
// Excel, is in Reports › Report Builder (source "Fuel sales").

const BY = ["vehicle", "driver", "cost_centre", "station", "zone", "product", "day"];
const REPORTS = {
  consumption: {
    columns: [
      ["name", "Name"],
      ["fills", "Fills", num],
      ["litres", "Litres", num],
      ["amount", "Amount", num],
      ["average_price", "Average price", num],
    ],
  },
  efficiency: {
    columns: [
      ["plate", "Plate"],
      ["fills", "Fills", num],
      ["first_km", "First km", num],
      ["last_km", "Last km", num],
      ["km", "Km driven", num],
      ["litres", "Litres", num],
      ["km_per_litre", "Km per litre", num],
      ["litres_per_100km", "L / 100 km", num],
    ],
  },
  odometer: {
    columns: [
      ["problem", "Problem", (v) => words(v)],
      ["plate", "Plate"],
      ["at", "When", (v) => accountDate(v)],
      ["odometer_km", "Reading", num],
      ["previous_km", "Previous", num],
      ["km_since", "Km since", num],
      ["litres", "Litres", num],
      ["rrn", "RRN"],
    ],
  },
  station_sales: {
    columns: [
      ["station", "Station"],
      ["product", "Product"],
      ["payment", "Payment"],
      ["fills", "Fills", num],
      ["litres", "Litres", num],
      ["amount", "Amount", num],
      ["average_price", "Average price", num],
    ],
  },
  prices: {
    columns: [
      ["product", "Product", (v, r) => v ?? r.product_code],
      ["station", "Station", (v, r) => (Number(r.station_id) ? (v ?? `#${r.station_id}`) : "Base price")],
      ["price", "Price", num],
      ["previous_price", "Previous", num],
      ["change", "Change", num],
      ["effective_from", "From"],
      ["effective_to", "To"],
      ["approved_by", "Approved by"],
    ],
  },
};
const month = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const today = () => new Date().toISOString().slice(0, 10);

export function FuelReports() {
  const L = useL();
  const [report, setReport] = useState("consumption");
  const [q, setQ] = useState({ from: month(), to: today(), by: "vehicle", owner: "", station_id: "", zone: "", jump_km: "" });
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  const set = (k) => (v) => setQ((x) => ({ ...x, [k]: v }));

  const run = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    try {
      const body = {
        ...(q.from ? { from: q.from } : {}),
        ...(q.to ? { to: q.to } : {}),
        ...(ownerOf(q.owner) ?? {}),
        ...(Number(q.station_id) ? { station_id: Number(q.station_id) } : {}),
        ...(q.zone.trim() ? { zone: q.zone.trim() } : {}),
        ...(report === "consumption" ? { by: q.by } : {}),
        ...(report === "odometer" && Number(q.jump_km) ? { jump_km: Number(q.jump_km) } : {}),
      };
      const r = await fuelReportApi[report](body);
      if (id === seq.current) setRows(rowsOf(r));
    } catch (e) {
      if (id === seq.current) {
        notifications.error(e.message);
        setRows([]);
      }
    } finally {
      if (id === seq.current) setLoading(false);
    }
    // q changes are applied with Show
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report]);
  useEffect(() => {
    void run();
  }, [run]);

  const columns = REPORTS[report].columns;
  const totals = ["fills", "litres", "amount"].filter((k) => columns.some(([c]) => c === k) && report !== "prices" && report !== "odometer");
  const sum = (k) => (rows ?? []).reduce((s, r) => s + (Number(r[k]) || 0), 0);

  return (
    <div className="pt-1 pb-6">
      <div className="mb-4">
        <PageTitle icon={FileBarChart}>{L("Fuel Reports")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{L("What the pumps sold; voided sales are left out. For any other cut, or CSV and Excel, use Reports › Report Builder with the Fuel sales source.")}</p>
      </div>
      <SegmentedSwitch
        className="mb-3"
        options={Object.keys(REPORTS).map((k) => ({ value: k, label: L({ consumption: "Consumption", efficiency: "Efficiency", odometer: "Odometer checks", station_sales: "Station sales", prices: "Price changes" }[k]) }))}
        value={report}
        onChange={(k) => {
          setRows(null);
          setReport(k);
        }}
      />
      <div className="mb-3 grid gap-3 rounded-2xl border border-border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={labelClass}>
          {L("From")}
          <DateInput className="mt-1" value={q.from} max={q.to || undefined} onChange={(e) => set("from")(e.target.value)} />
        </label>
        <label className={labelClass}>
          {L("To")}
          <DateInput className="mt-1" value={q.to} min={q.from || undefined} onChange={(e) => set("to")(e.target.value)} />
        </label>
        {report === "consumption" && (
          <label className={labelClass}>
            {L("By")}
            <select className={cn(inputClass, "mt-1")} value={q.by} onChange={(e) => set("by")(e.target.value)}>
              {BY.map((b) => (
                <option key={b} value={b}>
                  {L(words(b))}
                </option>
              ))}
            </select>
          </label>
        )}
        {report !== "prices" && (
          <div className={labelClass}>
            {L("Customer's fleet")}
            <PartyPick party="CUSTOMER" value={q.owner} onChange={set("owner")} />
          </div>
        )}
        <label className={labelClass}>
          {L("Station id")}
          <input className={cn(inputClass, "mt-1")} inputMode="numeric" value={q.station_id} onChange={(e) => set("station_id")(e.target.value.replace(/\D/g, ""))} placeholder={L("Every station")} />
        </label>
        {report !== "prices" && (
          <label className={labelClass}>
            {L("Zone code")}
            <input className={cn(inputClass, "mt-1")} value={q.zone} onChange={(e) => set("zone")(e.target.value.toUpperCase())} placeholder={L("Every zone")} />
          </label>
        )}
        {report === "odometer" && (
          <label className={labelClass}>
            {L("Jump above (km)")}
            <input className={cn(inputClass, "mt-1")} inputMode="numeric" value={q.jump_km} onChange={(e) => set("jump_km")(e.target.value.replace(/\D/g, ""))} placeholder="2000" />
          </label>
        )}
        <div className="flex items-end">
          <Button loading={loading} onClick={() => void run()}>
            {L("Show")}
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {!rows ? (
          <div className="h-32 animate-pulse bg-muted" />
        ) : !rows.length ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">{L("No fuel sales in this period.")}</p>
        ) : (
          <div className="max-h-[36rem] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/80 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  {columns.map(([k, h]) => (
                    <th key={k} className="whitespace-nowrap px-3 py-2">
                      {L(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    {columns.map(([k, , fmt]) => {
                      const v = fmt ? fmt(r[k], r) : r[k];
                      return (
                        <td key={k} className={cn("px-3 py-1.5", fmt === num && "text-right tabular-nums")}>
                          {v === "" || v == null ? (k === "name" ? L("None") : "—") : L(String(v))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              {totals.length > 0 && (
                <tfoot className="border-t-2 border-border bg-muted/40 font-bold">
                  <tr>
                    {columns.map(([k], i) => (
                      <td key={k} className={cn("px-3 py-2", totals.includes(k) && "text-right tabular-nums")}>
                        {i === 0 ? L("Total") : totals.includes(k) ? num(sum(k)) : ""}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
