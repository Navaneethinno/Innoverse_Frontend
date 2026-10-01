import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { useTranslation } from "react-i18next";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { useActiveInstitutionsQuery } from "@/Hooks/Institution/institutionHooks";

import { Button } from "@/Components/Common/Button";
// Shared by Notification Group and Notification Alerts.

export const inputClass = "mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm disabled:bg-muted";
export const labelClass = "block text-sm font-semibold text-slate-700";
export const codeOf = (value) => String(value ?? "").toUpperCase().replace(/[^A-Z0-9_]/g, "");


// Add or edit (edit sends the whole record), then submit an edited Draft on
// the primary save — /edit alone never moves a Draft forward.
export async function saveRecord(api, { editing, body, draft }) {
  const response = editing
    ? await api.edit({ id: editing.id, ...body, is_draft: draft, ...(editing.updated_time ? { expected_updated_time: editing.updated_time } : {}) })
    : await api.add({ ...body, is_draft: draft });
  const wasDraft = editing && String(editing.process_status_name ?? "").trim().toUpperCase() === "DRAFT";
  if (wasDraft && !draft) await api.submit({ id: editing.id, narration: "Submitted for review" });
  return response;
}

// Institution picker; locked after add (inst_profile_id can't change).
// The institution a record belongs to. Only a service provider picks it; a
// bank / fintech user is always in its own institution, so nothing shows
// and the request carries no inst_profile_id (institution scope handoff).
export function InstitutionField(props) {
  return useCanChooseInstitution() ? <InstitutionPicker {...props} /> : null;
}

function InstitutionPicker({ value, onChange, disabled }) {
  const { t } = useTranslation("notification");
  const institutions = useActiveInstitutionsQuery();
  return (
    <label className={labelClass}>
      {t("institution")} <span className="text-red-500">*</span>
      <FilterSelect
        className="mt-1.5"
        value={value ?? ""}
        disabled={disabled}
        onChange={(next) => onChange(next === "" ? "" : Number(next))}
        options={[
          { value: "", label: t("selectInstitution") },
          ...(institutions.data ?? []).map((i) => ({ value: i.id ?? i.inst_profile_id, label: i.name ?? i.inst_profile_name ?? i.code })),
        ]}
      />
    </label>
  );
}

export function FormFooter({ saving, editing, addLabel, onCancel, onSave }) {
  const { t } = useTranslation(["notification", "common"]);
  return (
    <>
      <Button variant="ghost" onClick={onCancel}>
        {t("common:cancel")}
      </Button>
      <Button variant="secondary" data-mode="draft" data-tour="save-draft" disabled={saving} onClick={() => onSave(true)} loading={saving}>
        {t("notification:saveAsDraft")}
      </Button>
      <Button data-tour="save-submit" disabled={saving} onClick={() => onSave(false)} loading={saving}>
        {editing ? t("notification:saveChanges") : addLabel}
      </Button>
    </>
  );
}

// One label/value card in a View modal.
export function ViewItem({ label, children }) {
  return (
    <div className="rounded-xl border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-700">{children ?? "-"}</dd>
    </div>
  );
}
