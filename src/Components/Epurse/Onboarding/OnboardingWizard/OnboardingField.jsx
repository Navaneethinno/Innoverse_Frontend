import { useTranslation } from "react-i18next";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { FileUploadField } from "@/Components/Common/FileUploadField";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

// Renders one wizard field exactly as the configuration describes it
// (Customer Onboarding (Individual) — Frontend Guide §4.2). `field.input`
// picks the control; nothing here is hard-coded per field name — a new
// field the institution configures tomorrow renders correctly today.
// `file` (FILE fields): upload/download/accept/maxBytes/hint for
// FileUploadField — see customerFiles.js.
export function OnboardingField({ field, value, onChange, error, options, badge, file }) {
  const { t } = useTranslation("customer");
  const tr = useConfigLabel();
  const disabled = field.read_only;
  const disabledReason = disabled ? (field.read_only_reason ?? t("cantBeEditedNow")) : undefined;
  const commonInput =
    "w-full rounded-xl border px-3 py-2.5 text-sm disabled:bg-muted disabled:text-muted-foreground" +
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
            disabledReason={disabledReason}
          />
        );
      case "select": {
        const opts = options ?? field.options ?? [];
        return (
          <FilterSelect
            value={value ?? ""}
            onChange={onChange}
            disabled={disabled}
            disabledReason={disabledReason}
            options={[{ value: "", label: t("selectField", { label: field.label }) }, ...opts.map((o) => ({ value: o.id, label: o.name }))]}
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
            title={disabled ? disabledReason : undefined}
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
            title={disabled ? disabledReason : undefined}
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
            title={disabled ? disabledReason : undefined}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          />
        );
      case "file":
        // Uploaded on its own; the value is the stored path it returns.
        return <FileUploadField {...file} tr={tr} value={value ?? ""} onChange={onChange} disabled={disabled} />;
      default:
        return (
          <input
            type="text"
            className={commonInput}
            value={value ?? ""}
            disabled={disabled}
            title={disabled ? disabledReason : undefined}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  })();

  // data-field lets the wizard scroll to / focus a field by its key (e.g.
  // from a KYC "Last name is required" link).
  if (field.input === "checkbox") {
    return (
      <div data-field={field.key}>
        {control}
        {badge}
        {field.help_text && <p className="mt-1 text-[11px] text-muted-foreground">{field.help_text}</p>}
        {error && <p className="mt-1 text-[11px] font-semibold text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <label data-field={field.key} className="block text-sm font-semibold text-slate-700">
      {field.label}
      {field.mandatory && <span className="text-red-500"> *</span>}
      {badge}
      <div className="mt-1.5">{control}</div>
      {field.help_text && <p className="mt-1 text-[11px] font-normal text-muted-foreground">{field.help_text}</p>}
      {error && <p className="mt-1 text-[11px] font-semibold text-red-500">{error}</p>}
    </label>
  );
}
