import { useCallback, useEffect, useState } from "react";
import { CONFIGS, DigitalProductFieldInput } from "./digitalProductFields";
import { DIGITAL_PRODUCT_STEPS } from "./digitalProductSteps";
import { splitFieldsIntoColumns } from "@/Utils/Lib/formFieldColumns";
import { digitalProductApi } from "@/Services/DigitalProduct/digitalProduct.api";
import { useActiveInstitutionsQuery } from "@/Hooks/Institutions/institutionHooks";
import { useChannels, useTransactions, useResidencyTypes } from "@/Hooks/Master/masterHooks";
import { configKycApi } from "@/Services/Config/config.api";
import { notifications } from "@/Utils/Lib/notifications";

// Shared between AddDigitalProductWizard.jsx, EditDigitalProductWizard.jsx
// and ViewDigitalProductWizard.jsx — everything here is pure step/field
// plumbing with no add-vs-edit-vs-view opinion, so all three wizards behave
// identically at the field/dropdown level and only differ in how they load
// initial values and what (if anything) happens on Next/Save.
//
// The real backend collapses all 9 wizard steps into ONE record
// (`/digital_product/product/*`): step 0 is the product's own basic
// fields, every other step is a `sections` entry nested inside that same
// product's add/edit/get payload — see the API reference the backend team
// shared. kyc_level/channel_transaction/residency aren't sections in their
// own right; they nest one level deeper, inside kyc_config/channel_config/
// eligibility_config respectively (see DIGITAL_PRODUCT_STEPS.parentEntity
// and buildSectionEditPayload below).

const productApi = () => digitalProductApi("product");
export const rowsOf = (r) => (Array.isArray(r?.data) ? r.data : (r?.data?.data ?? []));
const firstOf = (r) => (Array.isArray(r) ? r[0] : r);

export function emptyValuesFor(entity) {
  return Object.fromEntries(CONFIGS[entity].fields.map(([key, , type]) => [key, type === "boolean" ? false : ""]));
}

function pickFields(entity, record) {
  return Object.fromEntries(CONFIGS[entity].fields.map(([key, , type]) => [key, record?.[key] ?? (type === "boolean" ? false : "")]));
}

// Which step, if any, a given step's section nests INSIDE on the real API
// (kyc_level -> kyc_config, channel_transaction -> channel_config,
// residency -> eligibility_config); every other non-product step is its
// own top-level `sections` key.
const PARENT_SECTION = { kyc_level: "kyc_config", channel_transaction: "channel_config", residency: "eligibility_config" };
// The nested child key a section entity carries, if any (the reverse of
// PARENT_SECTION), and whether that section is sent as an array or a
// single object — both fixed by the API reference, not guessable per-entity.
const CHILD_OF_SECTION = { kyc_config: "kyc_level", channel_config: "channel_transaction", eligibility_config: "residency" };
const ARRAY_SECTIONS = new Set(["product_map", "channel_config"]);

// Whether a step actually has data — used both to decide what to send in
// buildSectionEditPayload and (exported as isStepConfigured) to decide
// whether ViewDigitalProductWizard/the stepper should treat a step as
// "done". A staged (pending_payload) section never carries an id of its
// own until it's authorized, so checking recordIds alone would wrongly
// show a fully-filled-in-but-still-pending step as unconfigured.
export function isStepConfigured(entity, values) {
  return CONFIGS[entity].fields.some(([key]) => {
    const v = values[entity][key];
    return v !== "" && v != null && v !== false;
  });
}

// Wizard field state keeps "" for an untouched text/number field (a
// controlled input needs a defined string, not null/undefined) — but the
// API should see an actual "nothing entered" rather than a literal empty
// string, so this is only ever converted at the point a payload is built.
function pickPayload(entity, values) {
  return Object.fromEntries(
    CONFIGS[entity].fields.map(([key]) => [key, values[entity][key] === "" ? null : values[entity][key]]),
  );
}

