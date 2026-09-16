import { useEffect, useState } from "react";
import { CONFIGS, DigitalProductFieldInput } from "./digitalProductFields";
import { DIGITAL_PRODUCT_STEPS } from "./digitalProductSteps";
import { splitFieldsIntoColumns } from "@/Utils/Lib/formFieldColumns";
import { digitalProductApi } from "@/Services/DigitalProduct/digitalProduct.api";
import { configKycApi } from "@/Services/Config/config.api";
import { useActiveInstitutionsQuery } from "@/Hooks/Institutions/institutionHooks";
import { useChannels, useTransactions, useResidencyTypes } from "@/Hooks/Master/masterHooks";
import { notifications } from "@/Utils/Lib/notifications";

// Shared between AddDigitalProductWizard.jsx, EditDigitalProductWizard.jsx
// and ViewDigitalProductWizard.jsx — everything here is pure step/field
// plumbing with no add-vs-edit-vs-view opinion, so all three wizards behave
// identically at the field/dropdown level and only differ in how they load
// initial values and what (if anything) happens on Next/Save.

export const rowsOf = (r) => (Array.isArray(r?.data) ? r.data : (r?.data?.data ?? []));

export function emptyValuesFor(entity) {
  return Object.fromEntries(CONFIGS[entity].fields.map(([key, , type]) => [key, type === "boolean" ? false : ""]));
}

function pickFields(entity, record) {
  return Object.fromEntries(
    CONFIGS[entity].fields.map(([key, , type]) => [key, record?.[key] ?? (type === "boolean" ? false : "")]),
  );
}

// Finds the existing record (if any) for `entity` whose `parentField`
// equals `parentId`, by listing that entity's own existing /list endpoint
// (the same one DigitalProductResource.jsx's own listing page for that
// entity already calls) and filtering client-side — there is no dedicated
// "get by parent id" endpoint, and inventing one isn't in scope here.
async function findChildRecord(entity, parentField, parentId) {
  if (parentId == null) return undefined;
  const response = await digitalProductApi(entity).list({ page: 1, limit: 500 });
  return rowsOf(response).find((row) => String(row[parentField]) === String(parentId));
}

// Loads whatever configuration already exists for `product` across all 9
// steps: `product` itself comes free from the caller (the row it already
// has), the 5 steps parented directly to it are fetched in parallel, then
// the 3 steps chained off THOSE (kyc_level off kyc_config's id,
// channel_transaction off channel_config's id, residency off
// eligibility_config's id) are resolved once their parent's real id is
// known. Shared by EditDigitalProductWizard.jsx (which then lets the user
// mutate the result) and ViewDigitalProductWizard.jsx (which renders it
// read-only and never mutates it).
export function useDigitalProductExistingData(product) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(DIGITAL_PRODUCT_STEPS.map((step) => [step.entity, emptyValuesFor(step.entity)])),
  );
  const [recordIds, setRecordIds] = useState(() =>
    Object.fromEntries(DIGITAL_PRODUCT_STEPS.map((step) => [step.entity, null])),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const nextValues = { product: pickFields("product", product) };
      const nextRecordIds = { product: product.id };

      await Promise.all(
        DIGITAL_PRODUCT_STEPS.filter((step) => step.parentEntity === "product").map(async (step) => {
          const record = await findChildRecord(step.entity, step.parentIdField, product.id).catch(() => undefined);
          nextValues[step.entity] = record ? pickFields(step.entity, record) : emptyValuesFor(step.entity);
          nextRecordIds[step.entity] = record?.id ?? null;
        }),
      );

      // kyc_level / channel_transaction / residency each depend on a
      // record resolved in the pass above (kyc_config / channel_config /
      // eligibility_config respectively) — must run after it, not in
      // parallel with it.
      await Promise.all(
        DIGITAL_PRODUCT_STEPS.filter((step) => step.parentEntity && step.parentEntity !== "product").map(
          async (step) => {
            const parentId = nextRecordIds[step.parentEntity];
            const record = await findChildRecord(step.entity, step.parentIdField, parentId).catch(() => undefined);
            nextValues[step.entity] = record ? pickFields(step.entity, record) : emptyValuesFor(step.entity);
            nextRecordIds[step.entity] = record?.id ?? null;
          },
        ),
      );

      if (cancelled) return;
      setValues(nextValues);
      setRecordIds(nextRecordIds);
      setLoading(false);
    }
    load().catch((e) => {
      if (cancelled) return;
      notifications.error(e.message);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  return { values, setValues, recordIds, setRecordIds, loading };
}

// Same required-field definition DigitalProductResource.jsx's Editor/save()
// already enforce (native `required` on plain code/name inputs, a manual
// check for the "_id" dropdown fields that have no native control) —
// neither wizard has a <form> per step to get that native validation for
// free, so it's made explicit here instead of duplicating a different rule
// in each.
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
  const [products, setProducts] = useState([]);
  const [accountProducts, setAccountProducts] = useState([]);
  const [kycGroups, setKycGroups] = useState([]);
  const [channelConfigs, setChannelConfigs] = useState([]);
  const [eligibilityConfigs, setEligibilityConfigs] = useState([]);

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
    digitalProductApi("product")
      .getActive({ view: "dropdown" })
      .then((r) => setProducts(rowsOf(r)))
      .catch((e) => notifications.error(e.message));
  }, [currentEntity]);
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
  useEffect(() => {
    if (currentEntity !== "channel_transaction") return;
    digitalProductApi("channel_config")
      .getActive({ view: "dropdown" })
      .then((r) => setChannelConfigs(rowsOf(r)))
      .catch((e) => notifications.error(e.message));
  }, [currentEntity]);
  useEffect(() => {
    if (currentEntity !== "residency") return;
    digitalProductApi("eligibility_config")
      .getActive({ view: "dropdown" })
      .then((r) => setEligibilityConfigs(rowsOf(r)))
      .catch((e) => notifications.error(e.message));
  }, [currentEntity]);

  return {
    institutions,
    products,
    accountProducts,
    kycGroups,
    channels,
    channelConfigs,
    transactions,
    eligibilityConfigs,
    residencyTypes,
  };
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
                    ? "flex items-center gap-2 text-sm font-semibold text-slate-700"
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
