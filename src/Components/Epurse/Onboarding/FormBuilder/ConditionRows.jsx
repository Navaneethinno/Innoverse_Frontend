import { Plus, Trash2 } from "lucide-react";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { inputClass } from "./FieldOptionsEditor";

// The condition rows shared by Rules, Flows and Checkpoints: field,
// operator, value. All rows must hold.
const OPERATORS = ["EQ", "NEQ", "GT", "GTE", "LT", "LTE", "IN", "NOT_IN", "BETWEEN", "IS_SET", "IS_EMPTY"];
// The age in whole years from a DATE field to today.
const AGE_OPERATORS = ["AGE_LT", "AGE_LTE", "AGE_GT", "AGE_GTE", "AGE_BETWEEN"];
export const LIST_OPERATORS = new Set(["IN", "NOT_IN", "BETWEEN", "AGE_BETWEEN"]);
export const NO_VALUE = new Set(["IS_SET", "IS_EMPTY"]);

// Facts about the minor's guardian, offered in checkpoint conditions only:
// where the request stands, and whether the guardian is at the KYC level.
export const GUARDIAN_FIELD = "@guardian_status";
const GUARDIAN_STATUSES = ["NOT_FOUND", "FOUND", "PENDING", "APPROVED", "LINKED", "DECLINED"];
const GUARDIAN_OPERATORS = ["EQ", "NEQ", "IN", "NOT_IN"];
const LEVEL_MET_FIELD = "@guardian_level_met";
const YES_NO = ["YES", "NO"];
const YES_NO_OPERATORS = ["EQ", "NEQ"];

// Condition values are typed as text; numbers go back as numbers (a list
// field is compared with the chosen row's id).
export const parseValue = (text) => {
  const trimmed = String(text ?? "").trim();
  return trimmed !== "" && !Number.isNaN(Number(trimmed)) ? Number(trimmed) : trimmed;
};
const valueText = (value) => (Array.isArray(value) ? value.join(", ") : (value ?? ""));

// A condition as the server takes it (no draft text, no value when the
// operator has none).
export const cleanCondition = ({ _text, ...c }) => (NO_VALUE.has(c.operator) ? { field: c.field, operator: c.operator } : c);

// `fields`: [{ key, label, field_type }]. `guardian`: offer @guardian_status.
export function ConditionRows({ conditions, onChange, fields, guardian = false, disabled, t }) {
  const rows = conditions ?? [];
  const setAt = (i, patch) => onChange(rows.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const typeOf = (key) => fields.find((f) => f.key === key)?.field_type;
  const fieldOptions = [
    { value: "", label: t("formBuilder:pickField") },
    ...(guardian
      ? [
          { value: GUARDIAN_FIELD, label: t("formBuilder:guardianStatusField") },
          { value: LEVEL_MET_FIELD, label: t("formBuilder:guardianLevelMetField") },
        ]
      : []),
    ...fields.map((f) => ({ value: f.key, label: `${f.label} (${f.key})` })),
  ];
  const operatorsFor = (field) =>
    field === GUARDIAN_FIELD ? GUARDIAN_OPERATORS : field === LEVEL_MET_FIELD ? YES_NO_OPERATORS : typeOf(field) === "DATE" ? [...OPERATORS, ...AGE_OPERATORS] : OPERATORS;

  const valueInput = (c, i) => {
    if (NO_VALUE.has(c.operator)) return <span />;
    if (c.field === LEVEL_MET_FIELD) {
      return (
        <FilterSelect
          disabled={disabled}
          value={typeof c.value === "string" ? c.value : ""}
          onChange={(v) => setAt(i, { value: v })}
          options={[{ value: "", label: t("formBuilder:value") }, ...YES_NO.map((v) => ({ value: v, label: t(`formBuilder:levelMet_${v}`) }))]}
        />
      );
    }
    if (c.field === GUARDIAN_FIELD) {
      if (c.operator === "IN" || c.operator === "NOT_IN") {
        const chosen = Array.isArray(c.value) ? c.value : [];
        return (
          <div className="flex flex-wrap gap-1.5">
            {GUARDIAN_STATUSES.map((s) => (
              <CheckboxPill
                key={s}
                disabled={disabled}
                checked={chosen.includes(s)}
                onChange={(on) => setAt(i, { value: on ? [...chosen, s] : chosen.filter((x) => x !== s) })}
                label={t(`formBuilder:guardian_${s}`, { defaultValue: s })}
              />
            ))}
          </div>
        );
      }
      return (
        <FilterSelect
          disabled={disabled}
          value={typeof c.value === "string" ? c.value : ""}
          onChange={(v) => setAt(i, { value: v })}
          options={[{ value: "", label: t("formBuilder:value") }, ...GUARDIAN_STATUSES.map((s) => ({ value: s, label: t(`formBuilder:guardian_${s}`, { defaultValue: s }) }))]}
        />
      );
    }
    const age = c.operator?.startsWith("AGE_");
    return (
      <input
        className={`${inputClass} !mt-0`}
        disabled={disabled}
        inputMode={age ? "numeric" : undefined}
        placeholder={c.operator === "AGE_BETWEEN" ? "16, 17" : age ? t("formBuilder:ageYears") : LIST_OPERATORS.has(c.operator) ? t("formBuilder:valuesCommaSeparated") : t("formBuilder:value")}
        value={c._text ?? valueText(c.value)}
        onChange={(e) =>
          setAt(i, {
            _text: e.target.value,
            value: LIST_OPERATORS.has(c.operator) ? e.target.value.split(",").map(parseValue).filter((v) => v !== "") : parseValue(e.target.value),
          })
        }
      />
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {rows.map((c, i) => (
        <div key={i} className="grid items-start gap-2 md:grid-cols-[2fr_1fr_2fr_auto]">
          <FilterSelect
            disabled={disabled}
            value={c.field ?? ""}
            onChange={(v) => {
              // An operator the new field doesn't take falls back to EQ.
              const ok = operatorsFor(v).includes(c.operator ?? "EQ");
              setAt(i, { field: v, ...(ok ? {} : { operator: "EQ", value: undefined, _text: undefined }) });
            }}
            options={fieldOptions}
          />
          <FilterSelect
            disabled={disabled}
            value={c.operator ?? "EQ"}
            onChange={(v) => setAt(i, { operator: v, value: undefined, _text: undefined })}
            options={operatorsFor(c.field).map((o) => ({ value: o, label: t(`formBuilder:op_${o}`, { defaultValue: o }) }))}
          />
          {valueInput(c, i)}
          {!disabled && (
            <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={t("formBuilder:remove")}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button type="button" onClick={() => onChange([...rows, { field: "", operator: "EQ" }])} className="flex w-fit items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs font-bold text-primary">
          <Plus size={13} /> {t("formBuilder:addCondition")}
        </button>
      )}
    </div>
  );
}
