import { useEffect, useState } from "react";
import { CONFIGS, DigitalProductFieldInput } from "./digitalProductFields";
import { digitalProductApi } from "@/Services/DigitalProduct/digitalProduct.api";
import { configKycApi } from "@/Services/Config/config.api";
import { useActiveInstitutionsQuery } from "@/Hooks/Institutions/institutionHooks";
import { useChannels, useTransactions, useResidencyTypes } from "@/Hooks/Master/masterHooks";
import { notifications } from "@/Utils/Lib/notifications";

// Shared between AddDigitalProductWizard.jsx and EditDigitalProductWizard.jsx
// — everything here is pure step/field plumbing with no add-vs-edit
// opinion, so both wizards behave identically at the field/dropdown level
// and only differ in how they load initial values and where Next/Save
// sends the result.

export const rowsOf = (r) => (Array.isArray(r?.data) ? r.data : (r?.data?.data ?? []));

export function emptyValuesFor(entity) {
  return Object.fromEntries(CONFIGS[entity].fields.map(([key, , type]) => [key, type === "boolean" ? false : ""]));
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

// First half of a step's fields in column 0, the rest in column 1 — keeps
// fields in their existing top-to-bottom order (unlike alternating every
// other field between columns, which would scatter related fields).
function fieldsColumn(fields, columnIndex) {
  const half = Math.ceil(fields.length / 2);
  return columnIndex === 0 ? fields.slice(0, half) : fields.slice(half);
}

// The current step's field grid: two independent flex-column stacks, not a
// single 2-col CSS grid — a real grid pairs left/right cells into shared
// rows, so a tall field (a dropdown) next to a short one (a checkbox)
// forces the short cell's row to stretch to the tall one's height,
// stranding the checkbox with a large gap before the next row.
export function DigitalProductStepFields({ entity, values, onFieldChange, lookups }) {
  return (
    <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
      {[fieldsColumn(CONFIGS[entity].fields, 0), fieldsColumn(CONFIGS[entity].fields, 1)].map(
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
                />
              </label>
            ))}
          </div>
        ),
      )}
    </div>
  );
}
