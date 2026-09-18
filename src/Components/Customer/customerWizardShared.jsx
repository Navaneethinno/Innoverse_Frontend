import { useCallback, useEffect, useState } from "react";
import { CONFIGS, CustomerFieldInput } from "./customerFields";
import { CUSTOMER_STEPS } from "./customerSteps";
import { splitFieldsIntoColumns, orderedFields } from "@/Utils/Lib/formFieldColumns";
import { indvProfileApi } from "@/Services/Customer/customer.api";
import { useActiveInstitutionsQuery } from "@/Hooks/Institutions/institutionHooks";
import { usePartyTypes, useOwnershipTypes } from "@/Hooks/Master/masterHooks";
import { genderApi, citizenshipApi, disabilityApi, maritalStatusApi, ownershipSubTypeApi, addressTypeApi } from "@/Services/MasterConfig/district.api";
import { notifications } from "@/Utils/Lib/notifications";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

// Shared between AddCustomerWizard.jsx, EditCustomerWizard.jsx and
// ViewCustomerWizard.jsx — same "one composite root, `sections` merged in
// per step" shape as digitalProductWizardShared.jsx, just for
// `/customer/indv_profile/*` and a smaller (3-step) set of sections. See
// customerFields.jsx's top comment for why only `contact`/`address` are
// wired here rather than all 16 `sections` keys the backend accepts.

const profileApi = () => indvProfileApi();
export const rowsOf = (r) => (Array.isArray(r?.data) ? r.data : (r?.data?.data ?? []));
const firstOf = (r) => (Array.isArray(r) ? r[0] : r);

// `contact` is a 1:1 section (single object); `address` is a multi section
// (array of rows) — same "always send exactly one entry" simplification
// Digital Product's own array sections (product_map/channel_config) use,
// since this wizard only edits one address at a time.
const ARRAY_SECTIONS = new Set(["address"]);

export function emptyValuesFor(entity) {
  return Object.fromEntries(CONFIGS[entity].fields.map(([key, , type]) => [key, type === "boolean" ? false : ""]));
}

function pickFields(entity, record) {
  return Object.fromEntries(CONFIGS[entity].fields.map(([key, , type]) => [key, record?.[key] ?? (type === "boolean" ? false : "")]));
}

function isStepFilled(entity, values) {
  return CONFIGS[entity].fields.some(([key]) => {
    const v = values[entity][key];
    return v !== "" && v != null && v !== false;
  });
}
export const isStepConfigured = isStepFilled;

function pickPayload(entity, values) {
  return Object.fromEntries(
    CONFIGS[entity].fields.map(([key]) => [key, values[entity][key] === "" ? null : values[entity][key]]),
  );
}

// Builds the `sections` object for ONE wizard step's edit call — mirrors
// digitalProductWizardShared.jsx's buildSectionEditPayload, minus the
// nested-child-section case (neither `contact` nor `address` has one).
export function buildSectionEditPayload(entity, values, recordIds) {
  const built = { ...pickPayload(entity, values), ...(recordIds[entity] ? { id: recordIds[entity] } : {}) };
  return { [entity]: ARRAY_SECTIONS.has(entity) ? [built] : built };
}

export function buildProfileBasicPayload(values) {
  return pickPayload("profile", values);
}

