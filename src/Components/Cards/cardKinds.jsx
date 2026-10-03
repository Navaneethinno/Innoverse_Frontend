import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, CreditCard, Hash, Layers, Plus, X } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { cardBinsApi, cardProductsApi, issuanceGroupsApi } from "@/Services/Cards/cards.api";
import { cn } from "@/Utils/Lib/utils";
import { Section, dayDate, labelClass } from "../TermDeposits/depositShared";
import { Field, loanLabel } from "../Loans/loanShared";
import { pickOptions } from "./CardSetup";
import { CardFace } from "./Operations/cardOpsShared";

// What differs between the three CARDS screens: the api, list columns, the
// facts a view shows, the form, the body sent, the fields fixed once added
// and what a draft / a submit needs first (an i18n key, or "").

const yes = (t, v) => t(v ? "yes" : "no");
const id = (v) => (v ? String(v) : "");
const num = (v) => Number(v) || 0;
const codes = (list) => (list ?? []).map((o) => (typeof o === "object" ? { value: o.code, label: o.name } : o));
const CODE = /^[A-Z0-9_]+$/;
const upperCode = (v) => v.toUpperCase().replace(/[^A-Z0-9_]/g, "");

function F({ label, hint, warn, span, children }) {
  return (
    <label className={cn(labelClass, span)}>
      {label}
      {children}
      {(warn || hint) && <span className={cn("mt-1 block text-[11px] font-normal", warn ? "font-semibold text-amber-700" : "text-muted-foreground")}>{warn || hint}</span>}
    </label>
  );
}

function Switch({ label, hint, value, onChange, disabled }) {
  return (
    <label className={cn(labelClass, "flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2")}>
      <span>
        {label}
        {hint && <span className="block text-[11px] font-normal text-muted-foreground">{hint}</span>}
      </span>
      <Field field={{ type: "bool", label }} value={value} disabled={disabled} onChange={onChange} />
    </label>
  );
}

const grid = "grid gap-3 md:grid-cols-2 lg:grid-cols-3";

// ---------------------------------------------------------------- BINs ----

