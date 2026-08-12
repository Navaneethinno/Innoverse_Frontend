import { motion } from "motion/react";
import { Check, X, ClipboardCheck } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { ChangeViewer } from "./ChangeViewer";
import type { PendingRequestOut } from "../../features/maker-checker.types";
import { Fragment, useState } from "react";
import { cn } from "../../lib/utils";

interface PendingTableProps {
  requests: PendingRequestOut[];
  isLoading: boolean;
  currentUserId: string | number | undefined;
  onApprove: (request_id: string) => Promise<void>;
  onReject: (request_id: string) => Promise<void>;
  entityLabel?: string;
}

const glass = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "0 4px 24px rgba(108,127,255,0.08), 0 1px 3px rgba(108,127,255,0.04)",
};

function getEntityLabel(req: PendingRequestOut) {
  const after = (req.after_data ?? {}) as Record<string, unknown>;
  const before = (req.before_data ?? {}) as Record<string, unknown>;
  return String(after.name ?? after.username ?? after.code ?? before.name ?? before.username ?? before.code ?? req.entity_id);
}

function getActionClass(action: string) {
  switch (action) {
    case "ADD":
      return "bg-emerald-50 text-emerald-700";
    case "EDIT":
      return "bg-blue-50 text-blue-700";
    case "DELETE":
      return "bg-red-50 text-red-700";
    case "ACTIVATE":
      return "bg-emerald-50 text-emerald-700";
    case "DEACTIVATE":
      return "bg-orange-50 text-orange-700";
    default:
      return "bg-slate-50 text-slate-600";
  }
}

function isFinalizedStatus(status: string) {
  return ["REJECTED", "APPROVED", "AUTHORIZED", "DEAUTHORIZED", "LIFECYCLE_COMPLETED"].includes(status);
}

export function PendingTable({ requests, isLoading, currentUserId, onApprove, onReject, entityLabel = "record" }: PendingTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    await onApprove(id);
    setProcessing(null);
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    await onReject(id);
    setProcessing(null);
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={glass}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100/80">
            {["Audit Key", "Request ID", "Action", "Status", "Entity", "Maker", "Checker Mode", "Approvals", "Remark", "Actions"].map((h) => (
              <th key={h} className="text-center px-4 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-50">
                {Array.from({ length: 10 }).map((_, j) => (
                  <td key={j} className="px-4 py-3.5"><Skeleton className="h-4 w-20 mx-auto" /></td>
                ))}
              </tr>
            ))
          ) : requests.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-5 py-14 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <ClipboardCheck size={20} className="text-emerald-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">All caught up</p>
                  <p className="text-xs text-slate-400">No pending {entityLabel} requests</p>
                </div>
              </td>
            </tr>
          ) : (
            requests.map((req, i) => {
              const after = (req.after_data ?? {}) as Record<string, unknown>;
              const isMaker = String(req.maker?.id) === String(currentUserId);
              const isCompleted = isFinalizedStatus(req.auth_status);
              const isExpanded = expanded === req.request_id;
              const isProcessing = processing === req.request_id;
              const entityName = getEntityLabel(req);
              const checkerMode = req.checker_mode ?? (req.checker_assignments?.length ? "ASSIGNED_PARALLEL" : "ANY");
              const checkerLabel = checkerMode === "ASSIGNED_SEQUENTIAL"
                ? "Assigned Sequential"
                : checkerMode === "ASSIGNED_PARALLEL"
                  ? "Assigned Parallel"
                  : "Any";
              const actionClass = getActionClass(req.action);

              return (
                <Fragment key={req.request_id}>
                  <motion.tr
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className={cn("border-b border-slate-50 hover:bg-white/60 transition-colors cursor-pointer", isExpanded && "bg-white/60")}
                    onClick={() => setExpanded(isExpanded ? null : req.request_id)}
                  >
                    <td className="px-4 py-3 text-center text-[10px] font-mono text-slate-500">{req.audit_key}</td>
                    <td className="px-4 py-3 text-center text-[10px] font-mono text-slate-500">{req.request_id}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase", actionClass)}>
                        {req.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-[10px] font-bold text-slate-500">{req.auth_status}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 text-center">{entityName}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 text-center">{req.maker?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">{checkerLabel}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("text-xs font-bold", isCompleted ? "text-emerald-600" : "text-amber-600")}>
                        {req.approval_count} / {req.required_checker_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 text-center max-w-[120px] truncate">{req.remark ?? "—"}</td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {isMaker ? (
                        <span className="text-[11px] text-slate-400 italic">View only</span>
                      ) : isCompleted ? (
                        <span className="text-[11px] text-emerald-600 font-bold">Completed</span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            disabled={isProcessing}
                            onClick={() => void handleReject(req.request_id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-red-500 border border-red-200/60 hover:bg-red-50/60 transition-colors disabled:opacity-50"
                          >
                            <X size={10} /> Reject
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            disabled={isProcessing}
                            onClick={() => void handleApprove(req.request_id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-white shadow-md shadow-emerald-200/50 disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg, #6EDFC4 0%, #3BBFA0 100%)" }}
                          >
                            <Check size={10} /> Approve
                          </motion.button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                  {isExpanded && (
                    <tr key={`${req.request_id}-detail`} className="bg-slate-50/60">
                      <td colSpan={10} className="px-6 py-4">
                        <ChangeViewer
                          action={req.action}
                          before_data={req.before_data}
                          after_data={req.after_data}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
