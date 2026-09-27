import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ListChecks } from "lucide-react";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { FileUploadField } from "@/Components/Common/FileUploadField";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { useAuth } from "@/Hooks/useAuth";
import { amlInternalListApi } from "@/Services/InnoAML/aml.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";
import { notifications, apiMessage } from "@/Utils/Lib/notifications";
import { FormFooter, InstitutionField, codeOf, inputClass, labelClass, saveRecord } from "@/Components/Epurse/NotificationCenter/notificationShared";
import { useInstitutionScope } from "../../Shared/amlShared";
import { ValidationResult } from "./ValidationResult";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const ENTITY_TYPES = ["ANY", "PERSON", "ORGANIZATION"];
const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD-MM-YYYY", "DD.MM.YYYY"];
// Column fields that may name several columns (edited as "A, B").
const MULTI = ["name", "aliases", "countries", "remarks"];
const SINGLE = ["birth_date", "id_number", "entity_type"];

const formatOf = (upload) => (/csv/i.test(upload?.content_type ?? "") || /\.csv$/i.test(upload?.file_name ?? "") ? "CSV" : "XLSX");
const splitList = (text) =>
  String(text ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// Stored `columns` -> editor strings, and back (empty parts left out).
const columnsToForm = (c = {}) => ({
  has_header: c.has_header ?? true,
  sheet: c.sheet ?? "",
  delimiter: c.delimiter ?? "",
  birth_date_format: c.birth_date_format ?? "",
  ...Object.fromEntries(MULTI.map((k) => [k, (c[k] ?? []).join(", ")])),
  ...Object.fromEntries(SINGLE.map((k) => [k, c[k] ?? ""])),
});
const columnsFromForm = (f, format) => {
  const out = { has_header: f.has_header };
  if (format === "XLSX" && f.sheet.trim()) out.sheet = f.sheet.trim();
  if (format === "CSV" && f.delimiter) out.delimiter = f.delimiter;
  MULTI.forEach((k) => {
    const list = splitList(f[k]);
    if (list.length) out[k] = list;
  });
  SINGLE.forEach((k) => {
    if (String(f[k]).trim()) out[k] = String(f[k]).trim();
  });
  if (f.birth_date_format) out.birth_date_format = f.birth_date_format;
  return out;
};

// Add / edit an internal watchlist: upload the file, describe its columns,
// validate (nothing is stored), then save. Edit with a new file replaces
// the list's entries completely. Rows that can't be screened refuse the
// save unless "skip invalid rows" is ticked deliberately.
export function InternalWatchlistForm({ editing, onClose, onSaved }) {
  const { t } = useTranslation(["aml", "common"]);
  const tr = useConfigLabel();
  const scope = useInstitutionScope();
  const myInstitution = useAuth((state) => state.user?.inst_profile_id);
  const [form, setForm] = useState(() => ({
    inst_profile_id: editing?.inst_profile_id ?? myInstitution ?? "",
    code: editing?.code ?? "",
    name: editing?.name ?? "",
    description: editing?.description ?? "",
    default_entity_type: editing?.default_entity_type ?? "ANY",
    file_path: editing?.file_path ?? "",
    file_name: editing?.file_name ?? "",
    file_format: editing?.file_format ?? "CSV",
    skip_invalid_rows: editing?.skip_invalid_rows ?? false,
  }));
  const [columns, setColumns] = useState(() => columnsToForm(editing?.columns));
  const [result, setResult] = useState(null);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setResult(null);
  };
  const setColumn = (key) => (value) => {
    setColumns((c) => ({ ...c, [key]: value }));
    setResult(null);
  };

  const upload = async (file) => {
    const data = await amlInternalListApi.upload({ ...scope(form.inst_profile_id), file });
    set({ file_name: data.file_name, file_format: formatOf(data) });
    return data;
  };

  const payload = () => ({
    inst_profile_id: Number(form.inst_profile_id),
    code: form.code,
    file_path: form.file_path,
    default_entity_type: form.default_entity_type,
    columns: columnsFromForm(columns, form.file_format),
  });

  const validate = async () => {
    if (!form.file_path || !splitList(columns.name).length) {
      notifications.error(t("aml:fileAndNameNeeded"));
      return;
    }
    setValidating(true);
    try {
      setResult(rowsOf(await amlInternalListApi.validate(payload()))[0] ?? null);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setValidating(false);
    }
  };

  const save = async (draft) => {
    setSaving(true);
    try {
      const { inst_profile_id, code, ...rest } = payload();
      const body = {
        ...rest,
        name: form.name.trim(),
        description: form.description.trim(),
        file_name: form.file_name,
        file_format: form.file_format,
        skip_invalid_rows: form.skip_invalid_rows,
        ...(editing ? {} : { inst_profile_id, code }),
      };
      const response = await saveRecord(amlInternalListApi, { editing, body, draft });
      notifications.success(apiMessage(response, t("aml:listSaved")));
      onSaved();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const invalidRows = result ? Math.max(0, (result.rows ?? 0) - (result.valid ?? 0)) : 0;
  const colInput = (key, placeholder) => (
    <label key={key} className={labelClass}>
      {t(`aml:col_${key}`)}
      {key === "name" && <span className="text-red-500"> *</span>}
      <input value={columns[key]} onChange={(e) => setColumn(key)(e.target.value)} placeholder={placeholder} className={inputClass} />
    </label>
  );
  const addLabel = t("aml:addList");

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={editing ? t("aml:editList") : addLabel}
      footer={<FormFooter saving={saving} editing={editing} addLabel={addLabel} onCancel={onClose} onSave={(draft) => void save(draft)} />}
    >
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
        <InstitutionField value={form.inst_profile_id} disabled={Boolean(editing)} onChange={(v) => set({ inst_profile_id: v, file_path: "", file_name: "" })} />
        <label className={labelClass}>
          {t("aml:code")} <span className="text-red-500">*</span>
          <input value={form.code} disabled={Boolean(editing)} maxLength={32} onChange={(e) => set({ code: codeOf(e.target.value) })} className={`${inputClass} font-mono`} placeholder="FRAUD" />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("aml:codeHint")}</span>
        </label>
        <label className={labelClass}>
          {t("aml:name")} <span className="text-red-500">*</span>
          <input value={form.name} onChange={(e) => set({ name: e.target.value })} className={inputClass} />
        </label>
        <label className={labelClass}>
          {t("aml:defaultEntityType")}
          <FilterSelect className="mt-1.5" value={form.default_entity_type} onChange={(v) => set({ default_entity_type: v })} options={ENTITY_TYPES.map((v) => ({ value: v, label: t(`aml:entity_${v}`) }))} />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          {t("common:description")}
          <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} className={`${inputClass} min-h-14`} />
        </label>

        <div className={`${labelClass} md:col-span-2`}>
          {t("aml:listFile")} <span className="text-red-500">*</span>
          <FileUploadField
            tr={tr}
            value={form.file_path}
            onChange={(path) => set(path ? { file_path: path } : { file_path: "", file_name: "" })}
            upload={upload}
            disabled={!form.inst_profile_id}
            accept={ACCEPT}
            maxBytes={MAX_BYTES}
            uploadLabel={form.inst_profile_id ? "Upload file" : "Select an institution first"}
            hint={form.file_name ? `${form.file_name} · ${form.file_format}` : t("aml:listFileHint")}
          />
        </div>

        <fieldset className="grid gap-4 rounded-xl border p-3 md:col-span-2 md:grid-cols-3">
          <legend className="px-1 text-sm font-semibold text-slate-700">{t("aml:columnSetup")}</legend>
          <p className="text-[11px] text-muted-foreground md:col-span-3">{t("aml:columnSetupHint")}</p>
          <div className="md:col-span-3">
            <CheckboxPill checked={columns.has_header} onChange={setColumn("has_header")} label={t("aml:hasHeader")} />
          </div>
          {form.file_format === "XLSX"
            ? colInput("sheet", t("aml:firstSheet"))
            : colInput("delimiter", ",")}
          {colInput("name", columns.has_header ? "First name, Last name" : "A, B")}
          {colInput("aliases", columns.has_header ? "Also known as" : "C")}
          {colInput("birth_date", columns.has_header ? "DOB" : "D")}
          <label className={labelClass}>
            {t("aml:col_birth_date_format")}
            <FilterSelect
              className="mt-1.5"
              value={columns.birth_date_format}
              onChange={setColumn("birth_date_format")}
              options={[{ value: "", label: t("aml:anyCommonFormat") }, ...DATE_FORMATS.map((f) => ({ value: f, label: f }))]}
            />
          </label>
          {colInput("countries", columns.has_header ? "Nationality" : "E")}
          {colInput("id_number", columns.has_header ? "Passport" : "F")}
          {colInput("entity_type", columns.has_header ? "Type" : "G")}
          {colInput("remarks", columns.has_header ? "Notes" : "H")}
        </fieldset>

        <div className="space-y-3 md:col-span-2">
          <button
            type="button"
            disabled={validating || !form.file_path}
            onClick={() => void validate()}
            className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold text-primary disabled:opacity-50"
          >
            {validating ? <Spinner size={13} /> : <ListChecks size={14} />} {t("aml:validate")}
          </button>
          <ValidationResult result={result} />
          {(invalidRows > 0 || form.skip_invalid_rows) && (
            <div>
              <CheckboxPill checked={form.skip_invalid_rows} onChange={(checked) => setForm((f) => ({ ...f, skip_invalid_rows: checked }))} label={t("aml:skipInvalidRows")} />
              <p className="mt-1 text-[11px] text-muted-foreground">{t("aml:skipInvalidRowsHint")}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
