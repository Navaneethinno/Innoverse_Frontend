import { DateInput } from "@/Components/Common/DateInput";
import { Plus, Trash2 } from "lucide-react";
import { useAudienceTranslation } from "@/Hooks/useAudienceTranslation";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { LIST_TYPES } from "./formBuilderHooks";

export const inputClass = "mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm font-normal disabled:bg-muted";

// "master.country" -> "Country", "cust_master_config.indv_document_type" ->
// "Indv document type": the source list's own name, readable.
export const sourceLabel = (source) => {
  const name = String(source ?? "").split(".").pop().replace(/_/g, " ");
  return name.charAt(0).toUpperCase() + name.slice(1);
};

// Option keys humanised for their labels: min_length -> Min length.
const optionLabel = (key) => {
  const text = key.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

function ChoicesEditor({ value, onChange, disabled }) {
  const { t } = useAudienceTranslation("formBuilder");
  const rows = Array.isArray(value) ? value : [];
  const set = (index, patch) => onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <div className="mt-1.5 flex flex-col gap-2">
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <input className={`${inputClass} !mt-0`} placeholder={t("choiceValue")} disabled={disabled} value={row.value ?? ""} onChange={(e) => set(index, { value: e.target.value })} />
          <input className={`${inputClass} !mt-0`} placeholder={t("choiceLabel")} disabled={disabled} value={row.label ?? ""} onChange={(e) => set(index, { label: e.target.value })} />
          {!disabled && (
            <button type="button" aria-label={t("remove")} onClick={() => onChange(rows.filter((_, i) => i !== index))} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button type="button" onClick={() => onChange([...rows, { value: "", label: "" }])} className="flex w-fit items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs font-bold text-primary">
          <Plus size={13} /> {t("addChoice")}
        </button>
      )}
    </div>
  );
}

// The options of one field type, one input per option, drawn from the
// vocabulary (`types[].options[]`, §4.1): `kind` picks the input. A list
// type takes either a master list (`source_table`) or its own choices,
// never both.
export function FieldOptionsEditor({ typeDef, value, onChange, vocabulary, libraryFields = [], selfKey, disabled }) {
  const { t } = useAudienceTranslation("formBuilder");
  if (!typeDef?.options?.length) return null;
  const options = value ?? {};
  const set = (key, next) => {
    const copy = { ...options };
    if (next === "" || next === undefined || next === null || (Array.isArray(next) && next.length === 0)) delete copy[key];
    else copy[key] = next;
    onChange(copy);
  };
  const isList = LIST_TYPES.has(typeDef.type);
  const listMode = options.choices ? "choices" : "source";
  const setListMode = (mode) => {
    const { choices: _c, source_table: _s, ...rest } = options;
    onChange(mode === "choices" ? { ...rest, choices: [{ value: "", label: "" }] } : rest);
  };
  // Parents a list can be narrowed by: other list fields.
  const parentOptions = libraryFields.filter((f) => LIST_TYPES.has(f.field_type) && f.key !== selfKey);

  const renderOption = (option) => {
    const { key, kind } = option;
    const label = t(`opt_${key}`, { defaultValue: optionLabel(key) });
    const help = option.help ? <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{option.help}</span> : null;
    const current = options[key];
    if (isList && key === "choices") {
      if (listMode !== "choices") return null;
      return (
        <div key={key} className="text-sm font-semibold text-slate-700 md:col-span-2">
          {t("choices")}
          <ChoicesEditor value={current} onChange={(next) => onChange({ ...options, choices: next })} disabled={disabled} />
          {help}
        </div>
      );
    }
    if (isList && key === "source_table" && listMode !== "source") return null;
    if (kind === "bool") {
      return (
        <div key={key} className="flex flex-col justify-end">
          <CheckboxPill checked={Boolean(current)} onChange={(on) => set(key, on ? true : undefined)} label={label} disabled={disabled} className="self-start" />
          {help}
        </div>
      );
    }
    let control;
    if (kind === "enum") {
      control = (
        <FilterSelect
          className="mt-1.5"
          disabled={disabled}
          value={current ?? ""}
          onChange={(next) => set(key, next)}
          options={[{ value: "", label: t("notSet") }, ...(option.enum ?? []).map((v) => ({ value: v, label: t(`enum_${v}`, { defaultValue: optionLabel(v) }) }))]}
        />
      );
    } else if (kind === "table") {
      control = (
        <FilterSelect
          className="mt-1.5"
          disabled={disabled}
          value={current ?? ""}
          onChange={(next) => set(key, next)}
          options={[{ value: "", label: t("selectList") }, ...(vocabulary?.sources ?? []).map((s) => ({ value: s, label: `${sourceLabel(s)} (${s})`, searchText: s }))]}
        />
      );
    } else if (key === "parent_field") {
      control = (
        <FilterSelect
          className="mt-1.5"
          disabled={disabled}
          value={current ?? ""}
          onChange={(next) => set(key, next)}
          options={[{ value: "", label: t("noParent") }, ...parentOptions.map((f) => ({ value: f.key, label: `${f.name} (${f.key})` }))]}
        />
      );
    } else if (kind === "string_list" && key === "allowed_types") {
      const chosen = Array.isArray(current) ? current : [];
      control = (
        <div className="mt-1.5 flex flex-wrap gap-2">
          {(vocabulary?.file_formats ?? []).map((f) => (
            <CheckboxPill
              key={f.code}
              label={f.name ?? f.code}
              disabled={disabled}
              checked={chosen.includes(f.code)}
              onChange={(on) => set(key, on ? [...chosen, f.code] : chosen.filter((c) => c !== f.code))}
            />
          ))}
        </div>
      );
    } else if (kind === "string_list") {
      control = (
        <input
          className={inputClass}
          disabled={disabled}
          placeholder={t("commaSeparated")}
          value={Array.isArray(current) ? current.join(", ") : ""}
          onChange={(e) => set(key, e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
        />
      );
    } else if (kind === "int" || kind === "number") {
      control = (
        <input
          type="number"
          step={kind === "int" ? 1 : "any"}
          className={inputClass}
          disabled={disabled}
          value={current ?? ""}
          onChange={(e) => set(key, e.target.value === "" ? undefined : Number(e.target.value))}
        />
      );
    } else if (kind === "date") {
      control = <DateInput className={inputClass} disabled={disabled} value={current ?? ""} onChange={(e) => set(key, e.target.value)} />;
    } else {
      control = <input className={inputClass} disabled={disabled} value={current ?? ""} onChange={(e) => set(key, e.target.value)} />;
    }
    return (
      <label key={key} className={`text-sm font-semibold text-slate-700${key === "pattern" || key === "pattern_message" ? " md:col-span-2" : ""}`}>
        {label}
        {control}
        {help}
      </label>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {isList && (
        <SegmentedSwitch
          className="self-start"
          value={listMode}
          onChange={disabled ? () => {} : setListMode}
          options={[
            { value: "source", label: t("fromMasterList") },
            { value: "choices", label: t("ownChoices") },
          ]}
        />
      )}
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">{typeDef.options.map(renderOption)}</div>
    </div>
  );
}
