import { useCallback, useEffect, useRef, useState } from "react";
import { Fuel, Pause, Play, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { PageTitle } from "@/Components/Common/PageTitle";
import { useL } from "@/Components/InnoCBS/cbsOps";
import { inputClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import { useVisiblePoll } from "@/Hooks/useVisiblePoll";
import { fuelMonitor } from "@/Services/Fms/fms.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { cn } from "@/Utils/Lib/utils";
import { num } from "./fmsShared";
import { FuelPump, FuelTank } from "./FmsVisuals";

// InnoFMS › Fuel Sales (Admin_42, menu 405): the forecourts live. Stations,
// their terminals (online or not) and the latest sales, polled every 8 s
// while the tab is visible; the cursor brings only the new sales.

const KEEP = 200;
const POLL_MS = 8000;

export function FuelSales() {
  const L = useL();
  const [station, setStation] = useState("");
  const [snap, setSnap] = useState(null);
  const [sales, setSales] = useState([]);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState("");
  const cursor = useRef(null);

  const poll = useCallback(async () => {
    try {
      const r = await fuelMonitor({ ...(station ? { station_id: Number(station) } : {}), ...(cursor.current ? { cursor: cursor.current } : {}), limit: 50 });
      const d = rowsOf(r)[0] ?? r?.data ?? {};
      setSnap(d);
      setError("");
      const fresh = d.sales ?? [];
      if (cursor.current) setSales((old) => [...fresh, ...old].slice(0, KEEP));
      else setSales(fresh);
      if (d.cursor) cursor.current = d.cursor;
    } catch (e) {
      setError(e.message);
    }
  }, [station]);

  // A new station filter starts over.
  useEffect(() => {
    cursor.current = null;
    setSales([]);
    setSnap(null);
    void poll();
  }, [poll]);
  useVisiblePoll(poll, POLL_MS, !paused);

  const stations = snap?.stations ?? [];
  const most = Math.max(1, ...stations.map((s) => Number(s.litres_today) || 0));
  // A sale in the last 3 minutes: the station's pump pours.
  const pouring = (s) => s.last_sale_at && Date.now() - new Date(s.last_sale_at).getTime() < 3 * 60 * 1000;
  const terminals = snap?.terminals ?? [];
  return (
    <div className="pt-1 pb-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle icon={Fuel}>{L("Fuel Sales")}</PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">{L("The stations, their terminals and the latest sales, updated every few seconds.")}</p>
        </div>
        <div className="flex items-center gap-2">
          <select className={cn(inputClass, "w-56")} value={station} onChange={(e) => setStation(e.target.value)}>
            <option value="">{L("Every station")}</option>
            {stations.map((s) => (
              <option key={s.station_id} value={s.station_id}>
                {[s.code, s.name].filter(Boolean).join(" · ")}
              </option>
            ))}
          </select>
          <Button variant="secondary" icon={paused ? Play : Pause} onClick={() => setPaused((p) => !p)}>
            {L(paused ? "Resume" : "Pause")}
          </Button>
        </div>
      </div>
      {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
      {!snap ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      ) : (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {!stations.length && <p className="rounded-2xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground sm:col-span-2 xl:col-span-4">{L("No stations yet. A station is a merchant's store in InnoMMS.")}</p>}
            {stations.map((s) => (
              <div key={s.station_id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="flex shrink-0 flex-col items-center">
                  <FuelTank level={(Number(s.litres_today) || 0) / most} size={64} title={L("Share of today's litres")} />
                </div>
                <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-bold" title={s.name}>{s.name}</p>
                  <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", s.online ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground")}>
                    {s.online ? <Wifi size={11} /> : <WifiOff size={11} />}
                    {L(s.online ? "Online" : "Offline")}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{s.code}</p>
                <p className="mt-2 text-2xl font-black tabular-nums">
                  {num(s.litres_today)} <span className="text-xs font-semibold text-muted-foreground">{L("L today")}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {L("Terminals")}: {s.terminals ?? 0} · {L("Last sale")}: {s.last_sale_at ? accountDate(s.last_sale_at) : "—"}
                </p>
                </div>
                <FuelPump size={44} flowing={Boolean(pouring(s))} className="shrink-0 self-end" />
              </div>
            ))}
          </div>
          {terminals.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {terminals.map((x) => (
                <span key={x.tid} title={x.last_seen_at ? `${L("Last seen")}: ${accountDate(x.last_seen_at)}` : undefined} className={cn("flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold", x.online ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border bg-muted text-muted-foreground")}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", x.online ? "bg-emerald-500" : "bg-muted-foreground/50")} />
                  {x.name || x.tid}
                </span>
              ))}
            </div>
          )}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <p className="border-b border-border px-4 py-2.5 text-sm font-bold">{L("Latest sales")}</p>
            {!sales.length ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">{L("No sales yet.")}</p>
            ) : (
              <div className="max-h-[32rem] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      {["Time", "Station", "Pump", "Product", "Litres", "Unit price", "Amount", "Payment", "Plate", "RRN"].map((h) => (
                        <th key={h} className="whitespace-nowrap px-3 py-2">
                          {L(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((s) => (
                      <tr key={s.rrn ?? `${s.created_time}${s.tid}`} className={cn("fms-new border-t border-border", s.voided && "text-muted-foreground line-through")}>
                        <td className="whitespace-nowrap px-3 py-1.5">{accountDate(s.created_time)}</td>
                        <td className="px-3 py-1.5">{s.station}</td>
                        <td className="px-3 py-1.5">{s.pump_code || "—"}</td>
                        <td className="px-3 py-1.5">{s.product}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{num(s.litres)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{num(s.unit_price)}</td>
                        <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{num(s.amount)}</td>
                        <td className="px-3 py-1.5">{s.payment}</td>
                        <td className="px-3 py-1.5 font-mono">{s.plate || "—"}</td>
                        <td className="px-3 py-1.5 font-mono text-[10px]">{s.rrn}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
