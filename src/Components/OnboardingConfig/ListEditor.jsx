import { Plus, Trash2 } from "lucide-react";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { CheckboxPill, CheckboxPillGroup } from "@/Components/Common/CheckboxPill";

// Spec-driven editor for one array of a customer-type / KYC-scheme
// configuration (sections, fields, documents, rules, levels, ...). Each item
// renders as a card of inputs described by `spec`:
//   { key, label, type: text|number|date|bool|select|multi|list|custom,
//     options?: [{value,label}] | (item) => [...], required?, hint?,
//     showIf?: (item) => bool, disabled?: (item) => bool, defaultValue?,
//     spec?/addLabel? (type "list": a nested ListEditor),
//     render?: (item, setItem) => node (type "custom"), wide?: bool }
// Items are plain objects held by the caller, so the whole configuration can
// be built in memory and sent once (guide §8.2).
const inputClass = "mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-500";

export function FieldInput({ field, item, setItem, readOnly }) {
  const value = item[field.key];
  const disabled = readOnly || Boolean(field.disabled?.(item));
  const set = (next) => setItem({ ...item, [field.key]: next });
  const options = typeof field.options === "function" ? field.options(item) : (field.options ?? []);

  if (field.type === "bool") {
    return (
      <CheckboxPill
        checked={value ?? field.defaultValue ?? false}
        onChange={set}
        label={field.label}
        disabled={disabled}
        className="self-start"
      />
    );
  }
  if (field.type === "list") {
    return (
      <div className="md:col-span-2">
        <p className="mb-1.5 text-sm font-semibold text-slate-700">{field.label}</p>
        <ListEditor
          items={value ?? []}
          onChange={set}
          spec={field.spec}
          addLabel={field.addLabel}
          itemTitle={field.itemTitle}
          readOnly={disabled}
          nested
        />
      </div>
    );
  }
  if (field.type === "custom") {
    return <div className={field.wide ? "md:col-span-2" : undefined}>{field.render(item, (patch) => setItem({ ...item, ...patch }), disabled)}</div>;
  }
  return (
    <label className={`text-sm font-semibold text-slate-700 ${field.wide ? "md:col-span-2" : ""}`}>
      {field.label}
      {field.required && <span className="text-red-500"> *</span>}
      {field.type === "select" ? (
        <FilterSelect
          className="mt-1.5"
          value={value ?? ""}
          onChange={set}
          disabled={disabled}
          options={[{ value: "", label: field.placeholder ?? "Select..." }, ...options]}
        />
      ) : field.type === "multi" ? (
        <div className="mt-1.5">
          <CheckboxPillGroup options={options} value={value ?? []} onChange={set} disabled={disabled} className="flex-row flex-wrap" />
        </div>
      ) : (
        <input
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          min={field.type === "number" ? 0 : undefined}
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => set(field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
          className={inputClass}
        />
      )}
      {field.hint && <span className="mt-1 block text-[11px] font-normal text-slate-400">{field.hint}</span>}
    </label>
  );
}

const visible = (spec, item) => spec.filter((f) => !f.showIf || f.showIf(item));

export function ListEditor({ items, onChange, spec, addLabel = "Add", itemTitle, readOnly = false, emptyText, seed, nested = false }) {
  const update = (index, next) => onChange(items.map((item, i) => (i === index ? next : item)));
  const remove = (index) => onChange(items.filter((_, i) => i !== index));
  const add = () => {
    const blank = Object.fromEntries(spec.filter((f) => f.defaultValue !== undefined).map((f) => [f.key, f.defaultValue]));
    onChange([...items, blank]);
  };
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && <p className="text-sm text-slate-500">{emptyText ?? "Nothing added yet."}</p>}
      {items.map((item, index) => (
        <div key={index} className={`rounded-2xl border p-4 ${nested ? "bg-slate-50/60" : ""}`}>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">{itemTitle ? itemTitle(item, index) : `#${index + 1}`}</h4>
            {!readOnly && (
              <button
                type="button"
                onClick={() => remove(index)}
                className="flex items-center gap-1 text-xs font-bold text-red-600"
                aria-label="Remove"
              >
                <Trash2 size={13} /> Remove
              </button>
            )}
          </div>
          {/* Inputs first, then every checkbox pill grouped together below,
              filling left then right — so pills never sit next to a tall input. */}
          {[visible(spec, item).filter((f) => f.type !== "bool"), visible(spec, item).filter((f) => f.type === "bool")].map(
            (group, g) =>
              group.length > 0 && (
                <div key={g} className={`grid items-start gap-x-6 gap-y-4 md:grid-cols-2 ${g === 1 ? "mt-4" : ""}`}>
                  {group.map((field) => (
                    <FieldInput key={field.key} field={field} item={item} setItem={(next) => update(index, next)} readOnly={readOnly} />
                  ))}
                </div>
              ),
          )}
        </div>
      ))}
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={add}
            className="flex items-center gap-1.5 self-start rounded-xl border px-4 py-2 text-sm font-bold text-primary"
          >
            <Plus size={14} /> {addLabel}
          </button>
          {seed && (
            <button type="button" onClick={seed.onClick} className="self-start rounded-xl border px-4 py-2 text-sm font-bold text-slate-600">
              {seed.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Drops empty/unset members (guide §5.4: "omit a parameter to mean not set";
// 0 and false are real values) so save_config only carries what the user
// actually filled in. Recurses through nested arrays/objects.
export function cleanConfig(value) {
  if (Array.isArray(value)) return value.map(cleanConfig);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== "" && v !== null && v !== undefined && !(typeof v === "number" && Number.isNaN(v)))
        .map(([k, v]) => [k, cleanConfig(v)]),
    );
  }
  return value;
}
