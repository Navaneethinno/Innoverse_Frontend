import { Check } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// One pill-shaped checkbox — a filled circle with a checkmark when
// selected, an empty ring when not, matching the "Ingredients" style
// reference (rounded pill, circular indicator on the left, label right
// after it). Sized to its own content by default (`inline-flex`, no
// `w-full`) — like the reference image's pills, which hug their text
// instead of stretching to fill whatever column/row they sit in; a caller
// that genuinely wants a full-width row (e.g. a fixed-width list) can still
// pass `className="w-full"`. The indicator stays `shrink-0` and the label
// wraps inside a `min-w-0` cell rather than truncating, so a long label
// makes the pill taller/wider instead of squeezing the circle or
// overflowing.
export function CheckboxPill({ checked, onChange, label, disabled = false, disabledReason, className }) {
  return (
    <label
      title={disabled ? disabledReason : undefined}
      className={cn(
        "inline-flex max-w-full cursor-pointer select-none items-center gap-2.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
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
      <span className="min-w-0 break-words leading-snug">{label}</span>
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
    <div className={cn("flex flex-col items-start gap-2", className)}>
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
