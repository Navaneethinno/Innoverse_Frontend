import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, ChevronUp, Clock, User, X } from "lucide-react";
import type { PendingChange } from "../../../features/review/review.types";
import { cn } from "../../../lib/utils";

const glass = {
  background: "rgba(255,255,255,0.68)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.88)",
  boxShadow: "0 4px 20px rgba(108,127,255,0.07), 0 1px 3px rgba(108,127,255,0.04)",
};

const STATUS_STYLES: Record<string, { pill: string; dot: string; label: string }> = {
  PENDING:  { pill: "bg-amber-50 text-amber-700 border-amber-200",     dot: "bg-amber-400",   label: "Pending" },
  pending:  { pill: "bg-amber-50 text-amber-700 border-amber-200",     dot: "bg-amber-400",   label: "Pending" },
  APPROVED: { pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-400", label: "Approved" },
  approved: { pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-400", label: "Approved" },
  REJECTED: { pill: "bg-red-50 text-red-700 border-red-200",           dot: "bg-red-400",     label: "Rejected" },
  rejected: { pill: "bg-red-50 text-red-700 border-red-200",           dot: "bg-red-400",     label: "Rejected" },
};

export function ApprovalCard({ change, expanded, onToggleExpanded, onApprove, onReject, isOwnRequest }: {
  change: PendingChange;
  expanded: boolean;
  onToggleExpanded: () => void;
  onApprove: () => void;
  onReject: () => void;
  onCompare: () => void;
  isOwnRequest?: boolean;
}) {
  const statusKey = String(change.auth_status ?? change.status ?? "PENDING");
  const statusCfg = STATUS_STYLES[statusKey] ?? STATUS_STYLES.PENDING;
  const isPending = statusKey === "PENDING" || statusKey === "pending";

  const displayName = change.name || change.legal_name || change.code || "—";
  const location = [change.city, change.state, change.country].filter(Boolean).join(", ") || null;

  return (
    <motion.div
      layout
      className={cn("rounded-2xl overflow-hidden transition-opacity", !isPending && "opacity-55")}
      style={glass}
    >
      <div className="p-5">
        <div className="flex items-start gap-3.5">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C7FFF] to-[#B39DFA] flex items-center justify-center text-white text-sm font-black shrink-0 shadow-md shadow-indigo-200/40">
            {displayName.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate tracking-tight">{displayName}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  <span className="text-indigo-500 font-bold">{change.process_type ?? "Change"}</span> request · Code: {change.code}
                </p>
              </div>
              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0", statusCfg.pill)}>
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusCfg.dot)} />
                {statusCfg.label}
              </span>
            </div>

            {/* Info grid */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {change.email && (
                <div className="p-2.5 rounded-xl" style={{ background: "rgba(108,127,255,0.04)", border: "1px solid rgba(108,127,255,0.08)" }}>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Email</p>
                  <p className="text-xs text-slate-600 truncate">{change.email}</p>
                </div>
              )}
              {change.phone && (
                <div className="p-2.5 rounded-xl" style={{ background: "rgba(108,127,255,0.04)", border: "1px solid rgba(108,127,255,0.08)" }}>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Phone</p>
                  <p className="text-xs text-slate-600 truncate">{change.phone}</p>
                </div>
              )}
              {location && (
                <div className="p-2.5 rounded-xl col-span-2" style={{ background: "rgba(108,127,255,0.04)", border: "1px solid rgba(108,127,255,0.08)" }}>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Location</p>
                  <p className="text-xs text-slate-600">{location}</p>
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400 font-medium flex-wrap">
              {change.created_by != null && (
                <span className="flex items-center gap-1.5"><User size={10} /> Created by {change.created_by?.name ?? "-"}</span>
              )}
              {change.reviewed_by != null && (
                <span className="flex items-center gap-1.5"><Clock size={10} /> Reviewed by {change.reviewed_by?.name ?? "-"}</span>
              )}
            </div>

            {/* Expanded remarks */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 p-3 rounded-xl" style={{ background: "rgba(108,127,255,0.05)", border: "1px solid rgba(108,127,255,0.10)" }}>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Remarks</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{change.remarks || "No remarks provided"}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            {isPending && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <button
                  onClick={onToggleExpanded}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-500 hover:bg-slate-100/80 border border-slate-200/60 transition-colors"
                >
                  {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  {expanded ? "Less" : "Details"}
                </button>
                {isOwnRequest && (
                  <span className="text-[10px] text-amber-600 font-semibold ml-1">Maker cannot approve own request</span>
                )}
                <div className="flex-1" />
                <motion.button
                  whileHover={{ scale: isOwnRequest ? 1 : 1.03 }} whileTap={{ scale: isOwnRequest ? 1 : 0.97 }}
                  onClick={onReject}
                  disabled={isOwnRequest}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold text-red-500 border border-red-200/60 hover:bg-red-50/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <X size={12} /> Reject
                </motion.button>
                <motion.button
                  whileHover={{ scale: isOwnRequest ? 1 : 1.03 }} whileTap={{ scale: isOwnRequest ? 1 : 0.97 }}
                  onClick={onApprove}
                  disabled={isOwnRequest}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold text-white shadow-md shadow-emerald-200/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #6EDFC4 0%, #3BBFA0 100%)" }}
                >
                  <Check size={12} /> Approve
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
