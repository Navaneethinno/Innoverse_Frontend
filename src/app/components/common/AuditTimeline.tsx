import { useState } from "react";
import { motion } from "motion/react";
import { CheckCircle, XCircle, Clock, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../../lib/utils";
import { ChangeViewer } from "./ChangeViewer";
import type { AuditEntryOut } from "../../features/maker-checker.types";

interface AuditTimelineProps {
  entries: AuditEntryOut[];
  isLoading?: boolean;
  onContinueRejectedAdd?: (entry: AuditEntryOut) => void;
}

const glass = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.85)",
};

// ── helpers ──────────────────────────────────────────────────────────────────

function actionLabel(action: string) {
  switch (action) {
    case "ADD":      return "Created";
    case "EDIT":     return "Edited";
    case "DELETE":   return "Deleted";
    case "ACTIVATE": return "Activated";
    case "DEACTIVATE": return "Deactivated";
    default: return action;
  }
}

function lifecycleStatus(group: AuditEntryOut[]) {
  const hasCompleted  = group.some((e) => e.event_type === "LIFECYCLE_COMPLETED");
  const hasAuthorized = group.some((e) => e.event_type === "AUTHORIZED");
  const hasDeauth     = group.some((e) => e.event_type === "DEAUTHORIZED");
  const hasReject     = group.some((e) => e.decision === "REJECT");
  if (hasCompleted && hasAuthorized) return "approved";
  if (hasDeauth || hasReject)        return "rejected";
  return "pending";
}

function StatusPill({ status }: { status: "approved" | "rejected" | "pending" }) {
  const styles = {
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    pending:  "bg-amber-50 text-amber-700 border-amber-200",
  };
  const labels = { approved: "Approved", rejected: "Rejected", pending: "Pending" };
  const icons  = {
    approved: <CheckCircle size={11} />,
    rejected: <XCircle size={11} />,
    pending:  <Clock size={11} />,
  };
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", styles[status])}>
      {icons[status]} {labels[status]}
    </span>
  );
}

function actionColor(action: string) {
  switch (action) {
    case "ADD":        return "bg-emerald-50 text-emerald-700";
    case "EDIT":       return "bg-blue-50 text-blue-700";
    case "DELETE":     return "bg-red-50 text-red-700";
    case "ACTIVATE":   return "bg-emerald-50 text-emerald-700";
    case "DEACTIVATE": return "bg-orange-50 text-orange-700";
    default:           return "bg-slate-50 text-slate-600";
  }
}

// Count changed fields across before/after, including nested kyc
function countChangedFields(request: AuditEntryOut | undefined): { inst: number; kyc: number } {
  if (!request || request.action !== "EDIT") return { inst: 0, kyc: 0 };
  const before = request.before_data ?? {};
  const after  = request.after_data  ?? {};
  const SKIP   = new Set(["id", "created_at", "updated_at", "kyc"]);

  let inst = 0;
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  allKeys.forEach((k) => {
    if (SKIP.has(k)) return;
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) inst++;
  });

  let kyc = 0;
  const bKyc = (typeof before.kyc === "object" && before.kyc !== null) ? before.kyc as Record<string, unknown> : {};
  const aKyc = (typeof after.kyc  === "object" && after.kyc  !== null) ? after.kyc  as Record<string, unknown> : {};
  const kycKeys = new Set([...Object.keys(bKyc), ...Object.keys(aKyc)]);
  kycKeys.forEach((k) => {
    if (JSON.stringify(bKyc[k]) !== JSON.stringify(aKyc[k])) kyc++;
  });

  return { inst, kyc };
}

// ── Group entries by request_id ───────────────────────────────────────────────

interface RequestGroup {
  request_id: string;
  action: string;
  entries: AuditEntryOut[];
  request: AuditEntryOut | undefined;   // the REQUEST row
  latestAt: string;
  maker: string | null;
  checkers: string[];
  approvalCount: number;
  requiredCount: number;
  remark: string | null;
}