// Loads the full existing tree for `profile` via a single `/get` call —
// handles both a live profile (sections at the top level) and an
// in-progress Draft (everything staged under `pending_payload` instead).
export function useCustomerExistingData(profile) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(CUSTOMER_STEPS.map((step) => [step.entity, emptyValuesFor(step.entity)])),
  );
  const [recordIds, setRecordIds] = useState(() =>
    Object.fromEntries(CUSTOMER_STEPS.map((step) => [step.entity, null])),
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await profileApi().get({ id: profile.id });
    const data = rowsOf(response)[0] ?? {};
    const p = data.indv_profile ?? profile;
    const staged = p.pending_payload ?? {};

    const contact = data.contact ?? staged.contact;
    const address = firstOf(data.address) ?? firstOf(staged.address);

    return {
      values: {
        profile: pickFields("profile", p),
        contact: pickFields("contact", contact),
        address: pickFields("address", address),
      },
      recordIds: {
        profile: p.id ?? profile.id,
        contact: contact?.id ?? null,
        address: address?.id ?? null,
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

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

// Only step 0 (the profile's own basic fields) is required up front — the
// API's own required-section check (`contact`, enforced only at /submit)
// is left to the backend's own error message, same as Digital Product.
export function findMissingField(entity, values) {
  return CONFIGS[entity].fields.find(([key]) => {
    const isRequired = ["party_type_id", "ownership_id", "first_name", "last_name"].includes(key);
    return isRequired && (values[key] === "" || values[key] == null);
  });
}

export function requiredFieldMessage([key, label], tr = (s) => s) {
  const translated = tr(label);
  const verb = key.endsWith("_id") ? "select" : "enter";
  const article = /^[aeiou]/i.test(translated) ? "an" : "a";
  return `Please ${verb} ${article} ${translated.toLowerCase()}`;
}

// Exactly the dropdown sources CustomerResource.jsx's own Add/Edit form
// uses for these fields, gated by the CURRENT wizard step instead of a
// route entity.
export function useCustomerLookups(currentEntity) {
  const { data: institutions = [], error: institutionsError } = useActiveInstitutionsQuery();
  const { partyTypes = [], error: partyTypesError } = usePartyTypes(currentEntity === "profile");
  const { ownershipTypes = [], error: ownershipTypesError } = useOwnershipTypes(currentEntity === "profile");
  const [genders, setGenders] = useState([]);
  const [citizenships, setCitizenships] = useState([]);
  const [disabilities, setDisabilities] = useState([]);
  const [maritalStatuses, setMaritalStatuses] = useState([]);
  const [ownershipSubTypes, setOwnershipSubTypes] = useState([]);
  const [addressTypes, setAddressTypes] = useState([]);

  useEffect(() => {
    if (institutionsError) notifications.error(institutionsError.message);
  }, [institutionsError]);
  useEffect(() => {
    if (partyTypesError) notifications.error(partyTypesError.message);
  }, [partyTypesError]);
  useEffect(() => {
    if (ownershipTypesError) notifications.error(ownershipTypesError.message);
  }, [ownershipTypesError]);
  useEffect(() => {
    if (currentEntity !== "profile") return;
    genderApi
      .getActive({ view: "dropdown" })
      .then((r) => setGenders(rowsOf(r)))
      .catch((e) => notifications.error(e.message));
    citizenshipApi
      .getActive({ view: "dropdown" })
      .then((r) => setCitizenships(rowsOf(r)))
      .catch((e) => notifications.error(e.message));
    disabilityApi
      .getActive({ view: "dropdown" })
      .then((r) => setDisabilities(rowsOf(r)))
      .catch((e) => notifications.error(e.message));
    maritalStatusApi
      .getActive({ view: "dropdown" })
      .then((r) => setMaritalStatuses(rowsOf(r)))
      .catch((e) => notifications.error(e.message));
    ownershipSubTypeApi
      .getActive({ view: "dropdown" })
      .then((r) => setOwnershipSubTypes(rowsOf(r)))
      .catch((e) => notifications.error(e.message));
  }, [currentEntity]);
  useEffect(() => {
    if (currentEntity !== "address") return;
    addressTypeApi
      .getActive({ view: "dropdown" })
      .then((r) => setAddressTypes(rowsOf(r)))
      .catch((e) => notifications.error(e.message));
  }, [currentEntity]);

  return {
    institutions,
    partyTypes,
    ownershipTypes,
    genders,
    citizenships,
    disabilities,
    maritalStatuses,
    ownershipSubTypes,
    addressTypes,
  };
}

// The current step's field grid — same two-flex-column layout as
// DigitalProductStepFields.
export function CustomerStepFields({ entity, values, onFieldChange, lookups, disabled = false }) {
  const tr = useConfigLabel();
  return (
    <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
      {splitFieldsIntoColumns(orderedFields(CONFIGS[entity].fields)).map((columnFields, columnIndex) => (
        <div key={columnIndex} className="flex flex-col gap-4">
          {columnFields.map(([key, label, type]) => (
            <label key={key} className="text-sm font-semibold text-slate-700">
              {tr(label)}
              <CustomerFieldInput
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
      ))}
    </div>
  );
}

// Saves ONE wizard step against the real API and returns the (possibly new)
// profile id — mirrors saveDigitalProductStep.
export async function saveCustomerStep({ id, entity, values, recordIds, isDraft }) {
  const api = profileApi();
  if (entity === "profile") {
    const basic = buildProfileBasicPayload(values);
    const response = id == null ? await api.add({ ...basic, is_draft: isDraft }) : await api.edit({ ...basic, id });
    return rowsOf(response)[0]?.id ?? id;
  }
  await api.edit({
    id,
    ...buildProfileBasicPayload(values),
    sections: buildSectionEditPayload(entity, values, recordIds),
  });
  return id;
}
