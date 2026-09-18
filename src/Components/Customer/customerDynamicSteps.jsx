import { CustomerFieldInput } from "./customerFields";
import { IDENTIFICATION_ROW_FIELDS, ADDRESS_ROW_FIELDS } from "./customerFields";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

// Identification and Address are NOT plain CONFIGS sections — each renders
// one form block per row of wizard_config.identification_types /
// wizard_config.address_types (institution-specific, not a fixed field
// list), so they get their own components instead of going through
// CustomerStepFields/CONFIGS. Both are keyed by the row's own id
// (kyc_document_type_id / address_type_id) so values survive re-renders and
// step navigation the same way a CONFIGS-driven step's `values[entity]`
// object does.

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function emptyIdentificationRow() {
  return Object.fromEntries([...IDENTIFICATION_ROW_FIELDS.map(([key]) => [key, ""]), ["front_image", null], ["back_image", null]]);
}
export function emptyAddressRow() {
  return Object.fromEntries([...ADDRESS_ROW_FIELDS.map(([key]) => [key, ""]), ["same_as", false]]);
}

export function IdentificationStepFields({ types, values, onRowChange, disabled = false }) {
  const tr = useConfigLabel();
  if (types.length === 0) {
    return <p className="text-sm text-slate-500">{tr("No identification types are configured for this institution.")}</p>;
  }
  return (
    <div className="flex flex-col gap-6">
      {types.map((idType) => {
        const key = idType.kyc_document_type_id;
        const row = values[key] ?? emptyIdentificationRow();
        const setField = (field, next) => onRowChange(key, { ...row, [field]: next });
        return (
          <div key={key} className="rounded-2xl border p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-800">
              {idType.name} {idType.verification_required ? <span className="text-xs font-normal text-amber-600">({tr("verification required")})</span> : null}
            </h3>
            <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              {IDENTIFICATION_ROW_FIELDS.map(([fieldKey, label, type]) => (
                <label key={fieldKey} className="text-sm font-semibold text-slate-700">
                  {tr(label)}
                  <CustomerFieldInput fieldKey={fieldKey} type={type} value={row[fieldKey]} onChange={(next) => setField(fieldKey, next)} disabled={disabled} />
                </label>
              ))}
              <label className="text-sm font-semibold text-slate-700">
                {tr("Front image")}
                <input
                  type="file"
                  accept="image/*"
                  disabled={disabled}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) setField("front_image", await readFileAsDataUrl(file));
                  }}
                  className="mt-1.5 w-full rounded-xl border px-3 py-2 text-sm disabled:bg-slate-50"
                />
                {row.front_image && <span className="mt-1 block text-xs text-emerald-600">{tr("Image selected")}</span>}
              </label>
              {idType.back_required && (
                <label className="text-sm font-semibold text-slate-700">
                  {tr("Back image")}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={disabled}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) setField("back_image", await readFileAsDataUrl(file));
                    }}
                    className="mt-1.5 w-full rounded-xl border px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                  {row.back_image && <span className="mt-1 block text-xs text-emerald-600">{tr("Image selected")}</span>}
                </label>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AddressStepFields({ types, values, onRowChange, disabled = false }) {
  const tr = useConfigLabel();
  if (types.length === 0) {
    return <p className="text-sm text-slate-500">{tr("No address types are configured for this institution.")}</p>;
  }
  return (
    <div className="flex flex-col gap-6">
      {types.map((addrType) => {
        const key = addrType.address_type_id;
        const row = values[key] ?? emptyAddressRow();
        const setField = (field, next) => onRowChange(key, { ...row, [field]: next });
        const sameAsChecked = Boolean(row.same_as);
        return (
          <div key={key} className="rounded-2xl border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {addrType.name} {addrType.mandatory ? <span className="text-xs font-normal text-red-600">({tr("mandatory")})</span> : <span className="text-xs font-normal text-slate-400">({tr("optional")})</span>}
              </h3>
              {addrType.allow_same_as && (
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={sameAsChecked}
                    disabled={disabled}
                    onChange={(e) => setField("same_as", e.target.checked)}
                  />
                  {tr("Same as")} {addrType.same_as_address_type_name}
                </label>
              )}
            </div>
            {!sameAsChecked && (
              <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                {ADDRESS_ROW_FIELDS.map(([fieldKey, label, type]) => (
                  <label key={fieldKey} className="text-sm font-semibold text-slate-700">
                    {tr(label)}
                    <CustomerFieldInput fieldKey={fieldKey} type={type} value={row[fieldKey]} onChange={(next) => setField(fieldKey, next)} disabled={disabled} />
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Builds the `identification` sections array for the edit payload — one
// entry per identification type the customer actually filled in (or that's
// implied by having an id already saved), tagged with the type's own
// kyc_document_type_id so the backend knows which type each row is.
export function buildIdentificationPayload(types, values, existingIds = {}) {
  return types
    .map((idType) => {
      const key = idType.kyc_document_type_id;
      const row = values[key];
      if (!row) return null;
      const hasData = IDENTIFICATION_ROW_FIELDS.some(([f]) => row[f]) || row.front_image;
      if (!hasData) return null;
      return {
        ...(existingIds[key] ? { id: existingIds[key] } : {}),
        kyc_document_type_id: key,
        identification_number: row.identification_number || null,
        date_of_issue: row.date_of_issue || null,
        date_of_expiry: row.date_of_expiry || null,
        issue_place: row.issue_place || null,
        front_image: row.front_image || null,
        back_image: row.back_image || null,
      };
    })
    .filter(Boolean);
}

// Builds the `address` sections array — one entry per address type with
// data, "same as" resolved to the target type's own values so the backend
// receives real field values either way (server-side same-as duplication
// isn't assumed).
export function buildAddressPayload(types, values, existingIds = {}) {
  const byId = Object.fromEntries(types.map((t) => [t.address_type_id, t]));
  return types
    .map((addrType) => {
      const key = addrType.address_type_id;
      const row = values[key];
      if (!row) return null;
      let source = row;
      if (row.same_as && addrType.same_as_address_type_id != null) {
        source = values[addrType.same_as_address_type_id] ?? row;
      }
      const hasData = ADDRESS_ROW_FIELDS.some(([f]) => source[f]);
      if (!hasData && !addrType.mandatory) return null;
      return {
        ...(existingIds[key] ? { id: existingIds[key] } : {}),
        address_type_id: key,
        ...Object.fromEntries(ADDRESS_ROW_FIELDS.map(([f]) => [f, source[f] || null])),
      };
    })
    .filter(Boolean);
}

// Missing-mandatory-address check for goNext()/Submit — mirrors
// findMissingField's role for CONFIGS steps.
export function findMissingAddress(types, values) {
  return types.find((addrType) => {
    if (!addrType.mandatory) return false;
    const key = addrType.address_type_id;
    const row = values[key];
    if (row?.same_as) return false;
    return !row || !ADDRESS_ROW_FIELDS.some(([f]) => row[f]);
  });
}