function groupByRequest(entries: AuditEntryOut[]): RequestGroup[] {
  const map = new Map<string, AuditEntryOut[]>();
  for (const e of entries) {
    const key = String(e.request_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }

  const groups: RequestGroup[] = [];
  map.forEach((rows, request_id) => {
    const sorted  = [...rows].sort((a, b) => (b.sequence_no ?? 0) - (a.sequence_no ?? 0));
    const request = rows.find((e) => e.event_type === "REQUEST");
    const checkerRows = rows.filter((e) => e.event_type === "CHECKER_DECISION" && e.checker);
    const checkers = [...new Set(checkerRows.map((e) => e.checker!.name))];
    const latest   = sorted[0];

    groups.push({
      request_id,
      action:        latest.action,
      entries:       sorted,
      request,
      latestAt:      latest.created_at,
      maker:         request?.maker?.name ?? null,
      checkers,
      approvalCount: latest.approval_count,
      requiredCount: latest.required_checker_count,
      remark:        request?.remark ?? null,
    });
  });

  // Sort groups newest first by their latest entry
  return groups.sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AuditTimeline({ entries, isLoading, onContinueRejectedAdd }: AuditTimelineProps) {
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [expandedAudit,   setExpandedAudit]   = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl animate-pulse bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="flex flex-col items-center py-12 gap-2">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
          <FileText size={20} className="text-slate-300" />
        </div>
        <p className="text-sm font-bold text-slate-500">No audit history</p>
      </div>
    );
  }

  const groups = groupByRequest(entries);

  return (
    <div className="space-y-3">
      {groups.map((group, i) => {
        const status       = lifecycleStatus(group.entries);
        const isOpen       = expandedRequest === group.request_id;
        const isAuditOpen  = expandedAudit   === group.request_id;
        const { inst, kyc } = countChangedFields(group.request);
        const canContinue  = onContinueRejectedAdd &&
          group.action === "ADD" && status === "rejected" && group.request;

        return (
          <motion.div
            key={group.request_id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl overflow-hidden"
            style={glass}
          >
            {/* ── main row ── */}
            <div
              className="flex items-start gap-3 px-4 py-3 cursor-pointer select-none"
              onClick={() => setExpandedRequest(isOpen ? null : group.request_id)}
            >
              <div className="shrink-0 mt-0.5">
                {status === "approved" && <CheckCircle size={15} className="text-emerald-500" />}
                {status === "rejected" && <XCircle     size={15} className="text-red-500" />}
                {status === "pending"  && <Clock       size={15} className="text-amber-500" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-full", actionColor(group.action))}>
                    {actionLabel(group.action)}
                  </span>
                  <StatusPill status={status} />
                  {status === "pending" && group.requiredCount > 0 && (
                    <span className="text-[10px] text-slate-400">
                      {group.approvalCount}/{group.requiredCount} approvals
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {group.maker && (
                    <span className="text-[11px] text-slate-500">
                      by <span className="font-semibold text-slate-700">{group.maker}</span>
                    </span>
                  )}
                  {group.checkers.length > 0 && (
                    <span className="text-[11px] text-slate-500">
                      reviewed by <span className="font-semibold text-slate-700">{group.checkers.join(", ")}</span>
                    </span>
                  )}
                  {group.remark && (
                    <span className="text-[11px] text-slate-400 italic">"{group.remark}"</span>
                  )}
                </div>

                {group.action === "EDIT" && (inst > 0 || kyc > 0) && (
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {inst > 0 && (
                      <span className="text-[10px] text-slate-400">
                        {inst} institution field{inst !== 1 ? "s" : ""} changed
                      </span>
                    )}
                    {kyc > 0 && (
                      <span className="text-[10px] text-slate-400">
                        {kyc} KYC field{kyc !== 1 ? "s" : ""} changed
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-slate-300">
                  {new Date(group.latestAt).toLocaleString()}
                </span>
                {isOpen ? <ChevronUp size={13} className="text-slate-300" /> : <ChevronDown size={13} className="text-slate-300" />}
              </div>
            </div>

            {/* ── expanded: change viewer + audit details ── */}
            {isOpen && (
              <div className="px-4 pb-4 border-t border-slate-100 space-y-3 pt-3">
                {group.request && (group.request.before_data || group.request.after_data) && (
                  <ChangeViewer
                    action={group.action}
                    before_data={group.request.before_data}
                    after_data={group.request.after_data}
                  />
                )}

                {canContinue && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onContinueRejectedAdd!(group.request!); }}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-indigo-600 border border-indigo-200/60 hover:bg-indigo-50/70 transition-colors"
                    >
                      Continue rejected ADD
                    </button>
                  </div>
                )}

                {/* audit details toggle */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setExpandedAudit(isAuditOpen ? null : group.request_id); }}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 underline"
                >
                  {isAuditOpen ? "Hide audit details" : "Audit details"}
                </button>

                {isAuditOpen && (
                  <div className="rounded-xl border border-slate-100 overflow-hidden text-[11px]">
                    <div className="grid grid-cols-[120px_1fr] gap-x-3 px-3 py-1.5 bg-slate-50 border-b border-slate-100 font-black text-slate-400 uppercase tracking-widest">
                      <span>Event</span><span>Detail</span>
                    </div>
                    {group.entries.map((e) => (
                      <div key={e.id} className="grid grid-cols-[120px_1fr] gap-x-3 px-3 py-1.5 border-b border-slate-50 last:border-0">
                        <span className="text-slate-500 font-semibold">{e.event_type}</span>
                        <span className="text-slate-400 font-mono break-all">
                          {e.checker ? `${e.checker.name} — ${e.decision ?? ""}` : (e.maker?.name ?? "—")}
                          {" · "}{new Date(e.created_at).toLocaleString()}
                          {e.remark ? ` · "${e.remark}"` : ""}
                        </span>
                      </div>
                    ))}
                    <div className="px-3 py-1.5 text-slate-300 font-mono">
                      request: {group.request_id}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
