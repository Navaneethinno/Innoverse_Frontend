import { Check } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// One pill-shaped checkbox row — a filled circle with a checkmark when
// selected, an empty ring when not, matching the "Ingredients" style
// reference (rounded pill, circular indicator on the left, label filling
// the rest). The indicator is `shrink-0`, and the label wraps inside a
// `min-w-0 flex-1` cell instead of forcing single-line truncation — a long
// label pushes the pill taller, never squeezes the circle out of shape or
// overflows the row.
export function CheckboxPill({ checked, onChange, label, disabled = false, className }) {
  return (
    <label
      className={cn(
        "flex w-full cursor-pointer select-none items-center gap-3 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors",
        checked ? "border-primary bg-primary-light text-slate-800" : "border-border bg-card text-slate-600 hover:border-slate-300",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
      />
      <span
        aria-hidden="true"
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-slate-300 bg-card",
        )}
      >
        {checked && <Check size={13} strokeWidth={3.5} />}
      </span>
      <span className="min-w-0 flex-1 break-words leading-snug">{label}</span>
    </label>
  );
}

// Multi-select list of CheckboxPill rows sharing one `value` (array of
// selected option values) — the common case (a checklist like
// "Ingredients") rather than every caller wiring its own toggle logic.
// `options` accepts plain strings/numbers or {value, label, disabled}
// objects so a caller with distinct display text vs. stored value doesn't
// need to pre-map anything.
export function CheckboxPillGroup({ options, value = [], onChange, disabled = false, className }) {
  const toggle = (optionValue) => {
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange?.(next);
  };
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {options.map((option) => {
        const isObject = option != null && typeof option === "object";
        const optionValue = isObject ? option.value : option;
        const label = isObject ? (option.label ?? option.value) : option;
        return (
          <CheckboxPill
            key={optionValue}
            checked={value.includes(optionValue)}
            onChange={() => toggle(optionValue)}
            label={label}
            disabled={disabled || Boolean(isObject && option.disabled)}
          />
        );
      })}
    </div>
  );
}
