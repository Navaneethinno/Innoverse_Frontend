import { useCallback, useEffect, useState } from "react";
import { CONFIGS, CustomerFieldInput } from "./customerFields";
import { CUSTOMER_STEPS } from "./customerSteps";
import { splitFieldsIntoColumns, orderedFields } from "@/Utils/Lib/formFieldColumns";
import { indvProfileApi } from "@/Services/Customer/customer.api";
import {
  genderApi,
  citizenshipApi,
  disabilityApi,
  maritalStatusApi,
  indvTaxStatusApi,
  indvTaxClassificationApi,
  occupationApi,
  designationApi,
  turnoverApi,
  sourceOfFundApi,
  indvPepStatusApi,
  indvPepCategoryApi,
  relationshipTypeApi,
  accountPurposeApi,
  provinceApi,
  districtApi,
} from "@/Services/MasterConfig/district.api";
import { useLanguages, useCountries } from "@/Hooks/Master/masterHooks";
import { notifications } from "@/Utils/Lib/notifications";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

// Shared between AddCustomerWizard.jsx, EditCustomerWizard.jsx and
// ViewCustomerWizard.jsx — same "one composite root, `sections` merged in
// per step" shape as digitalProductWizardShared.jsx, for
// `/customer/indv_profile/*`. `identification`/`address` are NOT handled
// here — they're wizard_config-driven (see customerDynamicSteps.jsx); this
// file only covers the plain CONFIGS sections (profile/contact/tax/
// employment).

const profileApi = () => indvProfileApi();
export const rowsOf = (r) => (Array.isArray(r?.data) ? r.data : (r?.data?.data ?? []));
const firstOf = (r) => (Array.isArray(r) ? r[0] : r);

