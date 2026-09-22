import { useTranslation } from "react-i18next";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { blockNegativeKeyDown, blurOnWheel, clampNonNegative } from "@/Utils/Lib/numberInput";

export function institutionId(inst) {
  return inst?.id ?? inst?.inst_id ?? inst?.institution_id;
}

// Shared read-only / editable field renderers used by both
// ViewInstitutionProfile and EditInstitutionProfile — extracted out of the
// old monolithic InstitutionDetailPage.jsx.
export function Field({ label, value }) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
        {label}
      </p>
      <p className="text-sm text-slate-700 font-medium">
        {typeof value === "boolean" ? (value ? t("common:yes") : t("common:no")) : (value ?? "—")}
      </p>
    </div>
  );
}
export function EditField({ label, value, onChange, type = "text", disabled = false }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
        {label}
      </label>
      <input
        type={type}
        min={type === "number" ? 0 : undefined}
        value={value}
        onKeyDown={type === "number" ? blockNegativeKeyDown : undefined}
        onWheel={type === "number" ? blurOnWheel : undefined}
        onChange={(e) => onChange?.(type === "number" ? clampNonNegative(e.target.value) : e.target.value)}
        disabled={disabled}
        className="h-10 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
      />
    </div>
  );
}
export function EditSelect({ label, value, onChange, options, placeholder, disabled = false }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
        {label}
      </label>
      <FilterSelect
        value={value}
        onChange={(next) => onChange?.(next)}
        disabled={disabled}
        options={[{ value: "", label: placeholder }, ...options]}
      />
    </div>
  );
}
export function EditToggle({ label, value, onChange }) {
  return (
    <label className="flex h-10 items-center justify-between rounded-xl border border-border px-3 py-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
