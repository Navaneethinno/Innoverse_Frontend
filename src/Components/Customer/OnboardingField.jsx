import { Paperclip } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";

// Renders one wizard field exactly as the configuration describes it
// (Customer Onboarding (Individual) — Frontend Guide §4.2). `field.input`
// picks the control; nothing here is hard-coded per field name — a new
// field the institution configures tomorrow renders correctly today.
export function OnboardingField({ field, value, onChange, error, options, badge }) {
  const { t } = useTranslation("customer");
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
        // Real upload isn't wired up yet — a plain text input with a dense
        // placeholder read as a broken/unstyled field rather than an
        // intentionally-stubbed one. Styling it like a dashed drop-zone
        // (icon + short label) reads as "coming soon", not broken, while
        // still taking the same plain-text file-reference value.
        return (
          <div className="relative">
            <Paperclip size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              className={
                "w-full rounded-xl border border-dashed px-3 py-2.5 pl-8 text-sm placeholder:italic placeholder:text-muted-foreground disabled:bg-muted disabled:text-muted-foreground" +
                (error ? " border-red-400" : " border-border")
              }
              value={value ?? ""}
              disabled={disabled}
              title={disabled ? disabledReason : undefined}
              placeholder={t("customer:uploadComingSoon")}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        );
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

  if (field.input === "checkbox") {
    return (
      <div>
        {control}
        {badge}
        {field.help_text && <p className="mt-1 text-[11px] text-muted-foreground">{field.help_text}</p>}
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
      {field.help_text && <p className="mt-1 text-[11px] font-normal text-muted-foreground">{field.help_text}</p>}
      {error && <p className="mt-1 text-[11px] font-semibold text-red-500">{error}</p>}
    </label>
  );
}