// Builds the `sections` object for ONE wizard step's edit call — only the
// section the user is actually on, per the API's own rule that omitting a
// section entirely leaves it untouched. `entity` may be a nested step
// (kyc_level/channel_transaction/residency), in which case this reaches up
// to its parent section automatically so the nested array lands in the
// right place.
export function buildSectionEditPayload(entity, values, recordIds) {
  const targetEntity = PARENT_SECTION[entity] ?? entity;
  const childEntity = CHILD_OF_SECTION[targetEntity];
  const built = { ...pickPayload(targetEntity, values), ...(recordIds[targetEntity] ? { id: recordIds[targetEntity] } : {}) };
  if (childEntity && isStepConfigured(childEntity, values)) {
    built[childEntity] = [{ ...pickPayload(childEntity, values), ...(recordIds[childEntity] ? { id: recordIds[childEntity] } : {}) }];
  }
  return { [targetEntity]: ARRAY_SECTIONS.has(targetEntity) ? [built] : built };
}

// The product's own basic fields, as sent on every add/edit call — the API
// merges `sections` incrementally but expects code/name/description/etc.
// resent every time (they aren't a section).
export function buildProductBasicPayload(values) {
  return pickPayload("product", values);
}

// Loads the full existing tree for `product` via a single `/get` call —
// handles both a live product (sections at the top level of the response)
// and a still-in-progress Draft (everything staged under `pending_payload`
// instead). Returned as `reload` too, so callers can re-sync recordIds
// after a step is saved (the add/edit responses don't echo back the ids of
// newly-created section rows, so re-fetching is the only reliable way to
// learn them before the next nested step needs them).
export function useDigitalProductExistingData(product) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(DIGITAL_PRODUCT_STEPS.map((step) => [step.entity, emptyValuesFor(step.entity)])),
  );
  const [recordIds, setRecordIds] = useState(() =>
    Object.fromEntries(DIGITAL_PRODUCT_STEPS.map((step) => [step.entity, null])),
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await productApi().get({ id: product.id });
    const data = rowsOf(response)[0] ?? {};
    const p = data.product ?? product;
    const staged = p.pending_payload ?? {};

    const productMap = firstOf(data.product_map) ?? firstOf(staged.product_map);
    const securityConfig = data.security_config ?? staged.security_config;
    const kycConfig = data.kyc_config ?? staged.kyc_config;
    const kycLevel = firstOf(kycConfig?.kyc_level) ?? firstOf(staged.kyc_config?.kyc_level);
    const channelConfig = firstOf(data.channel_config) ?? firstOf(staged.channel_config);
    const channelTransaction =
      firstOf(channelConfig?.channel_transaction) ?? firstOf(firstOf(staged.channel_config)?.channel_transaction);
    const eligibilityConfig = data.eligibility_config ?? staged.eligibility_config;
    const residency = firstOf(eligibilityConfig?.residency) ?? firstOf(staged.eligibility_config?.residency);

    return {
      values: {
        product: pickFields("product", p),
        product_map: pickFields("product_map", productMap),
        security_config: pickFields("security_config", securityConfig),
        kyc_config: pickFields("kyc_config", kycConfig),
        kyc_level: pickFields("kyc_level", kycLevel),
        channel_config: pickFields("channel_config", channelConfig),
        channel_transaction: pickFields("channel_transaction", channelTransaction),
        eligibility_config: pickFields("eligibility_config", eligibilityConfig),
        residency: pickFields("residency", residency),
      },
      recordIds: {
        product: p.id ?? product.id,
        product_map: productMap?.id ?? null,
        security_config: securityConfig?.id ?? null,
        kyc_config: kycConfig?.id ?? null,
        kyc_level: kycLevel?.id ?? null,
        channel_config: channelConfig?.id ?? null,
        channel_transaction: channelTransaction?.id ?? null,
        eligibility_config: eligibilityConfig?.id ?? null,
        residency: residency?.id ?? null,
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const reload = useCallback(async () => {
    const next = await load();
    setValues(next.values);
    setRecordIds(next.recordIds);
    return next;
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .then((next) => {
        if (cancelled) return;
        setValues(next.values);
        setRecordIds(next.recordIds);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        notifications.error(e.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { values, setValues, recordIds, setRecordIds, loading, reload };
}

// Only step 0 (the product's own basic fields) is required up front — a
// real product can't be created without them. Every other step is
// genuinely optional per the API (only product_map + channel_config are
// required, and only at final Submit, which surfaces the backend's own
// "X, Y Required" message if something's missing) — so wizard Next/Save no
// longer blocks on incomplete optional sections; findMissingField is only
// ever called for entity === "product" now.
export function findMissingField(entity, values) {
  return CONFIGS[entity].fields.find(([key]) => {
    const isRequired = key.endsWith("_id") || ["code", "name"].includes(key);
    return isRequired && (values[key] === "" || values[key] == null);
  });
}

export function requiredFieldMessage([key, label]) {
  const verb = key.endsWith("_id") ? "select" : "enter";
  const article = /^[aeiou]/i.test(label) ? "an" : "a";
  return `Please ${verb} ${article} ${label.toLowerCase()}`;
}

// Exactly the dropdown sources DigitalProductResource.jsx's own Add/Edit
// forms use for these fields, gated by the CURRENT wizard step instead of a
// route entity — same API calls, same hooks, same error surfacing.
export function useDigitalProductLookups(currentEntity) {
  const { data: institutions = [], error: institutionsError } = useActiveInstitutionsQuery();
  const { channels = [], error: channelsError } = useChannels(currentEntity === "channel_config");
  const { transactions = [], error: transactionsError } = useTransactions(currentEntity === "channel_transaction");
  const { residencyTypes = [], error: residencyTypesError } = useResidencyTypes(currentEntity === "residency");
  const [accountProducts, setAccountProducts] = useState([]);
  const [kycGroups, setKycGroups] = useState([]);

  useEffect(() => {
    if (institutionsError) notifications.error(institutionsError.message);
  }, [institutionsError]);
  useEffect(() => {
    if (channelsError) notifications.error(channelsError.message);
  }, [channelsError]);
  useEffect(() => {
    if (transactionsError) notifications.error(transactionsError.message);
  }, [transactionsError]);
  useEffect(() => {
    if (residencyTypesError) notifications.error(residencyTypesError.message);
  }, [residencyTypesError]);
  useEffect(() => {
    if (currentEntity !== "product_map") return;
    configKycApi("acct_product")
      .getActive({ view: "dropdown" })
      .then((r) => setAccountProducts(rowsOf(r)))
      .catch((e) => notifications.error(e.message));
  }, [currentEntity]);
  useEffect(() => {
    if (currentEntity !== "kyc_config") return;
    configKycApi("kyc_group")
      .getActive({ view: "dropdown" })
      .then((r) => setKycGroups(rowsOf(r)))
      .catch((e) => notifications.error(e.message));
  }, [currentEntity]);

  return { institutions, accountProducts, kycGroups, channels, transactions, residencyTypes };
}

// The current step's field grid: two independent flex-column stacks, not a
// single 2-col CSS grid — a real grid pairs left/right cells into shared
// rows, so a tall field (a dropdown) next to a short one (a checkbox)
// forces the short cell's row to stretch to the tall one's height,
// stranding the checkbox with a large gap before the next row.
export function DigitalProductStepFields({ entity, values, onFieldChange, lookups, disabled = false }) {
  return (
    <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
      {splitFieldsIntoColumns(CONFIGS[entity].fields).map(
        (columnFields, columnIndex) => (
          <div key={columnIndex} className="flex flex-col gap-4">
            {columnFields.map(([key, label, type]) => (
              <label
                key={key}
                className={
                  type === "boolean"
                    ? "flex w-full items-center justify-between gap-2 text-sm font-semibold text-slate-700"
                    : "text-sm font-semibold text-slate-700"
                }
              >
                {type === "boolean" ? <span>{label}</span> : label}
                <DigitalProductFieldInput
                  fieldKey={key}
                  type={type}
                  value={values[key]}
                  onChange={(next) => onFieldChange(key, next)}
                  lookups={lookups}
                  disabled={disabled}
                />
              </label>
            ))}
          </div>
        ),
      )}
    </div>
  );
}

// Saves ONE wizard step against the real API and returns the (possibly new)
// product id: step 0 creates the product on first save (`add`) or updates
// its basic fields (`edit`); every later step sends the product's basic
// fields again plus just that step's `sections` entry, per
// buildSectionEditPayload. Shared by AddDigitalProductWizard.jsx (which
// starts with no id) and EditDigitalProductWizard.jsx (which always has
// one already).
export async function saveDigitalProductStep({ id, entity, values, recordIds, isDraft }) {
  const api = productApi();
  if (entity === "product") {
    const basic = buildProductBasicPayload(values);
    const response = id == null ? await api.add({ ...basic, is_draft: isDraft }) : await api.edit({ ...basic, id });
    return rowsOf(response)[0]?.id ?? id;
  }
  await api.edit({
    id,
    ...buildProductBasicPayload(values),
    sections: buildSectionEditPayload(entity, values, recordIds),
  });
  return id;
}
