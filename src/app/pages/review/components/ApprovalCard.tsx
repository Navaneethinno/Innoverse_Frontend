import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, ChevronUp, Clock, GitCompare, User, X } from "lucide-react";
import { StatusBadge } from "../../../legacy/legacy-components";
import type { PendingChange } from "../../../features/review/review.types";
import { cn } from "../../../lib/utils";

const glass = {
  background: "rgba(255,255,255,0.68)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.88)",
  boxShadow: "0 4px 20px rgba(108,127,255,0.07), 0 1px 3px rgba(108,127,255,0.04)",
};

export function ApprovalCard({ change, expanded, onToggleExpanded, onApprove, onReject, onCompare }: {
  change: PendingChange;
  expanded: boolean;
  onToggleExpanded: () => void;
  onApprove: () => void;
  onReject: () => void;
  onCompare: () => void;
}) {
  const isPending = change.status === "pending";

  return (
    <motion.div
      layout
      className={cn("rounded-2xl overflow-hidden transition-opacity", !isPending && "opacity-50")}
      style={glass}
    >
      <div className="p-5">
        <div className="flex items-start gap-3.5">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C7FFF] to-[#B39DFA] flex items-center justify-center text-white text-sm font-black shrink-0 shadow-md shadow-indigo-200/40">
            {change.institutionName.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate tracking-tight">{change.institutionName}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  <span className="text-indigo-500 font-bold">{change.label}</span> change requested
                </p>
              </div>
              <StatusBadge status={change.status} />
            </div>

            {/* Diff blocks */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl" style={{ background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.14)" }}>
                <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1.5">Before</p>
                <p className="text-xs font-mono text-red-700 break-all leading-relaxed">{change.oldValue}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: "rgba(110,223,196,0.08)", border: "1px solid rgba(110,223,196,0.20)" }}>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1.5">After</p>
                <p className="text-xs font-mono text-emerald-700 break-all leading-relaxed">{change.newValue}</p>
              </div>
            </div>

            {/* Meta */}
            <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400 font-medium flex-wrap">
              <span className="flex items-center gap-1.5"><User size={10} /> {change.requestedBy}</span>
              <span className="flex items-center gap-1.5"><Clock size={10} /> {change.requestedAt}</span>
            </div>

            {/* Expanded reason */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 p-3 rounded-xl" style={{ background: "rgba(108,127,255,0.05)", border: "1px solid rgba(108,127,255,0.10)" }}>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reason</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{change.reason}</p>
                    <button
                      onClick={onCompare}
                      className="mt-2.5 flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 font-bold transition-colors"
                    >
                      <GitCompare size={11} /> Full comparison →
                    </button>
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
                <div className="flex-1" />
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={onReject}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold text-red-500 border border-red-200/60 hover:bg-red-50/60 transition-colors"
                >
                  <X size={12} /> Reject
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={onApprove}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold text-white shadow-md shadow-emerald-200/50 transition-shadow hover:shadow-lg"
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
