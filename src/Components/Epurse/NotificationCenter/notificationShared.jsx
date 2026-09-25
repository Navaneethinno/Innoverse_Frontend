import { useTranslation } from "react-i18next";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Spinner } from "@/Components/Common/Spinner";
import { useActiveInstitutionsQuery } from "@/Hooks/Institution/institutionHooks";
import { rowsOf } from "@/Services/Epurse/onboarding.api";

// Shared by Notification Group and Notification Alerts.

export const inputClass = "mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm disabled:bg-muted";
export const labelClass = "block text-sm font-semibold text-slate-700";
export const codeOf = (value) => String(value ?? "").toUpperCase().replace(/[^A-Z0-9_]/g, "");

// A Draft row's latest saved values live in its audit trail, not the list
// row (same as MasterResource) — load them so Edit opens what was saved.
export async function draftAwareRow(api, row) {
  if (String(row?.process_status_name ?? "").trim().toUpperCase() !== "DRAFT") return row;
  try {
    const latest = rowsOf(await api.audit({ id: row.id, page: 1, limit: 1 }))[0];
    return latest ? { ...row, ...latest } : row;
  } catch {
    return row;
  }
}

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
export function InstitutionField({ value, onChange, disabled }) {
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
      <button type="button" onClick={onCancel} className="px-3 py-2 text-sm font-bold text-muted-foreground">
        {t("common:cancel")}
      </button>
      <button type="button" data-mode="draft" disabled={saving} onClick={() => onSave(true)} className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50">
        {saving && <Spinner size={13} />}
        {t("notification:saveAsDraft")}
      </button>
      <button type="button" disabled={saving} onClick={() => onSave(false)} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {saving && <Spinner size={13} />}
        {editing ? t("notification:saveChanges") : addLabel}
      </button>
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
