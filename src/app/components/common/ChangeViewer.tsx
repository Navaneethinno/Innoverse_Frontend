import { cn } from "../../lib/utils";

interface ChangeViewerProps {
  action: "ADD" | "EDIT" | "DELETE" | string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function FieldRow({ label, before, after, changed }: { label: string; before?: string; after?: string; changed?: boolean }) {
  return (
    <div className={cn("grid gap-2 py-2 border-b border-slate-50 last:border-0", before !== undefined ? "grid-cols-[1fr_1fr_1fr]" : "grid-cols-[1fr_2fr]")}>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest self-center">{label}</span>
      {before !== undefined && (
        <span className={cn("text-xs px-2 py-1 rounded-lg", changed ? "bg-red-50 text-red-700 line-through" : "text-slate-500")}>
          {before}
        </span>
      )}
      <span className={cn("text-xs px-2 py-1 rounded-lg", changed ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-700")}>
        {after}
      </span>
    </div>
  );
}

export function ChangeViewer({ action, before_data, after_data }: ChangeViewerProps) {
  const isAdd = action === "ADD";
  const isEdit = action === "EDIT";
  const isDelete = action === "DELETE";

  const data = isDelete ? before_data : after_data;
  const before = isEdit ? before_data : null;

  if (!data && !before) {
    return <p className="text-xs text-slate-400 italic">No data available</p>;
  }

  const allKeys = Array.from(new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(data ?? {}),
  ])).filter((k) => k !== "id" && k !== "created_at" && k !== "updated_at");

  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden">
      {isEdit && (
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Field</span>
          <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Before</span>
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">After</span>
        </div>
      )}
      {isAdd && (
        <div className="grid grid-cols-[1fr_2fr] gap-2 px-3 py-2 bg-emerald-50 border-b border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Field</span>
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Proposed Value</span>
        </div>
      )}
      {isDelete && (
        <div className="grid grid-cols-[1fr_2fr] gap-2 px-3 py-2 bg-red-50 border-b border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Field</span>
          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Current Value</span>
        </div>
      )}
      <div className="px-3">
        {allKeys.map((key) => {
          const beforeVal = formatValue(before?.[key]);
          const afterVal = formatValue(data?.[key]);
          const changed = isEdit && beforeVal !== afterVal;
          return (
            <FieldRow
              key={key}
              label={key.replace(/_/g, " ")}
              before={isEdit ? beforeVal : undefined}
              after={afterVal}
              changed={changed}
            />
          );
        })}
      </div>
    </div>
  );
}
