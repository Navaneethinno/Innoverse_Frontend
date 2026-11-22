import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useL } from "@/Components/InnoCBS/cbsOps";
import { useInstitutionScope } from "@/Components/InnoCBS/Loans/loanShared";
import { fuelPriceApi, fuelProductApi } from "@/Services/Fms/fms.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { cn } from "@/Utils/Lib/utils";
import { FuelDrop, FuelPump, FuelTank } from "./FmsVisuals";
import { opts } from "./fmsShared";

// InnoFMS pictures (Admin_42): the settings guide, the product family tree,
// the price board and a vehicle's tank. Each reads what the screen already
// shows, drawn so it is understood at a glance.

// A record list's active records, with the version in force spread on top.
function useActiveRows(api) {
  const [rows, setRows] = useState(null);
  const { scope, institution } = useInstitutionScope();
  useEffect(() => {
    api
      .active(scope({}))
      .then((r) => setRows((rowsOf(r)[0]?.items ?? rowsOf(r)).map((x) => ({ ...x, ...(x.setup ?? {}) }))))
      .catch(() => setRows([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, institution]);
  return rows;
}
function useOptionsOf(api) {
  const [c, setC] = useState(null);
  const { scope, institution } = useInstitutionScope();
  useEffect(() => {
    api
      .options(scope({}))
      .then((r) => setC(rowsOf(r)[0] ?? r?.data ?? {}))
      .catch(() => setC({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, institution]);
  return c;
}

// ---------------------------------------------------------------- settings guide

// The order the InnoFMS settings are made in; the current page is lit.
const STEPS = [
  ["settings", "Fuel Settings", "How the pumps sell and what a sale needs"],
  ["products", "Fuel Products", "The grades sold, then their prices"],
  ["forecourt", "Forecourt", "Each station's pumps and nozzles"],
  ["zones", "Zones", "Group stations for reports and discounts"],
  ["discounts", "Discounts", "Money off at the pump"],
];
export function SettingsGuide({ current }) {
  const L = useL();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 rounded-2xl border border-border px-4 py-3" style={{ background: "linear-gradient(120deg, color-mix(in srgb, var(--primary) 9%, var(--card)), var(--card) 55%)" }}>
      <FuelPump size={44} className="fms-float shrink-0" />
      <ol className="flex min-w-0 flex-1 flex-wrap items-stretch gap-2">
        {STEPS.map(([key, name, hint], i) => (
          <li key={key} className={cn("flex min-w-40 flex-1 items-start gap-2 rounded-xl border px-3 py-2", key === current ? "border-[var(--primary)] bg-card shadow-sm" : "border-transparent opacity-70")}>
            <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black", key === current ? "bg-[var(--primary)] text-white" : "bg-muted text-muted-foreground")}>{i + 1}</span>
            <span className="min-w-0">
              <span className="block text-xs font-bold">{L(name)}</span>
              <span className="block text-[11px] leading-snug text-muted-foreground">{L(hint)}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------- product tree

// The grades as a family: a top-level product with its sub-products under
// it. A product with no sub-products is what is priced and sold.
export function ProductTree({ open }) {
  const L = useL();
  const rows = useActiveRows(fuelProductApi);
  if (!rows) return <div className="mb-4 h-28 animate-pulse rounded-2xl bg-muted" />;
  if (!rows.length) return null;
  const tops = rows.filter((r) => !r.parent_code).sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
  const kids = (code) => rows.filter((r) => r.parent_code === code);
  const Chip = ({ r, sold }) => (
    <button type="button" onClick={() => open(r.id)} className={cn("flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow", sold ? "border-emerald-200" : "border-border")}>
      <FuelDrop colour={r.colour} size={14} />
      <span className="min-w-0">
        <span className="block truncate text-xs font-bold">{r.name}</span>
        <span className="block font-mono text-[10px] text-muted-foreground">{r.code}</span>
      </span>
      {sold && <span className="ml-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">{L("Sold")}</span>}
    </button>
  );
  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 text-sm font-bold">{L("The grades")}</p>
      <div className="flex flex-wrap gap-4">
        {tops.map((top, i) => {
          const children = kids(top.code);
          return (
            <motion.div key={top.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-2xl bg-muted/40 p-3">
              <Chip r={top} sold={!children.length} />
              {children.length > 0 && (
                <div className="ml-4 mt-2 border-l-2 border-dashed border-border pl-4">
                  {children.map((c) => (
                    <div key={c.id} className="relative mt-2 first:mt-0">
                      <span className="absolute -left-4 top-1/2 w-3 border-t-2 border-dashed border-border" />
                      <Chip r={c} sold />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">{L("Products marked Sold are priced and sold at the pump; a grade with sub-products is not.")}</p>
    </div>
  );
}

// ---------------------------------------------------------------- price board

// Products down the side, the base price then each station across: the price
// in force. A station with no price of its own sells at the base price
// (shown faded). Click a price to open it and its versions.
export function PriceBoard({ open }) {
  const L = useL();
  const rows = useActiveRows(fuelPriceApi);
  const c = useOptionsOf(fuelPriceApi);
  if (!rows || !c) return <div className="mb-4 h-28 animate-pulse rounded-2xl bg-muted" />;
  const products = opts(c.products);
  if (!products.length) return null;
  const stations = [{ value: "0", label: L("Base price") }, ...opts(c.stores)];
  const priceOf = (product, store) => rows.find((r) => r.product_code === product && String(Number(r.store_id) || 0) === store);
  const fmt = (v) => Number(v).toLocaleString();
  return (
    <div className="mb-4 overflow-x-auto rounded-2xl border border-border bg-[#0f172a] p-4 text-white shadow-inner">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> {L("Price board")}
        <span className="text-[11px] font-normal text-white/50">· {L("prices in force today")}</span>
      </p>
      <table className="w-full min-w-[28rem] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-white/50">
            <th className="pb-2 pr-3">{L("Product")}</th>
            {stations.map((s) => (
              <th key={s.value} className="pb-2 pr-3 text-right">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const base = priceOf(p.value, "0");
            return (
              <tr key={p.value} className="border-t border-white/10">
                <td className="py-2 pr-3 font-semibold">{p.label}</td>
                {stations.map((s) => {
                  const own = priceOf(p.value, s.value);
                  const shown = own ?? (s.value !== "0" ? base : null);
                  return (
                    <td key={s.value} className="py-2 pr-3 text-right">
                      {shown ? (
                        <button type="button" onClick={() => open(shown.id)} title={own ? `${L("effective_from")} ${own.effective_from}` : L("No price of its own: the base price")} className={cn("rounded-lg px-2 py-1 font-mono text-base font-black tabular-nums transition hover:bg-white/10", own ? "text-amber-300" : "text-white/35")}>
                          {fmt(shown.price)}
                        </button>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-white/45">{L("Faded: no price of its own, so the base price applies. Click a price for its history.")}</p>
    </div>
  );
}

// ---------------------------------------------------------------- vehicle tank

// A vehicle's tank: its size and the fuel it takes.
export function VehicleTank({ vehicle, colour }) {
  const L = useL();
  const cap = Number(vehicle.tank_capacity) || 0;
  return (
    <div className="mb-4 inline-flex items-center gap-4 rounded-2xl border border-border bg-muted/30 px-5 py-3">
      <FuelTank level={cap ? 0.85 : 0} size={70} colour={colour || "var(--primary)"} label={cap ? `${cap.toLocaleString()} L` : L("Tank size not set")} caption={vehicle.product_name ?? (vehicle.product_code || L("Any fuel"))} />
      <div className="text-xs text-muted-foreground">
        <p className="font-mono text-base font-black text-foreground">{vehicle.plate}</p>
        <p>{[vehicle.details?.make, vehicle.details?.model, vehicle.details?.year].filter(Boolean).join(" ") || "—"}</p>
        <p className="mt-1">{vehicle.tag_set ? `✓ ${L("Tag")} …${vehicle.tag_last4 ?? ""}` : L("No tag")}</p>
      </div>
    </div>
  );
}
