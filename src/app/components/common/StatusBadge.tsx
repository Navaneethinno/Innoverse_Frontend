import { cn } from "../../lib/utils";

const STATUS_CONFIG: Record<string, { label: string; dot: string; pill: string }> = {
  ACTIVE: { label: "Active", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  INACTIVE: { label: "Inactive", dot: "bg-slate-400", pill: "bg-slate-50 text-slate-500 border-slate-200" },
  DELETED: { label: "Deleted", dot: "bg-red-500", pill: "bg-red-50 text-red-700 border-red-200" },
  ADD_AUTH: { label: "Pending Add", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700 border-amber-200" },
  EDIT_AUTH: { label: "Pending Edit", dot: "bg-blue-500", pill: "bg-blue-50 text-blue-700 border-blue-200" },
  DEL_AUTH: { label: "Pending Delete", dot: "bg-orange-500", pill: "bg-orange-50 text-orange-700 border-orange-200" },
  DEAUTH: { label: "Deauthorized", dot: "bg-red-400", pill: "bg-red-50 text-red-600 border-red-200" },
  EDIT_DEAUTH: { label: "Edit Deauthorized", dot: "bg-purple-500", pill: "bg-purple-50 text-purple-700 border-purple-200" },
  PENDING: { label: "Pending", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700 border-amber-200" },
  REJECTED: { label: "Rejected", dot: "bg-red-500", pill: "bg-red-50 text-red-700 border-red-200" },
  VERIFIED: { label: "Verified", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ADD: { label: "Add", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  EDIT: { label: "Edit", dot: "bg-blue-500", pill: "bg-blue-50 text-blue-700 border-blue-200" },
  DELETE: { label: "Delete", dot: "bg-red-500", pill: "bg-red-50 text-red-700 border-red-200" },
  ACTIVATE: { label: "Activate", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  DEACTIVATE: { label: "Deactivate", dot: "bg-orange-500", pill: "bg-orange-50 text-orange-700 border-orange-200" },
  APPROVE: { label: "Approved", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECT: { label: "Rejected", dot: "bg-red-500", pill: "bg-red-50 text-red-700 border-red-200" },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, dot: "bg-slate-400", pill: "bg-slate-50 text-slate-500 border-slate-200" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", cfg.pill)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
