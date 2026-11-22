import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { Toggle } from "@/Components/Common/Toggle";
import { useL, words } from "@/Components/InnoCBS/cbsOps";
import { inputClass, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { fuelSettingsApi } from "@/Services/Fms/fms.api";
import { cn } from "@/Utils/Lib/utils";
import { TranslationsInput, cleanTranslations, opts } from "./fmsShared";
import { SettingsGuide } from "./FmsPictures";

// InnoFMS › Settings › Fuel Settings (Admin_42, menu 397): how the pumps sell
// and what a sale needs, per institution. One document under maker-checker.

// What each switch is called on screen.
const NAMES = {
  sale_mode: "How a sale is entered",
  volume_decimals: "Litre decimals",
  max_sale_volume: "Largest sale (litres)",
  use_nozzles: "Pumps have nozzles",
  pump_on_terminal: "Terminals tied to pumps",
  boutique_sales: "Shop sales",
  cash_sales: "Cash sales",
  qr_sales: "QR payments",
  card_pin: "Card PIN",
  card_otp: "One-time code to the holder",
  vehicle_tag: "Vehicle tag read",
  driver: "Driver required",
  odometer: "Odometer reading",
  odometer_rule: "Reading below the last one",
  card_product_id: "Card product",
  receipt_footer: "Receipt footer",
};
const NEEDS = ["card_pin", "card_otp", "vehicle_tag", "driver", "odometer"];
const BLANK_NEEDS = { card_pin: true, card_otp: false, vehicle_tag: false, driver: false, odometer: false, odometer_rule: "NONE" };
const PUMP = ["use_nozzles", "pump_on_terminal", "boutique_sales", "cash_sales", "qr_sales"];

const toForm = (s) => ({
  sale_mode: "EITHER",
  volume_decimals: 2,
  use_nozzles: false,
  pump_on_terminal: false,
  boutique_sales: false,
  cash_sales: false,
  qr_sales: false,
  max_sale_volume: "",
  receipt_footer: "",
  fleet_owners: ["CUST_CORP", "CUST_INDV"],
  ...structuredClone(s ?? {}),
  defaults: { ...BLANK_NEEDS, ...(s?.defaults ?? {}) },
  overrides: (s?.overrides ?? []).map((o) => ({ ...BLANK_NEEDS, ...o })),
  receipt_footer_translations: { ...(s?.receipt_footer_translations ?? {}) },
});
const needsOf = (x) => ({ ...Object.fromEntries(NEEDS.map((k) => [k, Boolean(x?.[k])])), odometer_rule: x?.odometer_rule || "NONE" });
const bodyOf = (f) => ({
  sale_mode: f.sale_mode,
  volume_decimals: Number(f.volume_decimals) || 0,
  ...Object.fromEntries(PUMP.map((k) => [k, Boolean(f[k])])),
  defaults: needsOf(f.defaults),
  overrides: (f.overrides ?? []).map((o) => ({ card_product_id: Number(o.card_product_id) || 0, ...needsOf(o) })),
  max_sale_volume: String(f.max_sale_volume ?? "").trim(),
  receipt_footer: String(f.receipt_footer ?? "").trim(),
  receipt_footer_translations: cleanTranslations(f.receipt_footer_translations),
  fleet_owners: f.fleet_owners ?? [],
});
function problemOf(t, f) {
  const d = Number(f.volume_decimals);
  if (!Number.isInteger(d) || d < 0 || d > 3) return "Decimals: 0 to 3.";
  if (String(f.max_sale_volume ?? "").trim() && !(Number(f.max_sale_volume) > 0)) return "The largest sale must be a number above 0, or empty.";
  if ((f.overrides ?? []).some((o) => !Number(o.card_product_id))) return "Each override needs a card product.";
  const ids = (f.overrides ?? []).map((o) => String(o.card_product_id));
  if (new Set(ids).size !== ids.length) return "A card product has two overrides.";
  return "";
}

export function FuelSettings() {
  const L = useL();
  return (
    <SectionScreen api={fuelSettingsApi} ns="record" valueKey="setup" title={L("Fuel Settings")} subtitle={L("How the pumps sell and what a sale needs. Changes need a checker.")} toForm={toForm} bodyOf={bodyOf} problemOf={(t, f) => L(problemOf(t, f))} framed={false} before={() => <SettingsGuide current="settings" />}>
      {({ data, shown, editing, setForm }) => <SettingsForm choices={data?.choices ?? {}} value={toForm(shown)} editing={editing} onChange={setForm} />}
    </SectionScreen>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-bold">{title}</h2>
      {children}
    </section>
  );
}

function SettingsForm({ choices, value: v, editing, onChange }) {
  const L = useL();
  const set = (patch) => onChange((f) => ({ ...f, ...patch }));
  const yes = (on) => <span className="text-sm font-semibold">{on ? L("Yes") : L("No")}</span>;
  const name = (k) => L(NAMES[k] ?? k);
  const sw = (k, on, change) => (
    <div key={k} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
      <span className={labelClass}>{name(k)}</span>
      {editing ? <Toggle checked={Boolean(on)} onChange={change} /> : yes(on)}
    </div>
  );
  const select = (val, list, change, blank) =>
    editing ? (
      <select className={cn(inputClass, "mt-1")} value={val ?? ""} onChange={(e) => change(e.target.value)}>
        {blank && <option value="">{blank}</option>}
        {list.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    ) : (
      <p className="mt-1 text-sm font-semibold">{list.find((o) => o.value === String(val))?.label ?? (val || "—")}</p>
    );
  const text = (val, change, extra = {}) => (editing ? <input className={cn(inputClass, "mt-1")} value={val ?? ""} onChange={(e) => change(e.target.value)} {...extra} /> : <p className="mt-1 text-sm font-semibold">{val === "" || val == null ? (extra.emptyText ?? "—") : val}</p>);
  const wordsOf = (list) => opts(list).map((o) => ({ ...o, label: words(o.value) }));
  const saleModes = wordsOf(choices.sale_modes ?? ["AMOUNT", "VOLUME", "EITHER"]);
  const rules = wordsOf(choices.odometer_rules ?? ["NONE", "WARN", "REFUSE"]);
  const cardProducts = opts(choices.card_products);
  const ownerChoices = choices.fleet_owners ?? ["CUST_CORP", "CUST_INDV"];

  const needsRow = (x, change) => (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {NEEDS.map((k) => sw(k, x[k], (on) => change({ [k]: on })))}
      <label className="rounded-xl border border-border px-3 py-2">
        <span className={labelClass}>{name("odometer_rule")}</span>
        {select(x.odometer_rule, rules, (val) => change({ odometer_rule: val }))}
      </label>
    </div>
  );

  return (
    <div className="grid gap-4">
      <Card title={L("At the pump")}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="rounded-xl border border-border px-3 py-2">
            <span className={labelClass}>{name("sale_mode")}</span>
            {select(v.sale_mode, saleModes, (val) => set({ sale_mode: val }))}
          </label>
          <label className="rounded-xl border border-border px-3 py-2">
            <span className={labelClass}>{name("volume_decimals")}</span>
            {select(String(v.volume_decimals), ["0", "1", "2", "3"].map((x) => ({ value: x, label: x })), (val) => set({ volume_decimals: Number(val) }))}
          </label>
          <label className="rounded-xl border border-border px-3 py-2">
            <span className={labelClass}>{name("max_sale_volume")}</span>
            {text(v.max_sale_volume, (val) => set({ max_sale_volume: val.replace(/[^\d.]/g, "") }), { inputMode: "decimal", placeholder: L("No limit"), emptyText: L("No limit") })}
          </label>
          {PUMP.map((k) => sw(k, v[k], (on) => set({ [k]: on })))}
        </div>
      </Card>

      <Card title={L("What a sale needs")}>
        <p className="mb-2 text-xs text-muted-foreground">{L("For every card, unless its card product has an override below. With both PIN and one-time code on, either one approves the sale.")}</p>
        {needsRow(v.defaults, (patch) => set({ defaults: { ...v.defaults, ...patch } }))}
        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-sm font-bold">{L("Overrides per card product")}</p>
          {editing && (
            <Button size="sm" variant="secondary" icon={Plus} disabled={!cardProducts.length} disabledReason={L("There are no card products to choose.")} onClick={() => set({ overrides: [...v.overrides, { card_product_id: "", ...v.defaults }] })}>
              {L("Add override")}
            </Button>
          )}
        </div>
        {!v.overrides.length && <p className="mt-2 rounded-xl bg-muted/50 px-3 py-3 text-center text-xs text-muted-foreground">{L("No overrides: every card uses the defaults.")}</p>}
        {v.overrides.map((o, i) => (
          <div key={i} className="mt-3 rounded-xl border border-dashed border-border p-3">
            <div className="mb-2 flex items-end gap-2">
              <label className="flex-1">
                <span className={labelClass}>{name("card_product_id")}</span>
                {select(o.card_product_id ? String(o.card_product_id) : "", cardProducts, (val) => set({ overrides: v.overrides.map((x, j) => (j === i ? { ...x, card_product_id: val } : x)) }), L("Choose"))}
              </label>
              {editing && (
                <button type="button" className="mb-1 rounded p-2 text-red-600 hover:bg-red-50" title={L("Remove")} onClick={() => set({ overrides: v.overrides.filter((_, j) => j !== i) })}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            {needsRow(o, (patch) => set({ overrides: v.overrides.map((x, j) => (j === i ? { ...x, ...patch } : x)) }))}
          </div>
        ))}
      </Card>

      <Card title={L("Fleets")}>
        <p className="mb-2 text-xs text-muted-foreground">{L("Which customers may keep a fleet (vehicles, drivers, cost centres, card bindings). None: fleets are off.")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ownerChoices.map((k) =>
            sw(k === "CUST_CORP" ? "Corporate customers" : k === "CUST_INDV" ? "Individual customers" : k, (v.fleet_owners ?? []).includes(k), (on) => set({ fleet_owners: on ? [...new Set([...(v.fleet_owners ?? []), k])] : (v.fleet_owners ?? []).filter((x) => x !== k) })),
          )}
        </div>
      </Card>

      <Card title={L("Receipt")}>
        <label className="block">
          <span className={labelClass}>{name("receipt_footer")}</span>
          {text(v.receipt_footer, (val) => set({ receipt_footer: val }), { maxLength: 200 })}
        </label>
        <div className="mt-3">
          <span className={labelClass}>{L("Footer in other languages")}</span>
          {editing ? (
            <TranslationsInput value={v.receipt_footer_translations} maxLength={200} placeholder={v.receipt_footer} onChange={(receipt_footer_translations) => set({ receipt_footer_translations })} />
          ) : (
            <p className="mt-1 text-sm">{Object.entries(v.receipt_footer_translations ?? {}).map(([k, x]) => `${k.toUpperCase()}: ${x}`).join(" · ") || "—"}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
