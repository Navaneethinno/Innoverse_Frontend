import { FilterSelect } from "@/Components/Common/FilterSelect";
import { blockNegativeKeyDown, blurOnWheel, clampNonNegative } from "@/Utils/Lib/numberInput";

// Field definitions + dropdown/input rendering for the Customer (indv_profile)
// wizard/resource — same [key, label, type, lookupKey?] tuple shape as
// digitalProductFields.jsx's CONFIGS. Only the profile's own fields and the
// two sections whose fields the API reference actually documents (contact,
// address) are wired here; the other 14 composite sections (residency,
// identification, tax, employment, business, financial_profile,
// source_of_fund, relationship, pep, kyc, screening, risk, document,
// communication, service_request) are real `sections` keys the backend
// already accepts (see customerWizardShared.jsx's SECTION_KEYS), but have
// no field-level form here yet — add a CONFIGS entry + a
// CUSTOMER_STEPS entry once their field lists are known, following this
// same pattern.
export const CONFIGS = {
  profile: {
    title: "Customer",
    menuName: "Customer",
    readOnlyOnEdit: ["inst_profile_id"],
    fields: [
      ["inst_profile_id", "Institution profile", "number", "institutions"],
      ["party_type_id", "Party type", "number", "partyTypes"],
      ["ownership_id", "Ownership", "number", "ownershipTypes"],
      ["ownership_sub_type_id", "Ownership sub type", "number", "ownershipSubTypes"],
      ["onboarding_id", "Onboarding ID", "number"],
      ["title", "Title", "text"],
      ["first_name", "First name", "text"],
      ["middle_name", "Middle name", "text"],
      ["last_name", "Last name", "text"],
      ["full_name", "Full name", "text"],
      ["preferred_name", "Preferred name", "text"],
      ["gender_id", "Gender", "number", "genders"],
      ["date_of_birth", "Date of birth", "date"],
      ["place_of_birth", "Place of birth", "text"],
      ["country_of_birth_id", "Country of birth", "number", "citizenships"],
      ["nationality_id", "Nationality", "number", "citizenships"],
      ["secondary_nationality_id", "Secondary nationality", "number", "citizenships"],
      ["marital_status_id", "Marital status", "number", "maritalStatuses"],
      ["father_name", "Father's name", "text"],
      ["mother_name", "Mother's name", "text"],
      ["spouse_name", "Spouse's name", "text"],
      ["disability_id", "Disability", "number", "disabilities"],
    ],
  },
  contact: {
    title: "Contact",
    fields: [
      ["primary_mobile", "Primary mobile", "text"],
      ["personal_email", "Personal email", "text"],
    ],
  },
  address: {
    title: "Address",
    fields: [
      ["address_type_id", "Address type", "number", "addressTypes"],
      ["address_line_1", "Address line 1", "text"],
      ["city", "City", "text"],
    ],
  },
};

// The dropdown-driven control (or plain input/date) for one field of one
// CONFIGS entry. `lookups` bundles every list the caller already fetches
// (institutions/partyTypes/ownershipTypes/genders/citizenships/disabilities);
// a caller only needs to pass the ones relevant to the fields it renders.
export function CustomerFieldInput({ fieldKey: key, type, value, onChange, lookups = {}, disabled = false }) {
  const {
    institutions = [],
    partyTypes = [],
    ownershipTypes = [],
    genders = [],
    citizenships = [],
    disabilities = [],
    maritalStatuses = [],
    ownershipSubTypes = [],
    addressTypes = [],
  } = lookups;
  const LOOKUP_OPTIONS = {
    inst_profile_id: { list: institutions, placeholder: "Select institution profile" },
    party_type_id: { list: partyTypes, placeholder: "Select party type" },
    ownership_id: { list: ownershipTypes, placeholder: "Select ownership" },
    gender_id: { list: genders, placeholder: "Select gender" },
    country_of_birth_id: { list: citizenships, placeholder: "Select country of birth" },
    nationality_id: { list: citizenships, placeholder: "Select nationality" },
    secondary_nationality_id: { list: citizenships, placeholder: "Select secondary nationality" },
    disability_id: { list: disabilities, placeholder: "Select disability" },
    marital_status_id: { list: maritalStatuses, placeholder: "Select marital status" },
    ownership_sub_type_id: { list: ownershipSubTypes, placeholder: "Select ownership sub type" },
    address_type_id: { list: addressTypes, placeholder: "Select address type" },
  };
  const lookupConfig = LOOKUP_OPTIONS[key];
  if (lookupConfig) {
    return (
      <FilterSelect
        className="mt-1.5"
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        options={[
          { value: "", label: lookupConfig.placeholder },
          ...lookupConfig.list.map((item) => ({
            value: item.id,
            label: item.name ?? item.code ?? String(item.id),
          })),
        ]}
      />
    );
  }
  return (
    <input
      type={type === "number" ? "number" : type === "date" ? "date" : "text"}
      min={type === "number" ? 0 : undefined}
      value={value ?? ""}
      onKeyDown={type === "number" ? blockNegativeKeyDown : undefined}
      onWheel={type === "number" ? blurOnWheel : undefined}
      onChange={(e) => onChange(type === "number" ? clampNonNegative(e.target.value) : e.target.value)}
      disabled={disabled}
      className="mt-1.5 w-full rounded-xl border px-3 py-2.5 disabled:bg-slate-50 disabled:text-slate-500"
    />
  );
}
