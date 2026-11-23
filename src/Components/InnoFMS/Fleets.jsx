import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { RequiredMark } from "@/Components/Common/RequiredMark";
import { PartyPick, useL, words } from "@/Components/InnoCBS/cbsOps";
import { Facts, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field } from "@/Components/InnoCBS/Loans/loanShared";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import { bindingApi, costCentreApi, driverApi, fleetOptions, fuelLimitApi, vehicleApi } from "@/Services/Fms/fms.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { FleetScreen, FleetStatus, ownerOf } from "./FleetScreen";
import { num, opts } from "./fmsShared";
import { FuelTank, levelColour } from "./FmsVisuals";
import { VehicleTank } from "./FmsPictures";

// InnoFMS › Fleets (Admin_42, menus 401–404 and 407): a customer's vehicles,
// drivers, cost centres, card bindings and fuel limits.

const txt = (v) => (v === "" || v == null ? "—" : String(v));
const id = (v) => (v === "" || v == null ? 0 : Number(v));
const sel = (v) => (v === "" || v == null || Number(v) === 0 ? "" : String(v));
const cell = (v) => <span className="text-xs">{txt(v)}</span>;
// Choices from the customer's fleet options (each list may hold records or { value, label }).
const pick = (key, labelOf) => (c) => (c?.[key] ?? []).map((x) => (x && typeof x === "object" && "value" in x ? { value: String(x.value), label: x.label } : { value: String(x.id), label: labelOf(x) }));
const costCentres = pick("cost_centres", (x) => [x.code, x.name].filter(Boolean).join(" · "));
const vehicles = pick("vehicles", (x) => [x.plate, x.details?.make, x.details?.model].filter(Boolean).join(" · "));
const drivers = pick("drivers", (x) => [x.name, x.phone_number].filter(Boolean).join(" · "));
const cards = (c) => (c?.cards ?? []).map((x) => ({ value: String(x.id ?? x.card_id), label: [x.pan_masked, x.name_on_card, x.binding_id ? "(bound)" : ""].filter(Boolean).join(" · ") }));
const products = (c) => opts(c?.products);

