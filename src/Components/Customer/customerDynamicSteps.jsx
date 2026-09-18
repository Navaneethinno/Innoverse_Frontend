import { CustomerFieldInput } from "./customerFields";
import { IDENTIFICATION_ROW_FIELDS, ADDRESS_ROW_FIELDS, RELATIONSHIP_ROW_FIELDS, GUARDIAN_ROW_FIELDS } from "./customerFields";
import { isGuardianRelationshipType } from "./customerWizardConfig";
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
// kyc_document_type_id (renamed to identification_type_id on the outgoing
// payload per backend's confirmed field name for this endpoint — every
// other field in this payload was already correct) so the backend knows
// which type each row is.
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
        identification_type_id: key,
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

// Relationships — unlike identification/address, this isn't one row per
// wizard_config type (relationships aren't institution-configured); it's a
// freely-addable list, so rows are keyed by a local id (`new-<n>` for an
// unsaved row, the real saved id once persisted) rather than a fixed type
// id. Judgment call: kept consistent with identification/address's
// "row keyed by id, edited via onRowChange" shape rather than inventing a
// second list-editing pattern.
let relationshipTempSeq = 0;
export function emptyRelationshipRow() {
  return Object.fromEntries([...RELATIONSHIP_ROW_FIELDS.map(([key]) => [key, ""]), ...GUARDIAN_ROW_FIELDS.map(([key]) => [key, ""])]);
}
export function newRelationshipRowKey() {
  relationshipTempSeq += 1;
  return `new-${Date.now()}-${relationshipTempSeq}`;
}

