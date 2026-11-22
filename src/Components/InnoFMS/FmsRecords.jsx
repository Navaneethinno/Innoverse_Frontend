import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { Toggle } from "@/Components/Common/Toggle";
import { PartyPick, cell, sv, useL, words } from "@/Components/InnoCBS/cbsOps";
import { Field } from "@/Components/InnoCBS/Loans/loanShared";
import { inputClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { discountApi, fuelPriceApi, fuelProductApi, pumpApi, zoneApi } from "@/Services/Fms/fms.api";
import { cn } from "@/Utils/Lib/utils";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { useInstitutionScope } from "@/Components/InnoCBS/Loans/loanShared";
import { TranslationsInput, cleanTranslations, opts } from "./fmsShared";
import { FuelDrop } from "./FmsVisuals";

// InnoFMS records (Admin_42): Fuel Products and Prices (398), Forecourt
// (399), Zones (408) and Discounts (409). Standard maker-checker records:
// the list, pending tab, record page with versions and history, and the
// add / edit form; every button follows the record's `actions`.

const F = (L) => (key, type = "text", extra = {}) => ({ key, label: L(key), type, ...extra });
const label = (list, v) => opts(list).find((o) => o.value === String(v))?.label ?? (v === "" || v == null ? "—" : String(v));
const join = (list, values) => (values?.length ? values.map((v) => label(list, v)).join(", ") : "—");
// A screen's options (stations, products...) for naming ids in its list.
function useOptions(api) {
  const [c, setC] = useState({});
  const { scope, institution } = useInstitutionScope();
  useEffect(() => {
    api
      .options(scope({}))
      .then((r) => setC(rowsOf(r)[0] ?? r?.data ?? {}))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, institution]);
  return c;
}
const n = (v) => (v === "" || v == null ? 0 : Number(v));

// ---------------------------------------------------------------- products

// The grade tree: a top-level product (Diesel) and its sub-products (Diesel
// Premium). What is sold and priced is a product with no sub-products.
export function FuelProducts() {
  const L = useL();
  const f = F(L);
  return (
    <RecordScreen
      api={fuelProductApi}
      title={L("Fuel Products")}
      subtitle={L("The fuels and grades sold at the stations. Two levels: a grade and its sub-products; only a product with no sub-products is priced and sold.")}
      nameOf={(r) => sv(r, "name") ?? sv(r, "code")}
      columns={[
        {
          key: "parent_code",
          label: L("Grade"),
          render: (r) => (sv(r, "parent_code") ? <span className="text-xs text-muted-foreground">↳ {sv(r, "parent_code")}</span> : <span className="text-xs font-semibold">{L("Top level")}</span>),
        },
        { key: "category", label: L("category"), render: (r) => cell(words(sv(r, "category"))) },
        { key: "unit", label: L("unit"), render: (r) => cell(words(sv(r, "unit"))) },
        { key: "tax_percent", label: L("tax_percent"), render: (r) => cell(sv(r, "tax_percent") ? `${sv(r, "tax_percent")}%` : "") },
        {
          key: "colour",
          label: L("colour"),
          render: (r) => (sv(r, "colour") ? <FuelDrop colour={sv(r, "colour")} title={sv(r, "colour")} /> : cell("")),
        },
      ]}
      fields={[
        f("code", "text", { required: true, fixedOnEdit: true, placeholder: "DIESEL_PREMIUM", hint: L("Capitals, digits, _ and -; fixed once added.") }),
        f("name", "text", { required: true, placeholder: "Diesel Premium" }),
        f("name_translations", "custom", { render: (v, set) => <TranslationsInput value={v} onChange={set} /> }),
        f("parent_code", "select", { blank: L("None: a top-level product"), options: (c) => opts(c.parents) }),
        f("category", "select", { required: true, options: (c) => opts(c.categories).map((o) => ({ ...o, label: words(o.value) })) }),
        f("unit", "select", { required: true, options: (c) => opts(c.units).map((o) => ({ ...o, label: words(o.value) })) }),
        f("tax_percent", "percent", { hint: L("Included in the price.") }),
        f("colour", "custom", {
          render: (v, set) => (
            <div className="mt-1 flex items-center gap-2">
              <input type="color" className="h-9 w-12 cursor-pointer rounded border border-border bg-card" value={/^#[0-9a-f]{6}$/i.test(v ?? "") ? v : "#000000"} onChange={(e) => set(e.target.value.toUpperCase())} />
              <input className={cn(inputClass, "max-w-32 font-mono")} placeholder="#RRGGBB" value={v ?? ""} maxLength={7} onChange={(e) => set(e.target.value)} />
              {v && (
                <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => set("")}>
                  {L("Clear")}
                </button>
              )}
            </div>
          ),
        }),
        f("sort_order", "int", { hint: L("Order of the buttons on the POS.") }),
      ]}
      factsOf={(s, c) => [
        [L("code"), s.code],
        [L("name"), s.name],
        ...Object.entries(s.name_translations ?? {}).map(([k, v]) => [`${L("name")} (${k.toUpperCase()})`, v]),
        [L("Grade"), s.parent_code ? label(c?.parents, s.parent_code) : L("Top level")],
        [L("category"), words(s.category)],
        [L("unit"), words(s.unit)],
        [L("tax_percent"), s.tax_percent ? `${s.tax_percent}%` : "—"],
        [L("colour"), s.colour || "—"],
        [L("sort_order"), s.sort_order ?? "—"],
      ]}
      bodyOf={(x) => ({ ...x, name_translations: cleanTranslations(x.name_translations), sort_order: n(x.sort_order) })}
    />
  );
}

// ---------------------------------------------------------------- prices

// One record per product and station (plus its base price, store 0). A price
// change is an edit with a new effective date; every approved price is a version.
export function FuelPrices() {
  const L = useL();
  const f = F(L);
  const c = useOptions(fuelPriceApi);
  const stationName = (r) => (Number(sv(r, "store_id")) ? sv(r, "store_name") ?? label(c.stores, sv(r, "store_id")) : L("Base price"));
  return (
    <RecordScreen
      api={fuelPriceApi}
      title={L("Fuel Prices")}
      subtitle={L("The base price applies at every station without its own. A price change is an edit with a new effective date; dates may not overlap.")}
      effectiveDated
      nameOf={(r) => sv(r, "code")}
      columns={[
        { key: "product_code", label: L("product"), render: (r) => cell(sv(r, "product_name") ?? label(c.products, sv(r, "product_code"))) },
        { key: "store_id", label: L("station"), render: (r) => cell(stationName(r)) },
        { key: "price", label: L("price"), render: (r) => <span className="text-xs font-bold tabular-nums">{sv(r, "price") ? Number(sv(r, "price")).toLocaleString() : "—"}</span> },
        { key: "effective_from", label: L("effective_from"), render: (r) => cell(sv(r, "effective_from")) },
        { key: "effective_to", label: L("effective_to"), render: (r) => cell(sv(r, "effective_to")) },
      ]}
      fields={[
        f("product_code", "select", { required: true, fixedOnEdit: true, options: (c) => opts(c.products), hint: L("Only products with no sub-products are sold and priced.") }),
        f("store_id", "select", { fixedOnEdit: true, blank: L("Base price (every station without its own)"), options: (c) => opts(c.stores) }),
        f("price", "amount", { required: true, hint: L("Per unit, tax included, in the institution's currency.") }),
        f("effective_from", "date", { required: true }),
        f("effective_to", "date"),
      ]}
      factsOf={(s, c) => [
        [L("product"), label(c?.products, s.product_code)],
        [L("station"), Number(s.store_id) ? label(c?.stores, s.store_id) : L("Base price")],
        [L("price"), s.price ? Number(s.price).toLocaleString() : "—"],
        [L("effective_from"), s.effective_from || "—"],
        [L("effective_to"), s.effective_to || "—"],
      ]}
      bodyOf={(x) => ({ ...x, store_id: n(x.store_id) })}
    />
  );
}

// ---------------------------------------------------------------- forecourt

// Nozzles (each tied to one fuel) when Fuel Settings uses them, else the
// fuels the pump sells.
function SellsInput({ value, onChange, choices }) {
  const L = useL();
  const v = value ?? { nozzles: [], product_codes: [] };
  const products = opts(choices?.products);
  if (!choices?.use_nozzles)
    return (
      <div className="mt-1">
        <Field field={{ key: "product_codes", type: "multi", options: products }} value={v.product_codes ?? []} onChange={(product_codes) => onChange({ ...v, product_codes })} />
        <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{L("What the pump sells (Fuel Settings has no nozzles).")}</span>
      </div>
    );
  const rows = v.nozzles ?? [];
  const setRow = (i, patch) => onChange({ ...v, nozzles: rows.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  return (
    <div className="mt-1 rounded-xl border border-border p-2">
      {rows.length === 0 && <p className="px-1 py-2 text-xs font-normal text-muted-foreground">{L("No nozzles yet: add one per fuel outlet.")}</p>}
      {rows.map((x, i) => (
        <div key={i} className="mb-2 grid items-center gap-2 sm:grid-cols-[6rem_1fr_auto_auto]">
          <input className={cn(inputClass, "py-1.5")} placeholder="1" value={x.code ?? ""} maxLength={10} onChange={(e) => setRow(i, { code: e.target.value })} aria-label={L("Nozzle")} />
          <Field field={{ key: "product_code", type: "select", blank: L("Fuel"), options: products }} value={x.product_code ?? ""} onChange={(product_code) => setRow(i, { product_code })} />
          <Toggle showLabel label={L("Active")} checked={x.active !== false} onChange={(active) => setRow(i, { active })} />
          <button type="button" className="rounded p-1.5 text-red-600 hover:bg-red-50" title={L("Remove")} onClick={() => onChange({ ...v, nozzles: rows.filter((_, j) => j !== i) })}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <Button size="sm" variant="secondary" icon={Plus} onClick={() => onChange({ ...v, nozzles: [...rows, { code: String(rows.length + 1), product_code: "", active: true }] })}>
        {L("Add nozzle")}
      </Button>
    </div>
  );
}

export function Forecourt() {
  const L = useL();
  const f = F(L);
  const c = useOptions(pumpApi);
  return (
    <RecordScreen
      api={pumpApi}
      title={L("Forecourt")}
      subtitle={L("The pumps of each station: the terminals that sell from them and their nozzles or fuels. A station is a merchant's store in InnoMMS.")}
      columns={[
        { key: "store_id", label: L("station"), render: (r) => cell(sv(r, "store_name") ?? label(c.stores, sv(r, "store_id"))) },
        { key: "nozzles", label: L("Nozzles"), render: (r) => cell((sv(r, "nozzles") ?? []).map((z) => `${z.code}: ${label(c.products, z.product_code)}`).join(", ") || join(c.products, sv(r, "product_codes"))) },
        { key: "terminal_ids", label: L("Terminals"), render: (r) => cell((sv(r, "terminal_ids") ?? []).length || "") },
      ]}
      fields={[
        f("code", "text", { required: true, fixedOnEdit: true, placeholder: "S12-P1" }),
        f("name", "text", { required: true, placeholder: "Pump 1" }),
        f("store_id", "select", { required: true, options: (c) => opts(c.stores), hint: L("The station.") }),
        f("terminal_ids", "multi", {
          optionsFor: (c, form) => (c.terminals ?? []).filter((x) => !form.store_id || String(x.store_id) === String(form.store_id)).map((x) => ({ value: String(x.value ?? x.id ?? x.tid), label: x.label ?? x.name ?? x.tid })),
          hint: L("POS terminals of the chosen station that sell from this pump."),
        }),
        f("sells", "custom", { label: L("Nozzles"), from: (s) => ({ nozzles: s.nozzles ?? [], product_codes: s.product_codes ?? [] }), render: (v, set, _form, c) => <SellsInput value={v} onChange={set} choices={c} /> }),
      ]}
      factsOf={(s, c) => [
        [L("code"), s.code],
        [L("name"), s.name],
        [L("station"), label(c?.stores, s.store_id)],
        [L("Terminals"), join(c?.terminals, s.terminal_ids)],
        ...(s.nozzles?.length ? [[L("Nozzles"), s.nozzles.map((z) => `${z.code}: ${label(c?.products, z.product_code)}${z.active === false ? ` (${L("off")})` : ""}`).join(" · ")]] : [[L("Fuels"), join(c?.products, s.product_codes)]]),
      ]}
      bodyOf={({ sells, ...x }) => ({
        ...x,
        store_id: n(x.store_id),
        terminal_ids: (x.terminal_ids ?? []).map(Number),
        ...(sells?.nozzles?.length ? { nozzles: sells.nozzles.map((z) => ({ code: String(z.code ?? "").trim(), product_code: z.product_code, active: z.active !== false })) } : { product_codes: sells?.product_codes ?? [] }),
      })}
    />
  );
}

// ---------------------------------------------------------------- zones

export function Zones() {
  const L = useL();
  const f = F(L);
  const c = useOptions(zoneApi);
  return (
    <RecordScreen
      api={zoneApi}
      title={L("Zones")}
      subtitle={L("Groups of stations, used in reports, discounts and the fuel monitor.")}
      columns={[{ key: "store_ids", label: L("Stations"), render: (r) => cell(join(c.stores, sv(r, "store_ids"))) }]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "DOUALA" }),
        f("name", "text", { required: true, placeholder: "Douala" }),
        f("store_ids", "multi", { required: true, label: L("Stations"), options: (c) => opts(c.stores) }),
      ]}
      factsOf={(s, c) => [
        [L("code"), s.code],
        [L("name"), s.name],
        [L("Stations"), join(c?.stores, s.store_ids)],
      ]}
      bodyOf={(x) => ({ ...x, store_ids: (x.store_ids ?? []).map(Number) })}
    />
  );
}

// ---------------------------------------------------------------- discounts

// Money off the unit price; a sale gets the one largest discount that
// matches it. An empty list matches everything.
export function Discounts() {
  const L = useL();
  const f = F(L);
  return (
    <RecordScreen
      api={discountApi}
      title={L("Discounts")}
      subtitle={L("Money off the unit price at the pump. A sale gets the one largest discount that matches it, never two added together. An empty list matches everything.")}
      effectiveDated
      columns={[
        { key: "kind", label: L("kind"), render: (r) => cell(words(sv(r, "kind"))) },
        { key: "value", label: L("value"), render: (r) => cell(sv(r, "kind") === "PERCENT" ? `${sv(r, "value")}%` : sv(r, "value")) },
        { key: "effective_from", label: L("effective_from"), render: (r) => cell(sv(r, "effective_from")) },
      ]}
      fields={[
        f("code", "code", { required: true, fixedOnEdit: true, placeholder: "FLEET5" }),
        f("name", "text", { required: true }),
        f("kind", "select", { required: true, options: (c) => opts(c.kinds).map((o) => ({ ...o, label: words(o.value) })), hint: L("Per unit: an amount off each litre. Percent: under 100.") }),
        f("value", "amount", { required: true }),
        f("products", "multi", { options: (c) => opts(c.products), hint: L("A group covers its grades. Empty: every product.") }),
        f("store_ids", "multi", { label: L("Stations"), options: (c) => opts(c.stores), hint: L("Empty: every station.") }),
        f("zones", "multi", { options: (c) => opts(c.zones), hint: L("Empty: every zone.") }),
        f("owner", "custom", { label: L("Customer"), from: (s) => (s.owner_type && s.owner_id ? `${s.owner_type}:${s.owner_id}` : ""), render: (v, set) => <PartyPick value={v} onChange={set} /> }),
        f("card_product_id", "select", { blank: L("Any card product"), options: (c) => opts(c.card_products) }),
        f("min_litres", "amount", { hint: L("Empty: no minimum.") }),
        f("effective_from", "date", { required: true }),
        f("effective_to", "date"),
        f("cash_sales", "bool", { hint: L("Also for sales without a card (cash, QR).") }),
      ]}
      factsOf={(s, c) => [
        [L("code"), s.code],
        [L("name"), s.name],
        [L("kind"), words(s.kind)],
        [L("value"), s.kind === "PERCENT" ? `${s.value}%` : s.value],
        [L("products"), join(c?.products, s.products)],
        [L("Stations"), join(c?.stores, s.store_ids)],
        [L("zones"), join(c?.zones, s.zones)],
        [L("Customer"), s.owner_name ?? (s.owner_id ? `${s.owner_type} #${s.owner_id}` : L("Every card holder"))],
        [L("card_product_id"), Number(s.card_product_id) ? label(c?.card_products, s.card_product_id) : L("Any card product")],
        [L("min_litres"), s.min_litres || "—"],
        [L("cash_sales"), s.cash_sales ? "✓" : "—"],
        [L("effective_from"), s.effective_from || "—"],
        [L("effective_to"), s.effective_to || "—"],
      ]}
      bodyOf={({ owner, ...x }) => {
        const [owner_type, id] = String(owner ?? "").split(":");
        return { ...x, store_ids: (x.store_ids ?? []).map(Number), card_product_id: n(x.card_product_id), owner_type: owner_type && id ? owner_type : "", owner_id: owner_type && id ? Number(id) : 0 };
      }}
    />
  );
}