// A record's own fuel limits (Vehicles, Drivers, Cost Centres).
function OwnLimits({ filter }) {
  const L = useL();
  const [rows, setRows] = useState(null);
  const key = JSON.stringify(filter);
  useEffect(() => {
    fuelLimitApi
      .list({ ...filter, page: 1, limit: 50 })
      .then((r) => setRows(rowsOf(r)))
      .catch(() => setRows([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (
    <>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{L("Fuel limits")}</p>
      {!rows ? (
        <div className="h-12 animate-pulse rounded-xl bg-muted" />
      ) : !rows.length ? (
        <p className="text-xs text-muted-foreground">{L("No limits of its own.")}</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-xs">
              <span className="font-semibold">{x.name}</span>
              <span className="text-muted-foreground">{words(x.period)}</span>
              <span>{[x.max_amount && `${num(x.max_amount)}`, x.max_litres && `${num(x.max_litres)} L`, x.max_count && `${x.max_count} ×`].filter(Boolean).join(" · ")}</span>
              <FleetStatus row={x} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ---------------------------------------------------------------- cost centres

export function CostCentres() {
  const L = useL();
  return (
    <FleetScreen
      api={costCentreApi}
      title={L("Cost Centres")}
      subtitle={L("How a customer counts its fleet's fuel (depots, departments). Changes from staff need a checker; the customer's own apply at once.")}
      columns={[
        { key: "code", label: L("code"), align: "left", render: (r) => <span className="font-mono text-xs font-semibold">{r.code}</span> },
        { key: "name", label: L("name"), align: "left", render: (r) => cell(r.name) },
      ]}
      fields={[
        { key: "code", label: L("code"), required: true, placeholder: "DOUALA", hint: L("Letters, digits, _ and -; unique for the customer.") },
        { key: "name", label: L("name"), required: true },
        { key: "description", label: L("description"), type: "textarea" },
      ]}
      fromRecord={(r) => ({ code: r.code ?? "", name: r.name ?? "", description: r.description ?? "" })}
      toBody={(f) => ({ code: String(f.code ?? "").trim(), name: String(f.name ?? "").trim(), description: String(f.description ?? "").trim() })}
      factsOf={(r) => [
        [L("code"), txt(r.code)],
        [L("name"), txt(r.name)],
        [L("description"), txt(r.description)],
      ]}
      detailExtra={(r) => <OwnLimits filter={{ cost_centre_id: r.id }} />}
    />
  );
}

// ---------------------------------------------------------------- vehicles

export function Vehicles() {
  const L = useL();
  return (
    <FleetScreen
      api={vehicleApi}
      title={L("Vehicles")}
      subtitle={L("A customer's vehicles: the fuel each takes, its tank and its tag read at the pump.")}
      columns={[
        { key: "plate", label: L("plate"), align: "left", render: (r) => <span className="font-mono text-xs font-semibold">{r.plate}</span> },
        { key: "model", label: L("Vehicle"), align: "left", render: (r) => cell([r.details?.make, r.details?.model, r.details?.year].filter(Boolean).join(" ")) },
        { key: "product_code", label: L("Fuel"), render: (r) => cell(r.product_name ?? (r.product_code || L("Any"))) },
        { key: "cost_centre", label: L("Cost centre"), render: (r) => cell(r.cost_centre?.name) },
        { key: "tag_set", label: L("Tag"), render: (r) => cell(r.tag_set ? `✓ …${r.tag_last4 ?? ""}` : "") },
      ]}
      fields={[
        { key: "plate", label: L("plate"), required: true, placeholder: "LT 482 AB", hint: L("Unique in the institution.") },
        { key: "product_code", label: L("Fuel"), type: "select", blank: L("Any fuel"), options: products },
        { key: "cost_centre_id", label: L("Cost centre"), type: "select", blank: L("None"), options: costCentres },
        { key: "tank_capacity", label: L("tank_capacity"), type: "amount", hint: L("In the fuel's unit (litres).") },
        { key: "make", label: L("make"), placeholder: "Toyota" },
        { key: "model", label: L("model"), placeholder: "Hilux" },
        { key: "colour", label: L("colour") },
        { key: "year", label: L("year"), type: "int" },
        { key: "tag", label: L("Tag (RFID / NFC)"), hint: L("Write only: never shown again. Leave empty to keep the current tag.") },
        { key: "clear_tag", label: L("Remove the tag"), type: "bool", showIf: (f) => f.tag_set && !f.tag },
        { key: "notes", label: L("notes"), type: "textarea" },
      ]}
      fromRecord={(r) => ({
        plate: r.plate ?? "",
        product_code: r.product_code ?? "",
        cost_centre_id: sel(r.cost_centre_id),
        tank_capacity: r.tank_capacity == null ? "" : String(r.tank_capacity),
        make: r.details?.make ?? "",
        model: r.details?.model ?? "",
        colour: r.details?.colour ?? "",
        year: r.details?.year ? String(r.details.year) : "",
        notes: r.details?.notes ?? "",
        tag: "",
        tag_set: Boolean(r.tag_set),
        clear_tag: false,
      })}
      toBody={(f) => ({
        plate: String(f.plate ?? "").trim(),
        product_code: f.product_code ?? "",
        cost_centre_id: id(f.cost_centre_id),
        tank_capacity: String(f.tank_capacity ?? "").trim(),
        make: String(f.make ?? "").trim(),
        model: String(f.model ?? "").trim(),
        colour: String(f.colour ?? "").trim(),
        year: f.year ? Number(f.year) : 0,
        notes: String(f.notes ?? "").trim(),
        ...(String(f.tag ?? "").trim() ? { tag: String(f.tag).trim() } : {}),
        ...(f.clear_tag ? { clear_tag: true } : {}),
      })}
      factsOf={(r) => [
        [L("plate"), txt(r.plate)],
        [L("Fuel"), txt(r.product_name ?? (r.product_code || L("Any")))],
        [L("tank_capacity"), txt(r.tank_capacity)],
        [L("Cost centre"), txt(r.cost_centre?.name)],
        [L("Vehicle"), txt([r.details?.make, r.details?.model, r.details?.colour, r.details?.year].filter(Boolean).join(" "))],
        [L("Tag"), r.tag_set ? `✓ …${r.tag_last4 ?? ""}` : L("No tag")],
        [L("notes"), txt(r.details?.notes)],
      ]}
      detailExtra={(r) => (
        <>
          <VehicleTank vehicle={r} />
          <OwnLimits filter={{ vehicle_id: r.id }} />
        </>
      )}
    />
  );
}

// ---------------------------------------------------------------- drivers

export function Drivers() {
  const L = useL();
  return (
    <FleetScreen
      api={driverApi}
      title={L("Drivers")}
      subtitle={L("The people who drive a customer's vehicles; a bound card's one-time code goes to its driver's phone.")}
      columns={[
        { key: "name", label: L("name"), align: "left", render: (r) => <span className="text-xs font-semibold">{r.name}</span> },
        { key: "phone_number", label: L("phone"), render: (r) => <span className="font-mono text-xs">{txt(r.phone_number)}</span> },
        { key: "licence_no", label: L("Licence"), render: (r) => cell(r.licence_no) },
        { key: "cost_centre", label: L("Cost centre"), render: (r) => cell(r.cost_centre?.name) },
      ]}
      fields={[
        { key: "name", label: L("name"), required: true },
        { key: "phone_number", label: L("phone"), placeholder: "+237 677 445 566", hint: L("+ and the country code.") },
        { key: "email", label: L("email") },
        { key: "licence_no", label: L("Licence number"), hint: L("Unique for the customer.") },
        { key: "licence_expiry", label: L("Licence expiry"), type: "date" },
        { key: "employee_no", label: L("Employee number") },
        { key: "cost_centre_id", label: L("Cost centre"), type: "select", blank: L("None"), options: costCentres },
        { key: "notes", label: L("notes"), type: "textarea" },
      ]}
      fromRecord={(r) => ({
        name: r.name ?? "",
        phone_number: r.phone_number ?? "",
        email: r.details?.email ?? "",
        licence_no: r.licence_no ?? "",
        licence_expiry: r.details?.licence_expiry ?? "",
        employee_no: r.details?.employee_no ?? "",
        cost_centre_id: sel(r.cost_centre_id),
        notes: r.details?.notes ?? "",
      })}
      toBody={(f) => ({
        name: String(f.name ?? "").trim(),
        phone_number: String(f.phone_number ?? "").trim(),
        email: String(f.email ?? "").trim(),
        licence_no: String(f.licence_no ?? "").trim(),
        licence_expiry: f.licence_expiry ?? "",
        employee_no: String(f.employee_no ?? "").trim(),
        cost_centre_id: id(f.cost_centre_id),
        notes: String(f.notes ?? "").trim(),
      })}
      factsOf={(r) => [
        [L("name"), txt(r.name)],
        [L("phone"), txt(r.phone_number)],
        [L("email"), txt(r.details?.email)],
        [L("Licence number"), txt(r.licence_no)],
        [L("Licence expiry"), txt(r.details?.licence_expiry)],
        [L("Employee number"), txt(r.details?.employee_no)],
        [L("Cost centre"), txt(r.cost_centre?.name)],
        [L("notes"), txt(r.details?.notes)],
      ]}
      detailExtra={(r) => <OwnLimits filter={{ driver_id: r.id }} />}
    />
  );
}

// ---------------------------------------------------------------- card bindings

export function CardBindings() {
  const L = useL();
  return (
    <FleetScreen
      api={bindingApi}
      title={L("Card Bindings")}
      subtitle={L("Which of the customer's fuel cards is tied to which vehicle or driver. A card has one binding at a time.")}
      columns={[
        { key: "card", label: L("Card"), align: "left", render: (r) => <span className="font-mono text-xs">{txt(r.card?.pan_masked)}</span> },
        { key: "vehicle", label: L("Vehicle"), render: (r) => cell(r.vehicle?.plate) },
        { key: "driver", label: L("Driver"), render: (r) => cell(r.driver?.name) },
        { key: "tag_required", label: L("Tag needed"), render: (r) => cell(r.tag_required ? "✓" : "") },
      ]}
      fields={[
        { key: "card_id", label: L("Card"), type: "select", required: true, options: cards, hint: L("One of the customer's open cards; a bound one is marked.") },
        { key: "vehicle_id", label: L("Vehicle"), type: "select", blank: L("None"), options: vehicles },
        { key: "driver_id", label: L("Driver"), type: "select", blank: L("None"), options: drivers },
        { key: "tag_required", label: L("The vehicle's tag must be read at the pump"), type: "bool", showIf: (f) => Boolean(f.vehicle_id) },
        { key: "notes", label: L("notes"), type: "textarea" },
      ]}
      fromRecord={(r) => ({ card_id: sel(r.card_id), vehicle_id: sel(r.vehicle_id), driver_id: sel(r.driver_id), tag_required: Boolean(r.tag_required), notes: r.notes ?? r.details?.notes ?? "" })}
      toBody={(f) => ({ card_id: id(f.card_id), vehicle_id: id(f.vehicle_id), driver_id: id(f.driver_id), tag_required: Boolean(f.vehicle_id) && Boolean(f.tag_required), notes: String(f.notes ?? "").trim() })}
      factsOf={(r) => [
        [L("Card"), txt([r.card?.pan_masked, r.card?.name_on_card].filter(Boolean).join(" · "))],
        [L("Vehicle"), txt(r.vehicle?.plate)],
        [L("Driver"), txt(r.driver?.name)],
        [L("Tag needed"), r.tag_required ? "✓" : "—"],
        [L("notes"), txt(r.notes ?? r.details?.notes)],
      ]}
    />
  );
}

// ---------------------------------------------------------------- fuel limits

const SCOPES = ["CUSTOMER", "COST_CENTRE", "VEHICLE", "DRIVER", "CARD"];
const PERIODS = ["TRANSACTION", "DAY", "WEEK", "MONTH", "QUARTER", "YEAR", "WINDOW"];
const scopeChoices = { COST_CENTRE: costCentres, VEHICLE: vehicles, DRIVER: drivers, CARD: cards };

function LimitUsage({ id: limitId }) {
  const L = useL();
  const [u, setU] = useState(null);
  useEffect(() => {
    fuelLimitApi
      .usage({ id: limitId })
      .then((r) => setU(rowsOf(r)[0] ?? r?.data ?? {}))
      .catch(() => setU({}));
  }, [limitId]);
  if (!u) return <div className="mb-3 h-16 animate-pulse rounded-xl bg-muted" />;
  if (!u.period) return null;
  const tanks = [
    ["Amount", u.max_amount, u.used_amount, ""],
    ["Litres", u.max_litres, u.used_litres, " L"],
    ["Fills", u.max_count, u.used_count, ""],
  ].filter(([, max]) => max != null && Number(max) > 0);
  const line = (max, used, left, unit = "") => (max == null ? null : `${num(used)}${unit} / ${num(max)}${unit} · ${L("left")} ${num(left)}${unit}`);
  return (
    <>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{L("This period")}</p>
      {tanks.length > 0 && (
        <div className="mb-3 inline-flex flex-wrap gap-6 rounded-2xl border border-border bg-muted/30 px-5 py-3">
          {tanks.map(([name, max, used, unit]) => {
            const level = (Number(used) || 0) / Number(max);
            return <FuelTank key={name} level={level} size={70} colour={levelColour(level)} label={`${num(used)}${unit} / ${num(max)}${unit}`} caption={`${L(name)} · ${Math.round(level * 100)}%`} />;
          })}
        </div>
      )}
      <Facts
        className="mb-3"
        rows={[
          [L("period"), `${words(u.period)}${u.period_start ? ` · ${accountDate(u.period_start)} – ${accountDate(u.period_end)}` : ""}`],
          ...(line(u.max_amount, u.used_amount, u.left_amount) ? [[L("Amount"), line(u.max_amount, u.used_amount, u.left_amount)]] : []),
          ...(line(u.max_litres, u.used_litres, u.left_litres, " L") ? [[L("Litres"), line(u.max_litres, u.used_litres, u.left_litres, " L")]] : []),
          ...(line(u.max_count, u.used_count, u.left_count) ? [[L("Fills"), line(u.max_count, u.used_count, u.left_count)]] : []),
        ]}
      />
    </>
  );
}

// Try a fill: checks a made-up fill against every limit, writing nothing.
function TryFill({ onClose }) {
  const L = useL();
  const [owner, setOwner] = useState("");
  const [choices, setChoices] = useState(null);
  const [f, setF] = useState({ card_id: "", vehicle_id: "", driver_id: "", product_code: "", litres: "", amount: "" });
  const [answer, setAnswer] = useState(null);
  const [busy, setBusy] = useState(false);
  const o = ownerOf(owner);
  useEffect(() => {
    setChoices(null);
    setAnswer(null);
    if (!o) return;
    fleetOptions(o)
      .then((r) => setChoices(rowsOf(r)[0] ?? r?.data ?? {}))
      .catch((e) => notifications.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const run = async () => {
    setBusy(true);
    try {
      const r = await fuelLimitApi.check({
        ...o,
        product_code: f.product_code,
        ...(id(f.card_id) ? { card_id: id(f.card_id) } : {}),
        ...(id(f.vehicle_id) ? { vehicle_id: id(f.vehicle_id) } : {}),
        ...(id(f.driver_id) ? { driver_id: id(f.driver_id) } : {}),
        ...(f.litres ? { litres: f.litres } : {}),
        ...(f.amount ? { amount: f.amount } : {}),
      });
      setAnswer(rowsOf(r)[0] ?? r?.data ?? {});
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const field = (k, labelText, extra) => (
    <label className={labelClass}>
      {labelText}
      <Field field={{ key: k, ...extra }} value={f[k]} onChange={set(k)} />
    </label>
  );
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={L("Try a fill")}
      subtitle={L("Checks a made-up fill against the limits, as the pump would. Nothing is written.")}
      footer={
        <Button icon={FlaskConical} loading={busy} disabled={!o || !choices || !f.product_code} disabledReason={!o ? L("Pick the customer first.") : L("Choose the fuel.")} onClick={run}>
          {L("Check")}
        </Button>
      }
    >
      <label className={cn(labelClass, "mb-3 block")}>
        {L("Customer")}
        <RequiredMark />
        <PartyPick party="CUSTOMER" value={owner} onChange={setOwner} />
      </label>
      {o && choices && (
        <div className="grid gap-3 sm:grid-cols-2">
          {field("card_id", L("Card"), { type: "select", blank: L("None"), options: cards(choices) })}
          {field("product_code", L("Fuel"), { type: "select", blank: L("Choose"), options: products(choices) })}
          {field("vehicle_id", L("Vehicle"), { type: "select", blank: L("From the card's binding"), options: vehicles(choices) })}
          {field("driver_id", L("Driver"), { type: "select", blank: L("From the card's binding"), options: drivers(choices) })}
          {field("litres", L("Litres"), { type: "amount" })}
          {field("amount", L("Amount"), { type: "amount" })}
        </div>
      )}
      {answer && (
        <div className="mt-4">
          <p className={cn("rounded-xl px-3 py-2 text-sm font-bold", answer.allowed ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700")}>
            {answer.allowed ? L("Allowed") : L("Refused")}
            {(answer.max_litres != null || answer.max_amount) && (
              <span className="ml-2 text-xs font-semibold">
                · {L("At most")} {[answer.max_litres != null && `${num(answer.max_litres)} L`, answer.max_amount ? num(answer.max_amount) : null].filter(Boolean).join(" / ")}
              </span>
            )}
          </p>
          {(answer.breaches ?? []).length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-red-700">
              {answer.breaches.map((b, i) => (
                <li key={i}>{b.text}</li>
              ))}
            </ul>
          )}
          {(answer.limits ?? []).length > 0 && (
            <ul className="mt-3 space-y-1">
              {answer.limits.map((x) => (
                <li key={x.limit_id} className={cn("rounded-xl border border-border px-3 py-1.5 text-xs", !x.applies && "opacity-50")}>
                  <span className="font-semibold">{x.name}</span> · {words(x.period)}
                  {x.left_litres != null && ` · ${L("left")} ${num(x.left_litres)} L`}
                  {x.left_amount != null && ` · ${L("left")} ${num(x.left_amount)}`}
                  {!x.applies && ` · ${L("does not cover this fill")}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}

export function FuelLimits() {
  const L = useL();
  const [trying, setTrying] = useState(false);
  return (
    <>
      <FleetScreen
        api={fuelLimitApi}
        title={L("Fuel Limits")}
        subtitle={L("What a part of a customer's fleet may take at the pump: per fill, per day, week, month, quarter, year or a date window. The pump checks every limit that applies.")}
        pageActions={
          <Button variant="secondary" icon={FlaskConical} onClick={() => setTrying(true)}>
            {L("Try a fill")}
          </Button>
        }
        columns={[
          { key: "name", label: L("name"), align: "left", render: (r) => <span className="text-xs font-semibold">{r.name}</span> },
          { key: "scope", label: L("Applies to"), render: (r) => cell(`${words(r.scope_type)}${r.scope_name ? `: ${r.scope_name}` : ""}`) },
          { key: "period", label: L("period"), render: (r) => cell(words(r.period)) },
          { key: "max", label: L("Limit"), render: (r) => cell([r.max_amount && num(r.max_amount), r.max_litres != null && r.max_litres !== "" && `${num(r.max_litres)} L`, r.max_count && `${r.max_count} ×`].filter(Boolean).join(" · ")) },
        ]}
        fields={[
          { key: "name", label: L("name"), required: true, placeholder: "Weekly diesel" },
          { key: "scope_type", label: L("Applies to"), type: "select", required: true, options: SCOPES.map((v) => ({ value: v, label: L(v === "CUSTOMER" ? "Whole fleet" : words(v)) })) },
          { key: "scope_id", label: L("Which one"), type: "select", required: true, showIf: (f) => f.scope_type && f.scope_type !== "CUSTOMER", options: (c, form) => scopeChoices[form.scope_type]?.(c) ?? [] },
          { key: "period", label: L("period"), type: "select", required: true, options: PERIODS.map((v) => ({ value: v, label: words(v) })), hint: L("Week: Monday to Sunday. Window: from the start date to the end date.") },
          { key: "valid_from", label: L("valid_from"), type: "date", required: false },
          { key: "valid_to", label: L("valid_to"), type: "date" },
          { key: "max_amount", label: L("max_amount"), type: "amount" },
          { key: "max_litres", label: L("max_litres"), type: "amount", hint: L("0 blocks: with products, it forbids those fuels.") },
          { key: "max_count", label: L("max_count"), type: "int", showIf: (f) => f.period !== "TRANSACTION" },
          { key: "products", label: L("products"), type: "multi", options: products, hint: L("A group covers its sub-products. Empty: every product.") },
          { key: "products_except", label: L("Every product except those chosen"), type: "bool" },
          { key: "stations", label: L("Stations (store ids)"), hint: L("Comma separated. Empty: every station.") },
          { key: "stations_except", label: L("Every station except those listed"), type: "bool" },
          { key: "notes", label: L("notes"), type: "textarea" },
        ]}
        fromRecord={(r) => ({
          name: r.name ?? "",
          scope_type: r.scope_type ?? "CUSTOMER",
          scope_id: sel(r.scope_id),
          period: r.period ?? "",
          valid_from: r.valid_from ?? "",
          valid_to: r.valid_to ?? "",
          max_amount: r.max_amount == null ? "" : String(r.max_amount),
          max_litres: r.max_litres == null ? "" : String(r.max_litres),
          max_count: r.max_count == null ? "" : String(r.max_count),
          products: r.products ?? [],
          products_except: Boolean(r.products_except),
          stations: (r.stations ?? []).join(", "),
          stations_except: Boolean(r.stations_except),
          notes: r.notes ?? "",
        })}
        toBody={(f) => ({
          name: String(f.name ?? "").trim(),
          scope_type: f.scope_type || "CUSTOMER",
          ...(f.scope_type && f.scope_type !== "CUSTOMER" ? { scope_id: id(f.scope_id) } : {}),
          period: f.period,
          valid_from: f.valid_from ?? "",
          valid_to: f.valid_to ?? "",
          max_amount: String(f.max_amount ?? "").trim(),
          max_litres: String(f.max_litres ?? "").trim(),
          max_count: f.period === "TRANSACTION" || !f.max_count ? 0 : Number(f.max_count),
          products: f.products ?? [],
          products_except: Boolean(f.products_except),
          stations: String(f.stations ?? "")
            .split(",")
            .map((s) => Number(s.trim()))
            .filter(Boolean),
          stations_except: Boolean(f.stations_except),
          notes: String(f.notes ?? "").trim(),
        })}
        factsOf={(r) => [
          [L("name"), txt(r.name)],
          [L("Applies to"), `${L(r.scope_type === "CUSTOMER" ? "Whole fleet" : words(r.scope_type))}${r.scope_name && r.scope_type !== "CUSTOMER" ? `: ${r.scope_name}` : ""}`],
          [L("period"), words(r.period)],
          [L("valid_from"), txt(r.valid_from)],
          [L("valid_to"), txt(r.valid_to)],
          [L("max_amount"), txt(r.max_amount && num(r.max_amount))],
          [L("max_litres"), r.max_litres == null || r.max_litres === "" ? "—" : `${num(r.max_litres)} L`],
          [L("max_count"), txt(r.max_count)],
          [L("products"), `${r.products_except ? `${L("All but")} ` : ""}${(r.products ?? []).join(", ") || L("Every product")}`],
          [L("Stations"), `${r.stations_except ? `${L("All but")} ` : ""}${(r.stations ?? []).join(", ") || L("Every station")}`],
          [L("notes"), txt(r.notes)],
        ]}
        detailExtra={(r) => (r.status === "ACTIVE" ? <LimitUsage id={r.id} /> : null)}
      />
      {trying && <TryFill onClose={() => setTrying(false)} />}
    </>
  );
}
