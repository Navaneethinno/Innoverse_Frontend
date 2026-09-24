import { Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { CheckboxPill, CheckboxPillGroup } from "@/Components/Common/CheckboxPill";

// Spec-driven editor for one array of a customer-type / KYC-scheme
// configuration (sections, fields, documents, rules, levels, ...). Each item
// renders as a card of inputs described by `spec`:
//   { key, label, type: text|number|date|bool|select|multi|list|custom,
//     options?: [{value,label}] | (item) => [...], required?, hint?,
//     showIf?: (item) => bool, disabled?: (item) => bool, defaultValue?,
//     addTo?: [masterPath, label] (select: an add row with that already-
//       translated label, e.g. t("onboarding:addValidationRule"), opening that master),
//     spec?/addLabel? (type "list": a nested ListEditor),
//     render?: (item, setItem) => node (type "custom"), wide?: bool }
// Items are plain objects held by the caller, so the whole configuration can
// be built in memory and sent once (guide §8.2).
const inputClass = "mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm disabled:bg-muted disabled:text-muted-foreground";

export function FieldInput({ field, item, setItem, readOnly, readOnlyReason }) {
  const navigate = useNavigate();
  const { t } = useTranslation("onboarding");
  const value = item[field.key];
  const fieldDisabled = Boolean(field.disabled?.(item));
  const disabled = readOnly || fieldDisabled;
  // readOnly (the whole editor is frozen/view-only) takes precedence over a
  // single field's own `disabled` rule (e.g. "Mandatory" locked once this
  // document has a group_code) — whichever one actually applied is the
  // reason worth showing.
  const disabledReason = readOnly
    ? readOnlyReason
    : fieldDisabled
      ? (typeof field.disabledReason === "function" ? field.disabledReason(item) : field.disabledReason)
      : undefined;
  const set = (next) => setItem({ ...item, [field.key]: next });
  const options = typeof field.options === "function" ? field.options(item) : (field.options ?? []);

  if (field.type === "bool") {
    return (
      <CheckboxPill
        checked={value ?? field.defaultValue ?? false}
        onChange={set}
        label={field.label}
        disabled={disabled}
        disabledReason={disabledReason}
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
          readOnlyReason={disabledReason}
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
          disabledReason={disabledReason}
          addAction={field.addTo ? { label: field.addTo[1], onClick: () => navigate(field.addTo[0]) } : undefined}
          options={[{ value: "", label: field.placeholder ?? t("select") }, ...options]}
        />
      ) : field.type === "multi" ? (
        <div className="mt-1.5" title={disabled ? disabledReason : undefined}>
          <CheckboxPillGroup options={options} value={value ?? []} onChange={set} disabled={disabled} className="flex-row flex-wrap" />
        </div>
      ) : (
        <input
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          min={field.type === "number" ? 0 : undefined}
          value={value ?? ""}
          disabled={disabled}
          title={disabled ? disabledReason : undefined}
          onChange={(e) => set(field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
          className={inputClass}
        />
      )}
      {field.hint && <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{field.hint}</span>}
    </label>
  );
}

const visible = (spec, item) => spec.filter((f) => !f.showIf || f.showIf(item));

// Every non-bool field before every checkbox pill, mirroring
// formFieldColumns.js's orderedFields (same reasoning: a checkbox row
// stretching to match a tall input's height next to it looks padded, so
// pills get grouped together below the inputs) — with the same one
// exception that fix added: a field with its own `showIf` (e.g.
// "Verification method", shown once "Verification required" is checked)
// stays glued immediately after the nearest preceding checkbox instead of
// moving up with the other inputs. Left as the plain "all non-bool first"
// split, checking "Verification required" made "Verification method"
// appear at the very TOP of the card, among unrelated fields like "Order",
// instead of next to the checkbox that revealed it.
function orderedFields(spec, item) {
  const leading = [];
  const booleanGroups = [];
  for (const field of visible(spec, item)) {
    if (field.type === "bool") {
      booleanGroups.push({ field, followers: [] });
      continue;
    }
    const owner = field.showIf && booleanGroups[booleanGroups.length - 1];
    if (owner) owner.followers.push(field);
    else leading.push(field);
  }
  return [leading, booleanGroups.flatMap(({ field, followers }) => [field, ...followers])];
}

// The checkbox group renders as a plain 2-column CSS grid with items
// auto-flowing left-to-right, top-to-bottom — fine as long as every cell
// is the same short pill height, but a checkbox+follower run (e.g.
// "Number required" + its revealed "Number validation rule" select) is
// taller than a lone pill, and grid auto-placement doesn't know the two
// are a unit: it pairs whatever comes next in document order into the
// OTHER column of that same row, e.g. "Issue date required" landing next
// to "Number validation rule" purely by position, throwing every row
// after it out of alignment between the two columns. Splitting into two
// explicit vertical stacks instead — each run (a checkbox plus its own
// followers) kept whole, handed to whichever stack is currently shorter —
// guarantees a run never straddles a row shared with unrelated content.
function splitIntoColumns(fields) {
  const runs = [];
  for (const field of fields) {
    if (field.type === "bool" || runs.length === 0) runs.push([field]);
    else runs[runs.length - 1].push(field);
  }
  const columns = [[], []];
  const weights = [0, 0];
  for (const run of runs) {
    const lighter = weights[0] <= weights[1] ? 0 : 1;
    columns[lighter].push(...run);
    weights[lighter] += run.length;
  }
  return columns;
}

export function ListEditor({ items, onChange, spec, addLabel, itemTitle, readOnly = false, readOnlyReason, emptyText, seed, nested = false }) {
  const { t } = useTranslation(["onboarding", "common"]);
  const update = (index, next) => onChange(items.map((item, i) => (i === index ? next : item)));
  const remove = (index) => onChange(items.filter((_, i) => i !== index));
  const add = () => {
    const blank = Object.fromEntries(spec.filter((f) => f.defaultValue !== undefined).map((f) => [f.key, f.defaultValue]));
    onChange([...items, blank]);
  };
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && <p className="text-sm text-muted-foreground">{emptyText ?? t("onboarding:nothingAddedYet")}</p>}
      {items.map((item, index) => (
        <div key={index} className={`rounded-2xl border p-4 ${nested ? "bg-muted/60" : ""}`}>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">{itemTitle ? itemTitle(item, index) : `#${index + 1}`}</h4>
            {!readOnly && (
              <button
                type="button"
                onClick={() => remove(index)}
                className="flex items-center gap-1 text-xs font-bold text-red-600"
                aria-label={t("onboarding:remove")}
              >
                <Trash2 size={13} /> Remove
              </button>
            )}
          </div>
          {/* Inputs first (plain grid auto-flow — every cell there is a
              similar-height label+input, so pairing across a row is fine),
              then every checkbox pill grouped together below as two
              explicit column stacks (splitIntoColumns) rather than grid
              auto-flow, since a checkbox+showIf-follower run is taller
              than a lone pill and auto-flow doesn't know to keep it out of
              an unrelated row. */}
          {(() => {
            const [leading, booleans] = orderedFields(spec, item);
            const columns = splitIntoColumns(booleans).filter((column) => column.length > 0);
            return (
              <>
                {leading.length > 0 && (
                  <div className="grid items-start gap-x-6 gap-y-4 md:grid-cols-2">
                    {leading.map((field) => (
                      <FieldInput key={field.key} field={field} item={item} setItem={(next) => update(index, next)} readOnly={readOnly} readOnlyReason={readOnlyReason} />
                    ))}
                  </div>
                )}
                {columns.length > 0 && (
                  <div className={`grid items-start gap-x-6 gap-y-4 ${columns.length > 1 ? "md:grid-cols-2" : ""} ${leading.length > 0 ? "mt-4" : ""}`}>
                    {columns.map((column, c) => (
                      <div key={c} className="flex flex-col gap-4">
                        {column.map((field) => (
                          <FieldInput key={field.key} field={field} item={item} setItem={(next) => update(index, next)} readOnly={readOnly} readOnlyReason={readOnlyReason} />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      ))}
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={add}
            className="flex items-center gap-1.5 self-start rounded-xl border px-4 py-2 text-sm font-bold text-primary"
          >
            <Plus size={14} /> {addLabel ?? t("common:add")}
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
