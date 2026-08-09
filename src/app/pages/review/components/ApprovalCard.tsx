import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, ChevronUp, Clock, GitCompare, User, XCircle } from "lucide-react";
import { InstitutionAvatar, StatusBadge } from "../../../legacy/legacy-components";
import type { PendingChange } from "../../../features/review/review.types";
import { cn } from "../../../lib/utils";

export function ApprovalCard({
  change,
  expanded,
  onToggleExpanded,
  onApprove,
  onReject,
  onCompare,
}: {
  change: PendingChange;
  expanded: boolean;
  onToggleExpanded: () => void;
  onApprove: () => void;
  onReject: () => void;
  onCompare: () => void;
}) {
  const isPending = change.status === "pending";
  return (
    <motion.div layout className={cn("bg-white rounded-2xl border shadow-sm overflow-hidden transition-opacity", !isPending && "opacity-55", change.status === "approved" ? "border-emerald-100" : change.status === "rejected" ? "border-red-100" : "border-slate-100")}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <InstitutionAvatar name={change.institutionName} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{change.institutionName}</p>
                <p className="text-xs text-slate-500 mt-0.5"><span className="font-medium text-indigo-600">{change.label}</span> change requested</p>
              </div>
              <StatusBadge status={change.status} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1.5">Before</p>
                <p className="text-xs font-mono text-red-800 break-all leading-relaxed">{change.oldValue}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mb-1.5">After</p>
                <p className="text-xs font-mono text-emerald-800 break-all leading-relaxed">{change.newValue}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-400 flex-wrap">
              <span className="flex items-center gap-1.5"><User size={11} /> {change.requestedBy}</span>
              <span className="flex items-center gap-1.5"><Clock size={11} /> {change.requestedAt}</span>
            </div>
            <AnimatePresence>
              {expanded && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-medium text-slate-600 mb-1">Reason</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{change.reason}</p>
                    <button onClick={onCompare} className="mt-2.5 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                      <GitCompare size={12} /> View full comparison →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {isPending && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <button onClick={onToggleExpanded} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-50 border border-slate-200 transition-colors">
                  {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  {expanded ? "Less" : "Details"}
                </button>
                <div className="flex-1" />
                <button onClick={onReject} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors">
                  <XCircle size={13} /> Reject
                </button>
                <button onClick={onApprove} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-md transition-all">
                  <Check size={13} /> Approve
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
