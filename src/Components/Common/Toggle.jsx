import { cn } from "@/Utils/Lib/utils";

// The app's on/off switch: the knob slides, the track takes the brand
// colour when on. `label` names it for screen readers (and is shown beside
// it when `showLabel`).
export function Toggle({ checked, onChange, disabled = false, label, showLabel = false, className }) {
  const knob = (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50", checked ? "bg-primary" : "bg-slate-300", !showLabel && className)}
    >
      <span className={cn("absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out", checked && "translate-x-5")} />
    </button>
  );
  if (!showLabel) return knob;
  return (
    <label className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-slate-700", disabled && "cursor-default", className)}>
      <span>{label}</span>
      {knob}
    </label>
  );
}
