import { cn } from "../../../lib/utils";
import type { PendingChange } from "../../../features/review/review.types";

export function DiffViewer({ change, mode }: { change: PendingChange; mode: "split" | "unified" }) {
  const allFields = [
    { label: "Institution Name", old: change.institutionName, new: change.institutionName, changed: false },
    { label: change.label, old: change.oldValue, new: change.newValue, changed: true },
    { label: "Contact Phone", old: "+1 (555) 234-5678", new: "+1 (555) 234-5678", changed: false },
    { label: "Street Address", old: "100 Wall Street", new: "100 Wall Street", changed: false },
    { label: "City & State", old: "New York, NY", new: "New York, NY", changed: false },
    { label: "Institution Type", old: "Commercial Bank", new: "Commercial Bank", changed: false },
    { label: "Status", old: "Active", new: "Active", changed: false },
  ];

  if (mode === "split") {
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">{(["Before", "After"] as const).map((side) => { const isBefore = side === "Before"; return <div key={side}><div className="flex items-center gap-2 mb-3"><div className={cn("w-2 h-2 rounded-full", isBefore ? "bg-red-400" : "bg-emerald-400")} /><p className="text-sm font-semibold text-slate-600">{side}</p></div><div className={cn("bg-white rounded-2xl border shadow-sm overflow-hidden", isBefore ? "border-red-100" : "border-emerald-100")}>{allFields.map((f) => <div key={f.label} className={cn("flex items-start gap-3 px-5 py-3 border-b border-slate-50 last:border-0", f.changed && (isBefore ? "bg-red-50/60" : "bg-emerald-50/60"))}><div className="w-2 shrink-0 mt-1.5">{f.changed && <div className={cn("w-2 h-2 rounded-full", isBefore ? "bg-red-400" : "bg-emerald-400")} />}</div><div className="flex-1 min-w-0"><p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-0.5">{f.label}</p><p className={cn("text-sm break-all", f.changed ? isBefore ? "text-red-700 line-through font-medium" : "text-emerald-700 font-semibold" : "text-slate-700")}>{isBefore ? f.old : f.new}</p></div></div>)}</div></div>})}</div>;
  }

  return <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6"><div className="px-5 py-3 bg-slate-50 border-b border-slate-100"><p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Unified Diff</p></div>{allFields.map((f)=><div key={f.label} className={cn("px-5 py-4 border-b border-slate-50 last:border-0", f.changed && "bg-amber-50/30")}><p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-2">{f.label}</p>{f.changed ? <div className="space-y-1.5"><div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-red-50 border border-red-100"><span className="text-red-500 font-mono font-bold text-sm shrink-0">−</span><span className="text-sm text-red-700 line-through break-all">{f.old}</span></div><div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100"><span className="text-emerald-500 font-mono font-bold text-sm shrink-0">+</span><span className="text-sm text-emerald-700 font-semibold break-all">{f.new}</span></div></div> : <p className="text-sm text-slate-600 break-all">{f.old}</p>}</div>)}</div>;
}
