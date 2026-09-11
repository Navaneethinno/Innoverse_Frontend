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
  "PENDING ADD": {
    label: "Pending Add",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
  },
  "PENDING EDIT": {
    label: "Pending Edit",
    dot: "bg-blue-500",
    pill: "bg-blue-50 text-blue-700 border-blue-200",
  },
  "PENDING DELETE": {
    label: "Pending Delete",
    dot: "bg-orange-500",
    pill: "bg-orange-50 text-orange-700 border-orange-200",
  },
  "PENDING DEACTIVATE": {
    label: "Pending Deactivate",
    dot: "bg-orange-500",
    pill: "bg-orange-50 text-orange-700 border-orange-200",
  },
  "PENDING REACTIVATE": {
    label: "Pending Reactivate",
    dot: "bg-blue-500",
    pill: "bg-blue-50 text-blue-700 border-blue-200",
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
// Maps each pill's background/border classes to the equivalent bare text
// color, for the "subtle" variant below — same color language, no filled
// pill/border. Falls back to the neutral slate text color for any pill not
// listed (keeps this a lookup, not a per-status duplicate palette).
const TEXT_COLOR_BY_PILL = {
  "bg-emerald-50 text-emerald-700 border-emerald-200": "text-emerald-700",
  "bg-amber-50 text-amber-700 border-amber-200": "text-amber-700",
  "bg-amber-50 text-amber-900 border-amber-300": "text-amber-900",
  "bg-blue-50 text-blue-700 border-blue-200": "text-blue-700",
  "bg-orange-50 text-orange-700 border-orange-200": "text-orange-700",
  "bg-red-50 text-red-700 border-red-200": "text-red-700",
  "bg-slate-50 text-slate-500 border-slate-200": "text-slate-500",
};

// `variant="subtle"` renders a dot + plain colored text instead of a filled
// pill — for secondary status columns (Process Status, Authorization
// Status) shown alongside the primary Status column, so three badges that
// often carry the same value in a row don't read as three loud, identical
// pills. Same color language as the solid pill, just lighter-weight.
export function StatusBadge({ status, variant = "solid" }) {
  const normalizedStatus = String(status ?? "").trim().toUpperCase();
  const cfg = STATUS_CONFIG[normalizedStatus] ?? {
    label: status,
    dot: "bg-slate-400",
    pill: "bg-slate-50 text-slate-500 border-slate-200",
  };
  if (variant === "subtle") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium",
          TEXT_COLOR_BY_PILL[cfg.pill] ?? "text-slate-500",
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
        {cfg.label}
      </span>
    );
  }
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