// Age-from-DOB — used by the Relationships step's Guardian sub-block and
// the Documents step's AGE_LT_18 condition. No existing helper for this
// anywhere else in the codebase (checked), so a plain local calculation.
export function ageFromDob(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function emptyValuesFor(entity) {
  if (!CONFIGS[entity]) return {};
  return Object.fromEntries(CONFIGS[entity].fields.map(([key, , type]) => [key, type === "boolean" ? false : ""]));
}

function pickFields(entity, record) {
  if (!CONFIGS[entity]) return {};
  return Object.fromEntries(CONFIGS[entity].fields.map(([key, , type]) => [key, record?.[key] ?? (type === "boolean" ? false : "")]));
}

function isStepFilled(entity, values) {
  if (!CONFIGS[entity]) return Object.keys(values[entity] ?? {}).length > 0;
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
// digitalProductWizardShared.jsx's buildSectionEditPayload. Only used for
// the plain object sections (contact/tax/employment/communication);
// identification/address build their own `sections` entry via
// customerDynamicSteps.jsx's buildIdentificationPayload/buildAddressPayload.
//
// `communication` is the one exception: the backend models it as an ARRAY
// of rows (one per channel preference), not a single object like every
// other plain CONFIGS section — the form still edits one row's worth of
// fields (CONFIGS.communication.fields), but it's wrapped in a one-element
// array on the wire here so the shape matches what /customer/indv_profile/
// add|edit actually accepts.
export function buildSectionEditPayload(entity, values, recordIds) {
  const built = { ...pickPayload(entity, values), ...(recordIds[entity] ? { id: recordIds[entity] } : {}) };
  if (entity === "communication") return { communication: [built] };
  return { [entity]: built };
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
    const identificationRows = data.identification ?? staged.identification ?? [];
    const addressRows = data.address ?? staged.address ?? [];

    // Identification/address are keyed by their own type id (not a flat
    // object like the CONFIGS sections) so customerDynamicSteps.jsx's
    // IdentificationStepFields/AddressStepFields can look a row up by the
    // wizard_config row it belongs to.
    const identification = Object.fromEntries(
      (Array.isArray(identificationRows) ? identificationRows : [identificationRows]).filter(Boolean).map((row) => [
        row.identification_type_id ?? row.kyc_document_type_id,
        { identification_number: row.identification_number ?? "", date_of_issue: row.date_of_issue ?? "", date_of_expiry: row.date_of_expiry ?? "", issue_place: row.issue_place ?? "", front_image: row.front_image ?? null, back_image: row.back_image ?? null },
      ]),
    );
    const identificationIds = Object.fromEntries(
      (Array.isArray(identificationRows) ? identificationRows : [identificationRows]).filter(Boolean).map((row) => [row.identification_type_id ?? row.kyc_document_type_id, row.id ?? null]),
    );
    const address = Object.fromEntries(
      (Array.isArray(addressRows) ? addressRows : [addressRows]).filter(Boolean).map((row) => [
        row.address_type_id,
        {
          address_line_1: row.address_line_1 ?? "",
          address_line_2: row.address_line_2 ?? "",
          city: row.city ?? "",
          district_id: row.district_id ?? "",
          province_id: row.province_id ?? "",
          country_id: row.country_id ?? "",
          postal_code: row.postal_code ?? "",
          same_as: false,
        },
      ]),
    );
    const addressIds = Object.fromEntries(
      (Array.isArray(addressRows) ? addressRows : [addressRows]).filter(Boolean).map((row) => [row.address_type_id, row.id ?? null]),
    );

    // Relationships/documents are freely-addable arrays, keyed by their own
    // row's saved id (or a local temp key when new/unsaved) — see
    // customerDynamicSteps.jsx's RelationshipStepFields/DocumentStepFields.
    const relationshipRows = data.relationship ?? staged.relationship ?? [];
    const relationship = Object.fromEntries(
      (Array.isArray(relationshipRows) ? relationshipRows : [relationshipRows]).filter(Boolean).map((row, i) => [
        row.id ?? `new-${i}`,
        {
          relationship_type_id: row.relationship_type_id ?? "",
          name: row.name ?? "",
          contact_number: row.contact_number ?? "",
          share_percentage: row.share_percentage ?? "",
          guardian_name: row.guardian_name ?? "",
          guardian_relationship: row.guardian_relationship ?? "",
          guardian_contact_number: row.guardian_contact_number ?? "",
          guardian_id_number: row.guardian_id_number ?? "",
        },
      ]),
    );
    const relationshipIds = Object.fromEntries(
      (Array.isArray(relationshipRows) ? relationshipRows : [relationshipRows]).filter(Boolean).map((row, i) => [row.id ?? `new-${i}`, row.id ?? null]),
    );

    const documentRows = data.document ?? staged.document ?? [];
    const document = Object.fromEntries(
      (Array.isArray(documentRows) ? documentRows : [documentRows]).filter(Boolean).map((row) => [
        row.document_category ?? row.category,
        {
          kyc_document_type_id: row.kyc_document_type_id ?? "",
          document_name: row.document_name ?? "",
          document_number: row.document_number ?? "",
          file_front: row.file_front ?? null,
          file_back: row.file_back ?? null,
        },
      ]),
    );
    const documentIds = Object.fromEntries(
      (Array.isArray(documentRows) ? documentRows : [documentRows]).filter(Boolean).map((row) => [row.document_category ?? row.category, row.id ?? null]),
    );

    // communication is an array of rows on the backend (see
    // buildSectionEditPayload above) — the form only edits one row, so
    // hydrate from the first one.
    const communicationRows = data.communication ?? staged.communication ?? [];
    const communicationRow = Array.isArray(communicationRows) ? communicationRows[0] : communicationRows;

    return {
      values: {
        profile: pickFields("profile", p),
        contact: pickFields("contact", contact),
        identification,
        address,
        tax: pickFields("tax", data.tax ?? staged.tax),
        employment: pickFields("employment", data.employment ?? staged.employment),
        business: pickFields("business", data.business ?? staged.business),
        financial_profile: pickFields("financial_profile", data.financial_profile ?? staged.financial_profile),
        source_of_fund: pickFields("source_of_fund", data.source_of_fund ?? staged.source_of_fund),
        relationship,
        pep: pickFields("pep", data.pep ?? staged.pep),
        document,
        communication: pickFields("communication", communicationRow),
      },
      recordIds: {
        profile: p.id ?? profile.id,
        contact: contact?.id ?? null,
        identification: identificationIds,
        address: addressIds,
        tax: (data.tax ?? staged.tax)?.id ?? null,
        employment: (data.employment ?? staged.employment)?.id ?? null,
        business: (data.business ?? staged.business)?.id ?? null,
        financial_profile: (data.financial_profile ?? staged.financial_profile)?.id ?? null,
        source_of_fund: (data.source_of_fund ?? staged.source_of_fund)?.id ?? null,
        relationship: relationshipIds,
        pep: (data.pep ?? staged.pep)?.id ?? null,
        document: documentIds,
        communication: communicationRow?.id ?? null,
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

// party_type_id/ownership_id are no longer user-entered fields (hardcoded
// per useCustomerPartyOwnershipIds), so they're no longer part of this
// check — only the fields the customer actually fills in.
export function findMissingField(entity, values) {
  if (!CONFIGS[entity]) return null;
  return CONFIGS[entity].fields.find(([key]) => {
    const isRequired = entity === "profile" ? ["first_name", "last_name"].includes(key)
      : entity === "contact" ? ["primary_mobile", "personal_email"].includes(key)
      : false;
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
// route entity. Institution/party-type/ownership-type/ownership-sub-type/
// address-type lookups are NOT fetched here any more — inst_profile_id
// comes from the session, party_type_id/ownership_id are hardcoded
// (useCustomerPartyOwnershipIds), and ownership_sub_types/address_types
// come from the wizard_config call (useWizardConfig) instead of a plain
// master list — see customerWizardConfig.js.
export function useCustomerLookups(currentEntity) {
  const [genders, setGenders] = useState([]);
  const [citizenships, setCitizenships] = useState([]);
  const [disabilities, setDisabilities] = useState([]);
  const [maritalStatuses, setMaritalStatuses] = useState([]);
  const [taxStatuses, setTaxStatuses] = useState([]);
  const [taxClassifications, setTaxClassifications] = useState([]);
  const [occupations, setOccupations] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [turnovers, setTurnovers] = useState([]);
  const [sourceOfFunds, setSourceOfFunds] = useState([]);
  const [pepStatuses, setPepStatuses] = useState([]);
  const [pepCategories, setPepCategories] = useState([]);
  const [relationshipTypes, setRelationshipTypes] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [accountPurposes, setAccountPurposes] = useState([]);
  const { languages } = useLanguages();
  const { countries } = useCountries(currentEntity === "tax" || currentEntity === "pep" || currentEntity === "address");

  useEffect(() => {
    if (currentEntity !== "profile") return;
    genderApi.getActive({ view: "dropdown" }).then((r) => setGenders(rowsOf(r))).catch((e) => notifications.error(e.message));
    citizenshipApi.getActive({ view: "dropdown" }).then((r) => setCitizenships(rowsOf(r))).catch((e) => notifications.error(e.message));
    disabilityApi.getActive({ view: "dropdown" }).then((r) => setDisabilities(rowsOf(r))).catch((e) => notifications.error(e.message));
    maritalStatusApi.getActive({ view: "dropdown" }).then((r) => setMaritalStatuses(rowsOf(r))).catch((e) => notifications.error(e.message));
  }, [currentEntity]);
  useEffect(() => {
    if (currentEntity !== "tax") return;
    indvTaxStatusApi.getActive({ view: "dropdown" }).then((r) => setTaxStatuses(rowsOf(r))).catch((e) => notifications.error(e.message));
    indvTaxClassificationApi.getActive({ view: "dropdown" }).then((r) => setTaxClassifications(rowsOf(r))).catch((e) => notifications.error(e.message));
  }, [currentEntity]);
  useEffect(() => {
    if (currentEntity !== "employment") return;
    occupationApi.getActive({ view: "dropdown" }).then((r) => setOccupations(rowsOf(r))).catch((e) => notifications.error(e.message));
    designationApi.getActive({ view: "dropdown" }).then((r) => setDesignations(rowsOf(r))).catch((e) => notifications.error(e.message));
  }, [currentEntity]);
  useEffect(() => {
    if (currentEntity !== "business") return;
    turnoverApi.getActive({ view: "dropdown" }).then((r) => setTurnovers(rowsOf(r))).catch((e) => notifications.error(e.message));
  }, [currentEntity]);
  useEffect(() => {
    if (currentEntity !== "financial_profile") return;
    accountPurposeApi.getActive({ view: "dropdown" }).then((r) => setAccountPurposes(rowsOf(r))).catch((e) => notifications.error(e.message));
  }, [currentEntity]);
  useEffect(() => {
    if (currentEntity !== "source_of_fund") return;
    sourceOfFundApi.getActive({ view: "dropdown" }).then((r) => setSourceOfFunds(rowsOf(r))).catch((e) => notifications.error(e.message));
  }, [currentEntity]);
  useEffect(() => {
    if (currentEntity !== "pep") return;
    indvPepStatusApi.getActive({ view: "dropdown" }).then((r) => setPepStatuses(rowsOf(r))).catch((e) => notifications.error(e.message));
    indvPepCategoryApi.getActive({ view: "dropdown" }).then((r) => setPepCategories(rowsOf(r))).catch((e) => notifications.error(e.message));
  }, [currentEntity]);
  useEffect(() => {
    // Also fetched on the Documents step: IF_NOMINEE_ADDED needs to resolve
    // relationship rows' types even when the customer isn't currently on
    // the Relationships step.
    if (currentEntity !== "relationship" && currentEntity !== "document") return;
    relationshipTypeApi.getActive({ view: "dropdown" }).then((r) => setRelationshipTypes(rowsOf(r))).catch((e) => notifications.error(e.message));
  }, [currentEntity]);
  useEffect(() => {
    if (currentEntity !== "address") return;
    provinceApi.getActive({ view: "dropdown" }).then((r) => setProvinces(rowsOf(r))).catch((e) => notifications.error(e.message));
    districtApi.getActive({ view: "dropdown" }).then((r) => setDistricts(rowsOf(r))).catch((e) => notifications.error(e.message));
  }, [currentEntity]);

  return {
    genders,
    citizenships,
    disabilities,
    maritalStatuses,
    taxStatuses,
    taxClassifications,
    occupations,
    designations,
    turnovers,
    sourceOfFunds,
    pepStatuses,
    pepCategories,
    relationshipTypes,
    languages,
    countries,
    provinces,
    districts,
    accountPurposes,
  };
}

// The current step's field grid — same two-flex-column layout as
// DigitalProductStepFields. Only for plain CONFIGS entities
// (profile/contact/tax/employment) — identification/address render via
// customerDynamicSteps.jsx instead.
export function CustomerStepFields({ entity, values, onFieldChange, lookups, disabled = false, fieldFilter }) {
  const tr = useConfigLabel();
  if (!CONFIGS[entity]) return null;
  const fields = fieldFilter ? CONFIGS[entity].fields.filter(([key]) => fieldFilter(key, values)) : CONFIGS[entity].fields;
  return (
    <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
      {splitFieldsIntoColumns(orderedFields(fields)).map((columnFields, columnIndex) => (
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
// profile id — mirrors saveDigitalProductStep. `fixedIds` carries
// inst_profile_id (from the session) + party_type_id/ownership_id (resolved
// once from master data) + onboarding_id (from the Contact step's
// /customer/indv_onboarding/start call) — every one of these is sent
// silently, never user-entered. Only used for the plain CONFIGS sections
// (profile/tax/employment/communication); identification/address build
// their own `sections` entry via customerDynamicSteps.jsx.
//
// The profile step's own `add`/`edit` also carries `sections.contact` (the
// contact typed on the wizard's first page) — per the backend's confirmed
// contract, /indv_profile/add falls back to the onboarding-start phone/
// email if contact is missing, but that fallback isn't something to rely
// on, so it's sent explicitly here every time the profile step is saved.
//
// Once the profile exists, its own `add`'s job is done — every later `edit`
// call (any entity other than `profile`) only needs {id, is_draft,
// sections}: the backend already has party_type_id/ownership_id/
// inst_profile_id/onboarding_id and the rest of the profile's own basic
// fields from that first call, so re-sending them on every subsequent
// step's edit is unnecessary.
export async function saveCustomerStep({ id, entity, values, recordIds, isDraft, fixedIds = {} }) {
  const api = profileApi();
  const contactSection = values.contact
    ? { contact: { primary_mobile: values.contact.primary_mobile || null, personal_email: values.contact.personal_email || null } }
    : {};
  if (entity === "profile") {
    const basic = { ...buildProfileBasicPayload(values), ...fixedIds, sections: contactSection };
    const response = id == null ? await api.add({ ...basic, is_draft: isDraft }) : await api.edit({ ...basic, id });
    return rowsOf(response)[0]?.id ?? id;
  }
  await api.edit({
    id,
    is_draft: isDraft,
    sections: buildSectionEditPayload(entity, values, recordIds),
  });
  return id;
}
