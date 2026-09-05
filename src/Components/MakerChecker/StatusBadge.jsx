import { cn } from "@/Utils/Lib/cn";
const STATUS_CONFIG = {
  // Entity statuses
  ACTIVE: {
    label: "Active",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  AUTHORIZED: {
    label: "Authorized",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  "AUTH WAIT": {
    label: "Pending Add",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
  },
  NEW_WAIT_AUTH: {
    label: "Pending Add",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
  },
  INACTIVE: {
    label: "Inactive",
    dot: "bg-slate-400",
    pill: "bg-slate-50 text-slate-500 border-slate-200",
  },
  DELETED: { label: "Deleted", dot: "bg-red-500", pill: "bg-red-50 text-red-700 border-red-200" },
  DEAUTHORIZED: {
    label: "Deauthorized",
    dot: "bg-red-500",
    pill: "bg-red-50 text-red-700 border-red-200",
  },
  DEAUTH: {
    label: "Deauthorized",
    dot: "bg-red-500",
    pill: "bg-red-50 text-red-700 border-red-200",
  },
  DEACTIVATED: {
    label: "Deactivated",
    dot: "bg-red-500",
    pill: "bg-red-50 text-red-700 border-red-200",
  },
  // Finalized API auth_status values
  NEW_AUTH: {
    label: "Pending Add",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
  },
  EDIT_AUTH: {
    label: "Pending Edit",
    dot: "bg-blue-500",
    pill: "bg-blue-50 text-blue-700 border-blue-200",
  },
  DEL_AUTH: {
    label: "Pending Delete",
    dot: "bg-orange-500",
    pill: "bg-orange-50 text-orange-700 border-orange-200",
  },
  EDIT_WAIT_AUTH: {
    label: "Pending Edit",
    dot: "bg-blue-500",
    pill: "bg-blue-50 text-blue-700 border-blue-200",
  },
  EDITED: {
    label: "Pending Edit",
    dot: "bg-blue-500",
    pill: "bg-blue-50 text-blue-700 border-blue-200",
  },
  DEL_WAIT_AUTH: {
    label: "Pending Delete",
    dot: "bg-amber-800",
    pill: "bg-amber-50 text-amber-900 border-amber-300",
  },
  MOD_AUTH: {
    label: "Pending Mod",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
  },
  APPROVED: {
    label: "Approved",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  REJECTED: { label: "Rejected", dot: "bg-red-500", pill: "bg-red-50 text-red-700 border-red-200" },
  // Legacy / KYC
  ADD_AUTH: {
    label: "Pending Add",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
  },
  PENDING: {
    label: "Pending",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
  },
  VERIFIED: {
    label: "Verified",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  // Action labels
  ADD: {
    label: "Add",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  EDIT: { label: "Edit", dot: "bg-blue-500", pill: "bg-blue-50 text-blue-700 border-blue-200" },
  DELETE: { label: "Delete", dot: "bg-red-500", pill: "bg-red-50 text-red-700 border-red-200" },
  ACTIVATE: {
    label: "Activate",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  DEACTIVATE: {
    label: "Deactivate",
    dot: "bg-orange-500",
    pill: "bg-orange-50 text-orange-700 border-orange-200",
  },
};
export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    dot: "bg-slate-400",
    pill: "bg-slate-50 text-slate-500 border-slate-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        cfg.pill,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