function BinForm({ values: v, set, options, locked }) {
  const { t } = useTranslation("cards");
  const after = num(v.pan_length) - String(v.bin_code ?? "").length;
  // The card as it will read: the BIN, then the rest of the length as dots,
  // in groups of four.
  const length = Math.min(19, Math.max(13, num(v.pan_length) || 16));
  const digits = String(v.bin_code ?? "").padEnd(length, "•").slice(0, length);
  const network = codes(options.networks).find((n) => n.value === v.network_code);
  const preview = { pan_masked: digits.replace(/(.{4})(?=.)/g, "$1 "), network_code: network?.label ?? v.network_code, product_code: t("binPreview"), form_factor: "PHYSICAL", name_on_card: t("binPreviewName"), expiry: "MM/YY", ops_status: "ACTIVE" };
  return (
    <Section title={t("groupBin")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className={cn(grid, "flex-1 lg:grid-cols-2")}>
          <F label={t("binCode")} hint={!locked && t("fixedOnceAdded")}>
            <Field field={{ placeholder: "498765" }} disabled={locked} value={v.bin_code} onChange={(x) => set({ bin_code: x.replace(/\D/g, "").slice(0, 12) })} />
          </F>
          <F label={t("network")} hint={!locked && t("fixedOnceAdded")}>
            <Field field={{ type: "select", blank: t("choose"), options: codes(options.networks) }} disabled={locked} value={v.network_code} onChange={(x) => set({ network_code: x })} />
          </F>
          <F label={t("panLength")} hint={t("panLengthHint")} warn={v.bin_code && after < 7 && t("panTooShort", { count: after })}>
            <Field field={{ type: "int" }} value={v.pan_length} onChange={(x) => set({ pan_length: x.slice(0, 2) })} />
          </F>
          <F label={t("serviceCode")} hint={t("serviceCodeHint")}>
            <Field field={{ type: "int" }} value={v.service_code} onChange={(x) => set({ service_code: x.slice(0, 3) })} />
          </F>
          <F label={t("description")} span="md:col-span-2">
            <Field field={{}} value={v.description} onChange={(x) => set({ description: x.slice(0, 255) })} />
          </F>
        </div>
        <CardFace card={preview} className="mx-auto shrink-0 lg:mx-0 lg:w-72" />
      </div>
    </Section>
  );
}

export const binKind = {
  api: cardBinsApi,
  icon: Hash,
  title: "binsTitle",
  subtitle: "binsSubtitle",
  newLabel: "newBin",
  backLabel: "backToBins",
  nameLabel: "bin",
  searchHint: "searchBins",
  noneTitle: "noBins",
  noneHint: "noBinsHint",
  fixed: ["bin_code", "network_code"],
  columns: (t) => [
    { key: "network", label: t("network"), render: (r) => <span className="text-xs font-semibold">{r.summary?.network_code}</span> },
    { key: "pan_length", label: t("panLength"), render: (r) => <span className="text-xs">{r.summary?.pan_length}</span> },
    { key: "service_code", label: t("serviceCode"), render: (r) => <span className="font-mono text-xs">{r.summary?.service_code}</span> },
  ],
  headline: (t, s) => [s.network_code, s.pan_length && t("digitsN", { count: Number(s.pan_length) })],
  facts: (t, c) => [["groupBin", [[t("binCode"), c.bin_code], [t("network"), c.network_code], [t("panLength"), c.pan_length], [t("serviceCode"), c.service_code], [t("description"), c.description]]]],
  initial: (o, c) => ({ ...o.defaults, ...(c ?? {}), pan_length: String((c ?? o.defaults)?.pan_length ?? 16) }),
  toBody: (v) => ({ bin_code: v.bin_code ?? "", network_code: v.network_code ?? "", pan_length: num(v.pan_length), service_code: v.service_code ?? "", description: v.description ?? "" }),
  missing: (v) => (!/^\d{6,12}$/.test(v.bin_code ?? "") ? "needBinCode" : !v.network_code ? "needNetwork" : ""),
  Form: BinForm,
};

// ------------------------------------------------------- Card Products ----

function ProductForm({ values: v, set, options, locked }) {
  const { t } = useTranslation("cards");
  const prepaid = v.product_class === "PREPAID";
  const currency = options.currencies?.find((c) => String(c.id) === String(v.currency_id));
  const decimals = Number(currency?.extra ?? 2);
  const purses = (options.purse_products ?? []).filter((p) => !v.currency_id || String(p.currency_id) === String(v.currency_id));
  const dp = options.digital_products?.find((d) => String(d.id) === String(v.digital_product_id));
  const physical = (v.allowed_form_factors ?? []).includes("PHYSICAL");
  const pin = v.pin_policy ?? {};
  const pp = v.prepaid ?? {};
  const setPin = (patch) => set({ pin_policy: { ...pin, ...patch } });
  const setPp = (patch) => set({ prepaid: { ...pp, ...patch } });
  // The defaults follow what is allowed; personalised and plastic-only
  // choices go when physical cards do.
  const setFactors = (list) => {
    const perso = list.includes("PHYSICAL") ? v.allowed_perso_modes : (v.allowed_perso_modes ?? []).filter((m) => m !== "PERSONALIZED");
    set({
      allowed_form_factors: list,
      default_form_factor: list.includes(v.default_form_factor) ? v.default_form_factor : (list[0] ?? ""),
      allowed_perso_modes: perso,
      default_perso_mode: perso.includes(v.default_perso_mode) ? v.default_perso_mode : (perso[0] ?? ""),
      ...(list.includes("PHYSICAL") ? {} : { allow_virtual_to_physical: false }),
    });
  };
  const setPerso = (list) => set({ allowed_perso_modes: list, default_perso_mode: list.includes(v.default_perso_mode) ? v.default_perso_mode : (list[0] ?? "") });

  return (
    <>
      <Section title={t("groupProduct")}>
        <div className={grid}>
          <F label={t("productCode")} hint={!locked && t("fixedOnceAdded")}>
            <Field field={{ placeholder: "GOLD_PREPAID" }} disabled={locked} value={v.product_code} onChange={(x) => set({ product_code: upperCode(x) })} />
          </F>
          <F label={t("productClass")} hint={!locked && t("creditLater")}>
            <Field
              field={{ type: "select", blank: t("choose"), options: codes(options.product_classes) }}
              disabled={locked}
              value={v.product_class}
              onChange={(x) => set({ product_class: x, prepaid: x === "PREPAID" ? (v.prepaid ?? { ...options.prepaid_defaults }) : null })}
            />
          </F>
          <F label={t("bin")}>
            <Field field={{ type: "select", blank: options.bins?.length ? t("choose") : t("noBinsYet"), options: pickOptions(options.bins) }} disabled={locked} value={id(v.bin_id)} onChange={(x) => set({ bin_id: x })} />
          </F>
          <F label={t("currency")}>
            <Field field={{ type: "select", blank: t("choose"), options: (options.currencies ?? []).map((c) => ({ value: String(c.id), label: `${c.code} · ${c.name}` })) }} disabled={locked} value={id(v.currency_id)} onChange={(x) => set({ currency_id: x, linked_acct_product_id: "" })} />
          </F>
          {prepaid && (
            <F label={t("purseProduct")} hint={t("purseProductHint")}>
              <Field field={{ type: "select", blank: purses.length ? t("choose") : t("noPurseProduct"), options: pickOptions(purses) }} value={id(v.linked_acct_product_id)} onChange={(x) => set({ linked_acct_product_id: x })} />
            </F>
          )}
          <F label={t("productName")}>
            <Field field={{}} value={v.product_name} onChange={(x) => set({ product_name: x.slice(0, 150) })} />
          </F>
          <F label={t("digitalProduct")} hint={dp && t("dpAllowsN", { count: Number(dp.extra ?? 1) })}>
            <Field field={{ type: "select", blank: t("choose"), options: pickOptions(options.digital_products) }} value={id(v.digital_product_id)} onChange={(x) => set({ digital_product_id: x })} />
          </F>
          <F label={t("effectiveFrom")} hint={t("effectiveFromHint")}>
            <Field field={{ type: "date" }} value={v.effective_from} onChange={(x) => set({ effective_from: x })} />
          </F>
          <F label={t("effectiveTo")} hint={t("effectiveToHint")}>
            <Field field={{ type: "date" }} value={v.effective_to} onChange={(x) => set({ effective_to: x })} />
          </F>
          <F label={t("description")} span="md:col-span-2 lg:col-span-3">
            <Field field={{}} value={v.description} onChange={(x) => set({ description: x })} />
          </F>
        </div>
      </Section>

      <Section title={t("groupCards")}>
        <div className={grid}>
          <F label={t("formFactors")}>
            <Field field={{ type: "multi", options: codes(options.form_factors) }} value={v.allowed_form_factors} onChange={setFactors} />
          </F>
          <F label={t("defaultFormFactor")}>
            <Field field={{ type: "select", options: codes(options.form_factors).filter((o) => (v.allowed_form_factors ?? []).includes(o.value)) }} value={v.default_form_factor} onChange={(x) => set({ default_form_factor: x })} />
          </F>
          <F label={t("activationMode")} hint={t(`activationHint_${v.activation_mode}`, { defaultValue: "" })}>
            <Field field={{ type: "select", options: options.activation_modes }} value={v.activation_mode} onChange={(x) => set({ activation_mode: x })} />
          </F>
          <F label={t("persoModes")} hint={!physical && t("personalisedNeedsPhysical")}>
            <Field field={{ type: "multi", options: codes(options.perso_modes).filter((o) => physical || o.value !== "PERSONALIZED") }} value={v.allowed_perso_modes} onChange={setPerso} />
          </F>
          <F label={t("defaultPersoMode")}>
            <Field field={{ type: "select", options: codes(options.perso_modes).filter((o) => (v.allowed_perso_modes ?? []).includes(o.value)) }} value={v.default_perso_mode} onChange={(x) => set({ default_perso_mode: x })} />
          </F>
          <F label={t("expiryMonths")} hint={t("expiryMonthsHint")}>
            <Field field={{ type: "int" }} value={v.expiry_months} onChange={(x) => set({ expiry_months: x.slice(0, 3) })} />
          </F>
          <F label={t("maxCardsPerCustomer")} hint={dp ? t("dpAllowsN", { count: Number(dp.extra ?? 1) }) : t("maxCardsHint")}>
            <Field field={{ type: "int" }} value={v.max_cards_per_customer} onChange={(x) => set({ max_cards_per_customer: x.slice(0, 3) })} />
          </F>
          <F label={t("renewalNoticeDays")} hint={t("renewalNoticeHint")}>
            <Field field={{ type: "int" }} value={v.renewal_notice_days} onChange={(x) => set({ renewal_notice_days: x.slice(0, 3) })} />
          </F>
          <F label={t("unactivatedCloseDays")} hint={t("unactivatedCloseHint")}>
            <Field field={{ type: "int" }} value={v.unactivated_close_days} onChange={(x) => set({ unactivated_close_days: x.slice(0, 4) })} />
          </F>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <Switch label={t("embossNameRequired")} value={v.emboss_name_required} onChange={(x) => set({ emboss_name_required: x })} />
          <Switch label={t("allowVirtualToPhysical")} hint={!physical && t("needsPhysical")} disabled={!physical} value={v.allow_virtual_to_physical} onChange={(x) => set({ allow_virtual_to_physical: x })} />
          <Switch label={t("allowAddon")} value={v.allow_addon} onChange={(x) => set({ allow_addon: x })} />
          <Switch label={t("allowReissue")} value={v.allow_reissue} onChange={(x) => set({ allow_reissue: x })} />
        </div>
      </Section>

      <Section title={t("groupPin")}>
        <div className={grid}>
          <F label={t("pinLength")} hint={t("betweenXY", { min: options.pin_length?.min ?? 4, max: options.pin_length?.max ?? 12 })}>
            <Field field={{ type: "int" }} value={pin.length} onChange={(x) => setPin({ length: x.slice(0, 2) })} />
          </F>
          <F label={t("pinMaxTries")} hint={t("betweenXY", { min: 1, max: options.pin_max_tries ?? 10 })}>
            <Field field={{ type: "int" }} value={pin.max_tries} onChange={(x) => setPin({ max_tries: x.slice(0, 2) })} />
          </F>
          <div className="self-end">
            <Switch label={t("pinAllowChange")} value={pin.allow_change} onChange={(x) => setPin({ allow_change: x })} />
          </div>
        </div>
      </Section>

      {prepaid && (
        <Section title={t("groupPrepaid")}>
          <div className="mb-3 grid gap-2 md:grid-cols-2">
            <Switch label={t("reloadable")} value={pp.is_reloadable} onChange={(x) => setPp({ is_reloadable: x, ...(x ? { is_single_use: false } : {}) })} />
            <Switch label={t("singleUse")} hint={t("singleUseHint")} value={pp.is_single_use} onChange={(x) => setPp({ is_single_use: x, ...(x ? { is_reloadable: false } : {}) })} />
          </div>
          <div className={cn(grid, "lg:grid-cols-4")}>
            <F label={t("preloadAmount")} hint={t("preloadHint")}>
              <Field field={{ type: "amount" }} decimals={decimals} value={pp.preload_amount} onChange={(x) => setPp({ preload_amount: x })} />
            </F>
            <F label={t("minLoad")}>
              <Field field={{ type: "amount" }} decimals={decimals} value={pp.min_load_amount} onChange={(x) => setPp({ min_load_amount: x })} />
            </F>
            <F label={t("maxLoad")} hint={t("zeroNoLimit")}>
              <Field field={{ type: "amount" }} decimals={decimals} value={pp.max_load_amount} onChange={(x) => setPp({ max_load_amount: x })} />
            </F>
            <F label={t("balanceOnExpiry")}>
              <Field field={{ type: "select", options: options.balance_on_expiry_actions }} value={pp.balance_on_expiry_action} onChange={(x) => setPp({ balance_on_expiry_action: x })} />
            </F>
          </div>
        </Section>
      )}
      <p className="text-xs text-muted-foreground">{t("feesAndLimitsElsewhere")}</p>
    </>
  );
}

const productBody = (v) => {
  const prepaid = v.product_class === "PREPAID";
  const pin = v.pin_policy ?? {};
  const pp = v.prepaid ?? {};
  const amount = (x) => String(x ?? "").trim() || "0";
  return {
    product_code: v.product_code ?? "",
    product_class: v.product_class ?? "",
    bin_id: num(v.bin_id),
    currency_id: num(v.currency_id),
    product_name: v.product_name ?? "",
    description: v.description ?? "",
    ...(prepaid ? { linked_acct_product_id: num(v.linked_acct_product_id) } : {}),
    digital_product_id: num(v.digital_product_id),
    allowed_form_factors: v.allowed_form_factors ?? [],
    default_form_factor: v.default_form_factor ?? "",
    allowed_perso_modes: v.allowed_perso_modes ?? [],
    default_perso_mode: v.default_perso_mode ?? "",
    emboss_name_required: Boolean(v.emboss_name_required),
    activation_mode: v.activation_mode ?? "",
    expiry_months: num(v.expiry_months),
    allow_virtual_to_physical: Boolean(v.allow_virtual_to_physical),
    allow_addon: Boolean(v.allow_addon),
    allow_reissue: Boolean(v.allow_reissue),
    max_cards_per_customer: num(v.max_cards_per_customer),
    renewal_notice_days: num(v.renewal_notice_days),
    unactivated_close_days: num(v.unactivated_close_days),
    pin_policy: { length: num(pin.length), allow_change: Boolean(pin.allow_change), max_tries: num(pin.max_tries) },
    effective_from: v.effective_from ?? "",
    effective_to: v.effective_to ?? "",
    ...(prepaid
      ? {
          prepaid: {
            is_reloadable: Boolean(pp.is_reloadable),
            is_single_use: Boolean(pp.is_single_use),
            preload_amount: amount(pp.preload_amount),
            min_load_amount: amount(pp.min_load_amount),
            max_load_amount: amount(pp.max_load_amount),
            balance_on_expiry_action: pp.balance_on_expiry_action ?? "",
          },
        }
      : {}),
  };
};

export const productKind = {
  api: cardProductsApi,
  icon: CreditCard,
  title: "productsTitle",
  subtitle: "productsSubtitle",
  newLabel: "newProduct",
  backLabel: "backToProducts",
  nameLabel: "product",
  searchHint: "searchProducts",
  noneTitle: "noProducts",
  noneHint: "noProductsHint",
  filter: { key: "bin_id", from: "bins", any: "anyBin" },
  fixed: ["product_code", "product_class", "bin_id", "currency_id"],
  columns: (t) => [
    { key: "class", label: t("productClass"), render: (r) => <span className="text-xs font-semibold">{loanLabel(t, r.summary?.product_class)}</span> },
    { key: "bin", label: t("bin"), render: (r) => <span className="whitespace-nowrap text-xs">{[r.summary?.bin_code, r.summary?.network_code].filter(Boolean).join(" · ")}</span> },
    { key: "currency", label: t("currency"), render: (r) => <span className="text-xs font-semibold">{r.summary?.currency_code}</span> },
  ],
  headline: (t, s) => [loanLabel(t, s.product_class), [s.bin_code, s.network_code].filter(Boolean).join(" "), s.currency_code],
  facts: (t, c, refs) => {
    const pin = c.pin_policy ?? {};
    const pp = c.prepaid;
    const list = (xs) => (xs ?? []).map((x) => loanLabel(t, x)).join(", ");
    return [
      ["groupProduct", [
        [t("productName"), c.product_name],
        [t("productClass"), loanLabel(t, c.product_class)],
        [t("bin"), [refs.bin_code, refs.network_code].filter(Boolean).join(" · ") || c.bin_id],
        [t("currency"), refs.currency_code ?? c.currency_id],
        [t("digitalProduct"), refs.digital_product_name ?? c.digital_product_id],
        ...(c.product_class === "PREPAID" ? [[t("purseProduct"), refs.linked_acct_product_name ?? c.linked_acct_product_id]] : []),
        [t("effective"), c.effective_to ? `${dayDate(c.effective_from)} – ${dayDate(c.effective_to)}` : dayDate(c.effective_from)],
        [t("description"), c.description],
      ]],
      ["groupCards", [
        [t("formFactors"), list(c.allowed_form_factors)],
        [t("defaultFormFactor"), loanLabel(t, c.default_form_factor)],
        [t("persoModes"), list(c.allowed_perso_modes)],
        [t("defaultPersoMode"), loanLabel(t, c.default_perso_mode)],
        [t("activationMode"), loanLabel(t, c.activation_mode)],
        [t("expiryMonths"), c.expiry_months],
        [t("maxCardsPerCustomer"), c.max_cards_per_customer],
        [t("renewalNoticeDays"), Number(c.renewal_notice_days) ? t("daysN", { count: Number(c.renewal_notice_days) }) : t("never")],
        [t("unactivatedCloseDays"), Number(c.unactivated_close_days) ? t("daysN", { count: Number(c.unactivated_close_days) }) : t("never")],
        [t("embossNameRequired"), yes(t, c.emboss_name_required)],
        [t("allowVirtualToPhysical"), yes(t, c.allow_virtual_to_physical)],
        [t("allowAddon"), yes(t, c.allow_addon)],
        [t("allowReissue"), yes(t, c.allow_reissue)],
      ]],
      ["groupPin", [
        [t("pinLength"), pin.length],
        [t("pinMaxTries"), pin.max_tries],
        [t("pinAllowChange"), yes(t, pin.allow_change)],
      ]],
      ...(pp
        ? [["groupPrepaid", [
            [t("reloadable"), yes(t, pp.is_reloadable)],
            [t("singleUse"), yes(t, pp.is_single_use)],
            [t("preloadAmount"), pp.preload_amount],
            [t("minLoad"), pp.min_load_amount],
            [t("maxLoad"), Number(pp.max_load_amount) ? pp.max_load_amount : t("noLimit")],
            [t("balanceOnExpiry"), loanLabel(t, pp.balance_on_expiry_action)],
          ]]]
        : []),
    ];
  },
  initial: (o, c) => {
    const v = { ...o.defaults, ...(c ?? {}) };
    return {
      ...v,
      bin_id: id(v.bin_id),
      currency_id: id(v.currency_id),
      linked_acct_product_id: id(v.linked_acct_product_id),
      digital_product_id: id(v.digital_product_id),
      pin_policy: { ...(o.defaults?.pin_policy ?? {}), ...(v.pin_policy ?? {}) },
      prepaid: v.product_class === "PREPAID" ? { ...(o.prepaid_defaults ?? {}), ...(v.prepaid ?? {}) } : null,
    };
  },
  toBody: productBody,
  missing: (v, { draft }) => {
    if (!CODE.test(v.product_code ?? "")) return "needProductCode";
    if (!v.product_class) return "needProductClass";
    if (!v.bin_id) return "needBin";
    if (!v.currency_id) return "needCurrency";
    if (v.product_class === "PREPAID" && !v.linked_acct_product_id) return "needPurse";
    if (draft) return "";
    if (!String(v.product_name ?? "").trim()) return "needProductName";
    if (!v.digital_product_id) return "needDigitalProduct";
    if (!v.allowed_form_factors?.length) return "needFormFactor";
    if (!v.allowed_perso_modes?.length) return "needPersoMode";
    return "";
  },
  Form: ProductForm,
};

// ----------------------------------------------------- Issuance Groups ----

const DELIMITER_KEYS = { ",": "delim_comma", ";": "delim_semicolon", "|": "delim_pipe", "\t": "delim_tab" };

// The emboss file's columns, in order: move, remove, add from the rest.
// A move slides the rows to their new places (FLIP) and lights up the one
// that moved; an added column fades in.
function EmbossColumns({ value, all, onChange }) {
  const { t } = useTranslation("cards");
  const rows = useRef(new Map());
  const before = useRef(null);
  const [moved, setMoved] = useState(null);
  const remember = () => {
    before.current = new Map([...rows.current].map(([col, el]) => [col, el.getBoundingClientRect().top]));
  };
  const move = (i, d) => {
    remember();
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setMoved(value[i]);
    onChange(next);
  };
  useLayoutEffect(() => {
    const was = before.current;
    before.current = null;
    if (!was || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    for (const [col, el] of rows.current) {
      const top = was.get(col);
      if (top == null) el.animate([{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: "ease-out" });
      else if (top !== el.getBoundingClientRect().top) el.animate([{ transform: `translateY(${top - el.getBoundingClientRect().top}px)` }, { transform: "none" }], { duration: 260, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
    }
  }, [value]);
  const rest = (all ?? []).filter((c) => !value.includes(c));
  return (
    <div className="grid gap-2">
      <ol className="grid gap-1.5">
        {value.map((col, i) => (
          <li
            key={moved === col ? `${col}:moved:${i}` : col}
            ref={(el) => (el ? rows.current.set(col, el) : rows.current.delete(col))}
            className={cn("relative flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold", moved === col && "field-flash")}
          >
            <span className="w-5 text-muted-foreground">{i + 1}.</span>
            <span className="min-w-0 flex-1 font-mono">{col}</span>
            <ActionIconButton label={t("moveUp")} icon={ArrowUp} disabled={i === 0} onClick={() => move(i, -1)} />
            <ActionIconButton label={t("moveDown")} icon={ArrowDown} disabled={i === value.length - 1} onClick={() => move(i, 1)} />
            <ActionIconButton label={t("remove")} intent="delete" icon={X} onClick={() => {
                remember();
                onChange(value.filter((c) => c !== col));
              }} />
          </li>
        ))}
        {!value.length && <li className="text-xs text-muted-foreground">{t("noColumns")}</li>}
      </ol>
      {rest.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Plus size={13} className="text-muted-foreground" />
          {rest.map((col) => (
            <button key={col} type="button" onClick={() => {
                remember();
                onChange([...value, col]);
              }} className="rounded-full border border-dashed border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              {col}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupForm({ values: v, set, options, locked }) {
  const { t } = useTranslation("cards");
  const layout = v.emboss_layout ?? {};
  const setLayout = (patch) => set({ emboss_layout: { ...layout, ...patch } });
  return (
    <>
      <Section title={t("groupGroup")}>
        <div className={grid}>
          <F label={t("groupCode")} hint={!locked && t("fixedOnceAdded")}>
            <Field field={{ placeholder: "BRANCH_STOCK" }} disabled={locked} value={v.code} onChange={(x) => set({ code: upperCode(x) })} />
          </F>
          <F label={t("product")} hint={!locked && t("physicalProductsOnly")}>
            <Field field={{ type: "select", blank: options.card_products?.length ? t("choose") : t("noPhysicalProducts"), options: pickOptions(options.card_products) }} disabled={locked} value={id(v.card_product_id)} onChange={(x) => set({ card_product_id: x })} />
          </F>
          <F label={t("groupName")}>
            <Field field={{}} value={v.name} onChange={(x) => set({ name: x.slice(0, 128) })} />
          </F>
          <F label={t("defaultPersoMode")} hint={t(`persoHint_${v.default_perso_mode}`, { defaultValue: "" })}>
            <Field field={{ type: "select", options: codes(options.perso_modes) }} value={v.default_perso_mode} onChange={(x) => set({ default_perso_mode: x })} />
          </F>
          <F label={t("formFactor")} hint={t("groupsArePhysical")}>
            <Field field={{}} disabled value={loanLabel(t, "PHYSICAL")} onChange={() => {}} />
          </F>
          <F label={t("description")}>
            <Field field={{}} value={v.description} onChange={(x) => set({ description: x })} />
          </F>
        </div>
      </Section>
      <Section title={t("embossLayout")}>
        <p className="mb-3 text-xs text-muted-foreground">{t("embossHint")}</p>
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <div className="grid content-start gap-3">
            <F label={t("delimiter")}>
              <FilterSelect className="mt-1" value={layout.delimiter ?? ","} onChange={(x) => setLayout({ delimiter: x })} options={(options.emboss_delimiters ?? []).map((d) => ({ value: d, label: t(DELIMITER_KEYS[d] ?? "delim_other", { value: d }) }))} />
            </F>
            <Switch label={t("headerLine")} hint={t("headerLineHint")} value={layout.header} onChange={(x) => setLayout({ header: x })} />
          </div>
          <F label={t("columns")}>
            <div className="mt-1">
              <EmbossColumns value={layout.columns ?? []} all={options.emboss_columns} onChange={(columns) => setLayout({ columns })} />
            </div>
          </F>
        </div>
      </Section>
    </>
  );
}

export const groupKind = {
  api: issuanceGroupsApi,
  icon: Layers,
  title: "groupsTitle",
  subtitle: "groupsSubtitle",
  newLabel: "newGroup",
  backLabel: "backToGroups",
  nameLabel: "group",
  searchHint: "searchGroups",
  noneTitle: "noGroups",
  noneHint: "noGroupsHint",
  filter: { key: "card_product_id", from: "card_products", any: "anyProduct" },
  fixed: ["code", "card_product_id"],
  columns: (t) => [
    { key: "product", label: t("product"), render: (r) => <span className="text-xs font-semibold">{r.summary?.card_product_code}</span> },
    { key: "perso", label: t("defaultPersoMode"), render: (r) => <span className="text-xs">{loanLabel(t, r.summary?.default_perso_mode)}</span> },
  ],
  headline: (t, s) => [s.card_product_code, loanLabel(t, s.default_perso_mode)],
  facts: (t, c, refs) => {
    const layout = c.emboss_layout ?? {};
    return [
      ["groupGroup", [
        [t("groupName"), c.name],
        [t("product"), [refs.card_product_code, refs.card_product_name].filter(Boolean).join(" · ") || c.card_product_id],
        [t("formFactor"), loanLabel(t, c.default_form_factor)],
        [t("defaultPersoMode"), loanLabel(t, c.default_perso_mode)],
        [t("description"), c.description],
      ]],
      ["embossLayout", [
        [t("delimiter"), t(DELIMITER_KEYS[layout.delimiter] ?? "delim_other", { value: layout.delimiter })],
        [t("headerLine"), yes(t, layout.header)],
        [t("columns"), (layout.columns ?? []).join(", ")],
      ]],
    ];
  },
  initial: (o, c) => {
    const v = { ...o.defaults, ...(c ?? {}) };
    return { ...v, card_product_id: id(v.card_product_id), emboss_layout: { ...(o.defaults?.emboss_layout ?? {}), ...(v.emboss_layout ?? {}) } };
  },
  toBody: (v) => ({
    code: v.code ?? "",
    card_product_id: num(v.card_product_id),
    name: v.name ?? "",
    description: v.description ?? "",
    default_form_factor: "PHYSICAL",
    default_perso_mode: v.default_perso_mode ?? "",
    emboss_layout: { delimiter: v.emboss_layout?.delimiter ?? ",", header: Boolean(v.emboss_layout?.header), columns: v.emboss_layout?.columns ?? [] },
  }),
  missing: (v, { draft }) => {
    if (!CODE.test(v.code ?? "")) return "needGroupCode";
    if (!v.card_product_id) return "needProduct";
    if (draft) return "";
    if (!String(v.name ?? "").trim()) return "needGroupName";
    if (!v.emboss_layout?.columns?.length) return "needColumns";
    return "";
  },
  Form: GroupForm,
};