export function RelationshipStepFields({ relationshipTypes, values, onRowChange, onAddRow, onRemoveRow, minorAge, disabled = false }) {
  const tr = useConfigLabel();
  const keys = Object.keys(values ?? {});
  return (
    <div className="flex flex-col gap-6">
      {keys.length === 0 && <p className="text-sm text-slate-500">{tr("No relationships added yet.")}</p>}
      {keys.map((key) => {
        const row = values[key] ?? emptyRelationshipRow();
        const setField = (field, next) => onRowChange(key, { ...row, [field]: next });
        const isGuardianType = isGuardianRelationshipType(relationshipTypes, row.relationship_type_id);
        const showGuardianBlock = isGuardianType && minorAge;
        return (
          <div key={key} className="rounded-2xl border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">{tr("Relationship")}</h3>
              {!disabled && (
                <button type="button" onClick={() => onRemoveRow(key)} className="text-xs font-bold text-red-600">
                  {tr("Remove")}
                </button>
              )}
            </div>
            <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              {RELATIONSHIP_ROW_FIELDS.map(([fieldKey, label, type]) => (
                <label key={fieldKey} className="text-sm font-semibold text-slate-700">
                  {tr(label)}
                  <CustomerFieldInput fieldKey={fieldKey} type={type} value={row[fieldKey]} onChange={(next) => setField(fieldKey, next)} lookups={{ relationshipTypes }} disabled={disabled} />
                </label>
              ))}
            </div>
            {showGuardianBlock && (
              <div className="mt-4 rounded-xl bg-amber-50 p-3">
                <h4 className="mb-3 text-xs font-bold uppercase text-amber-700">{tr("Guardian details (customer is a minor)")}</h4>
                <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                  {GUARDIAN_ROW_FIELDS.map(([fieldKey, label, type]) => (
                    <label key={fieldKey} className="text-sm font-semibold text-slate-700">
                      {tr(label)}
                      <CustomerFieldInput fieldKey={fieldKey} type={type} value={row[fieldKey]} onChange={(next) => setField(fieldKey, next)} disabled={disabled} />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {!disabled && (
        <button type="button" onClick={onAddRow} className="self-start rounded-xl border px-4 py-2 text-sm font-bold text-primary">
          {tr("Add relationship")}
        </button>
      )}
    </div>
  );
}

export function buildRelationshipPayload(values, existingIds = {}) {
  return Object.entries(values ?? {})
    .filter(([, row]) => RELATIONSHIP_ROW_FIELDS.some(([f]) => row[f]))
    .map(([key, row]) => ({
      ...(existingIds[key] ? { id: existingIds[key] } : {}),
      relationship_type_id: row.relationship_type_id || null,
      name: row.name || null,
      contact_number: row.contact_number || null,
      share_percentage: row.share_percentage || null,
      guardian_name: row.guardian_name || null,
      guardian_relationship: row.guardian_relationship || null,
      guardian_contact_number: row.guardian_contact_number || null,
      guardian_id_number: row.guardian_id_number || null,
    }));
}

// Documents — fully wizard_config-driven (document_requirements +
// document_types), same "one form block per applicable row" shape as
// Identification/Address, not a static CONFIGS entry. Each visible
// requirement row shows a document-name dropdown (document_types filtered
// to that row's own document_category) plus a file upload, reusing the
// exact same base64 data-URL read IdentificationStepFields already uses
// (judgment call carried over from the previous pass — no real upload
// endpoint exists anywhere in the codebase).
export function emptyDocumentRow() {
  return { document_type_id: "", document_number: "", document_file: null };
}

export function DocumentStepFields({ requirements, documentTypes, values, onRowChange, disabled = false }) {
  const tr = useConfigLabel();
  if (requirements.length === 0) {
    return <p className="text-sm text-slate-500">{tr("No documents are required for this profile.")}</p>;
  }
  return (
    <div className="flex flex-col gap-6">
      {requirements.map((req) => {
        const key = req.document_category ?? req.category ?? req.id;
        const row = values[key] ?? emptyDocumentRow();
        const setField = (field, next) => onRowChange(key, { ...row, [field]: next });
        const typeOptions = documentTypes.filter((dt) => String(dt.document_category ?? dt.category) === String(req.document_category ?? req.category));
        const isMandatory = req.requirement_type === "MANDATORY";
        return (
          <div key={key} className="rounded-2xl border p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-800">
              {req.name ?? req.document_category ?? req.category}{" "}
              {isMandatory ? <span className="text-xs font-normal text-red-600">({tr("mandatory")})</span> : <span className="text-xs font-normal text-slate-400">({tr("optional")})</span>}
            </h3>
            <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                {tr("Document name")}
                <select
                  className="mt-1.5 w-full rounded-xl border px-3 py-2.5 disabled:bg-slate-50"
                  value={row.document_type_id ?? ""}
                  disabled={disabled}
                  onChange={(e) => setField("document_type_id", e.target.value)}
                >
                  <option value="">{tr("Select document")}</option>
                  {typeOptions.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.name ?? dt.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                {tr("Document number")}
                <input
                  type="text"
                  value={row.document_number ?? ""}
                  disabled={disabled}
                  onChange={(e) => setField("document_number", e.target.value)}
                  className="mt-1.5 w-full rounded-xl border px-3 py-2.5 disabled:bg-slate-50"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                {tr("Upload file")}
                <input
                  type="file"
                  disabled={disabled}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) setField("document_file", await readFileAsDataUrl(file));
                  }}
                  className="mt-1.5 w-full rounded-xl border px-3 py-2 text-sm disabled:bg-slate-50"
                />
                {row.document_file && <span className="mt-1 block text-xs text-emerald-600">{tr("File selected")}</span>}
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function buildDocumentPayload(requirements, values, existingIds = {}) {
  return requirements
    .map((req) => {
      const key = req.document_category ?? req.category ?? req.id;
      const row = values[key];
      if (!row) return null;
      const hasData = row.document_type_id || row.document_number || row.document_file;
      if (!hasData) return null;
      return {
        ...(existingIds[key] ? { id: existingIds[key] } : {}),
        document_category: req.document_category ?? req.category ?? null,
        document_type_id: row.document_type_id || null,
        document_number: row.document_number || null,
        document_file: row.document_file || null,
      };
    })
    .filter(Boolean);
}

export function findMissingDocument(requirements, values) {
  return requirements.find((req) => {
    if (req.requirement_type !== "MANDATORY") return false;
    const key = req.document_category ?? req.category ?? req.id;
    const row = values[key];
    return !row || !(row.document_type_id || row.document_file);
  });
}
