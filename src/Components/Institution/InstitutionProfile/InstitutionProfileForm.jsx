export function institutionId(inst) {
  return inst?.id ?? inst?.inst_id ?? inst?.institution_id;
}

// Shared read-only / editable field renderers used by both
// ViewInstitutionProfile and EditInstitutionProfile — extracted out of the
// old monolithic InstitutionDetailPage.jsx.
export function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
        {label}
      </p>
      <p className="text-sm text-slate-700 font-medium">
        {typeof value === "boolean" ? (value ? "Yes" : "No") : (value ?? "—")}
      </p>
    </div>
  );
}
export function EditField({ label, value, onChange, type = "text", disabled = false }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
      />
    </div>
  );
}
export function EditToggle({ label, value, onChange }) {
  return (
    <label className="flex h-10 items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
