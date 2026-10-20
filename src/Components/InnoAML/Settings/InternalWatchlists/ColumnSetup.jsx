import { useTranslation } from "react-i18next";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { inputClass, labelClass } from "@/Components/GlobalSettings/Notifications/notificationShared";

// Which columns of an uploaded CSV/XLSX hold what: shared by Internal
// Watchlists and the Blacklist import (same server column setup).
export const LIST_FILE_ACCEPT = ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const LIST_FILE_MAX_BYTES = 10 * 1024 * 1024;
const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD-MM-YYYY", "DD.MM.YYYY"];
// Column fields that may name several columns (edited as "A, B").
const MULTI = ["name", "aliases", "countries", "remarks"];
const SINGLE = ["birth_date", "id_number", "entity_type"];

export const formatOf = (upload) => (/csv/i.test(upload?.content_type ?? "") || /\.csv$/i.test(upload?.file_name ?? "") ? "CSV" : "XLSX");
export const splitList = (text) =>
  String(text ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// Stored `columns` -> editor strings, and back (empty parts left out).
export const columnsToForm = (c = {}) => ({
  has_header: c.has_header ?? true,
  sheet: c.sheet ?? "",
  delimiter: c.delimiter ?? "",
  birth_date_format: c.birth_date_format ?? "",
  ...Object.fromEntries(MULTI.map((k) => [k, (c[k] ?? []).join(", ")])),
  ...Object.fromEntries(SINGLE.map((k) => [k, c[k] ?? ""])),
});
export const columnsFromForm = (f, format) => {
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

// The column setup fieldset. `onChange(key)` returns the field's setter.
export function ColumnSetup({ columns, format, onChange }) {
  const { t } = useTranslation("aml");
  const colInput = (key, placeholder) => (
    <label key={key} className={labelClass}>
      {t(`col_${key}`)}
      {key === "name" && <span className="text-red-500"> *</span>}
      <input value={columns[key]} onChange={(e) => onChange(key)(e.target.value)} placeholder={placeholder} className={inputClass} />
    </label>
  );
  return (
    <fieldset className="grid gap-4 rounded-xl border p-3 md:col-span-2 md:grid-cols-3">
      <legend className="px-1 text-sm font-semibold text-slate-700">{t("columnSetup")}</legend>
      <p className="text-[11px] text-muted-foreground md:col-span-3">{t("columnSetupHint")}</p>
      <div className="md:col-span-3">
        <CheckboxPill checked={columns.has_header} onChange={onChange("has_header")} label={t("hasHeader")} />
      </div>
      {format === "XLSX" ? colInput("sheet", t("firstSheet")) : colInput("delimiter", ",")}
      {colInput("name", columns.has_header ? "First name, Last name" : "A, B")}
      {colInput("aliases", columns.has_header ? "Also known as" : "C")}
      {colInput("birth_date", columns.has_header ? "DOB" : "D")}
      <label className={labelClass}>
        {t("col_birth_date_format")}
        <FilterSelect
          className="mt-1.5"
          value={columns.birth_date_format}
          onChange={onChange("birth_date_format")}
          options={[{ value: "", label: t("anyCommonFormat") }, ...DATE_FORMATS.map((f) => ({ value: f, label: f }))]}
        />
      </label>
      {colInput("countries", columns.has_header ? "Nationality" : "E")}
      {colInput("id_number", columns.has_header ? "Passport" : "F")}
      {colInput("entity_type", columns.has_header ? "Type" : "G")}
      {colInput("remarks", columns.has_header ? "Notes" : "H")}
    </fieldset>
  );
}
