import { FilterSelect } from "@/Components/Common/FilterSelect";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";

// Renders one wizard field exactly as the configuration describes it
// (Customer Onboarding (Individual) — Frontend Guide §4.2). `field.input`
// picks the control; nothing here is hard-coded per field name — a new
// field the institution configures tomorrow renders correctly today.
export function OnboardingField({ field, value, onChange, error, options, badge }) {
  const disabled = field.read_only;
  const commonInput =
    "w-full rounded-xl border px-3 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-400" +
    (error ? " border-red-400" : " border-border");

  const control = (() => {
    switch (field.input) {
      case "checkbox":
        return (
          <CheckboxPill
            checked={Boolean(value)}
            onChange={(checked) => onChange(checked)}
            label={field.label}
            disabled={disabled}
          />
        );
      case "select": {
        const opts = options ?? field.options ?? [];
        return (
          <FilterSelect
            value={value ?? ""}
            onChange={onChange}
            disabled={disabled}
            options={[{ value: "", label: `Select ${field.label}` }, ...opts.map((o) => ({ value: o.id, label: o.name }))]}
          />
        );
      }
      case "date":
        return (
          <input
            type="date"
            className={commonInput}
            value={value ?? ""}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "datetime":
        return (
          <input
            type="datetime-local"
            className={commonInput}
            value={value ?? ""}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "number":
      case "decimal":
        return (
          <input
            type="number"
            step={field.input === "decimal" ? "any" : "1"}
            className={commonInput}
            value={value ?? ""}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          />
        );
      case "file":
        return (
          <input
            type="text"
            className={commonInput}
            value={value ?? ""}
            disabled={disabled}
            placeholder="File reference (upload not available yet)"
            onChange={(e) => onChange(e.target.value)}
          />
        );
      default:
        return (
          <input
            type="text"
            className={commonInput}
            value={value ?? ""}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  })();

  if (field.input === "checkbox") {
    return (
      <div>
        {control}
        {badge}
        {field.help_text && <p className="mt-1 text-[11px] text-slate-400">{field.help_text}</p>}
        {error && <p className="mt-1 text-[11px] font-semibold text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <label className="block text-sm font-semibold text-slate-700">
      {field.label}
      {field.mandatory && <span className="text-red-500"> *</span>}
      {badge}
      <div className="mt-1.5">{control}</div>
      {field.help_text && <p className="mt-1 text-[11px] font-normal text-slate-400">{field.help_text}</p>}
      {error && <p className="mt-1 text-[11px] font-semibold text-red-500">{error}</p>}
    </label>
  );
}
