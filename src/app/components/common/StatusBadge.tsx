import { cn } from "../../lib/utils";
import type { InstStatus } from "../../features/institution/institution.types";

const STATUS_CONFIG: Record<string, { label: string; dot: string; pill: string }> = {
  active: { label: "Active", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { label: "Pending", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700 border-amber-200" },
  rejected: { label: "Rejected", dot: "bg-red-500", pill: "bg-red-50 text-red-700 border-red-200" },
  suspended: { label: "Suspended", dot: "bg-orange-500", pill: "bg-orange-50 text-orange-700 border-orange-200" },
  draft: { label: "Draft", dot: "bg-slate-400", pill: "bg-slate-50 text-slate-500 border-slate-200" },
  approved: { label: "Approved", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export function StatusBadge({ status }: { status: InstStatus | string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", cfg.pill)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

