export function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-8 pt-2">
      <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}
