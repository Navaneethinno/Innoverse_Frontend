import { motion, AnimatePresence } from "motion/react";
import { ClipboardCheck, Copy, Eye } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { ChangeViewer } from "./ChangeViewer";
import type { PendingRequestOut } from "../../features/maker-checker.types";
import { Fragment, useState } from "react";
import { cn } from "../../lib/utils";

interface PendingTableProps {
  requests: PendingRequestOut[];
  isLoading: boolean;
  currentUserId: string | number | undefined;
  onDecision: (request_id: string, decision: "approve" | "reject", remark?: string | null) => Promise<void>;
}

const glass = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "0 4px 24px rgba(108,127,255,0.08), 0 1px 3px rgba(108,127,255,0.04)",
};

const ENTITY_DISPLAY: Record<string, string> = {
  INSTITUTION: "Institution", Institution: "Institution",
  USER: "User", User: "User",
  PROFILE: "Profile", Profile: "Profile",
  APPLICATION: "Application", Application: "Application",
  INSTITUTION_APPLICATION: "Institution Application", Institution_Application: "Institution Application", InstitutionApplication: "Institution Application",
  INSTITUTION_KYC: "Institution KYC", Institution_KYC: "Institution KYC", InstitutionKYC: "Institution KYC",
  USER_KYC: "User KYC", User_KYC: "User KYC", UserKYC: "User KYC",
  MODULE: "Module", Module: "Module",
  MENU: "Menu", Menu: "Menu",
  MENU_ACTION: "Menu Action", Menu_Action: "Menu Action", MenuAction: "Menu Action",
};

const LIFECYCLE_CONFIG: Record<string, { label: string; dot: string; pill: string }> = {
  ADD_AUTH:    { label: "Awaiting authorization", dot: "bg-amber-500",   pill: "bg-amber-50 text-amber-700 border-amber-200" },
  EDIT_AUTH:   { label: "Awaiting authorization", dot: "bg-amber-500",   pill: "bg-amber-50 text-amber-700 border-amber-200" },
  DEL_AUTH:    { label: "Awaiting authorization", dot: "bg-amber-500",   pill: "bg-amber-50 text-amber-700 border-amber-200" },
  PENDING:     { label: "Awaiting authorization", dot: "bg-amber-500",   pill: "bg-amber-50 text-amber-700 border-amber-200" },
  DEAUTH:      { label: "Rejected",               dot: "bg-red-500",     pill: "bg-red-50 text-red-700 border-red-200" },
  EDIT_DEAUTH: { label: "Rejected",               dot: "bg-red-500",     pill: "bg-red-50 text-red-700 border-red-200" },
  REJECTED:    { label: "Rejected",               dot: "bg-red-500",     pill: "bg-red-50 text-red-700 border-red-200" },
  ACTIVE:      { label: "Authorized",             dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  VERIFIED:    { label: "Authorized",             dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const ACTION_COLORS: Record<string, string> = {
  ADD:        "bg-emerald-50 text-emerald-700",
  EDIT:       "bg-blue-50 text-blue-700",
  DELETE:     "bg-red-50 text-red-700",
  ACTIVATE:   "bg-teal-50 text-teal-700",
  DEACTIVATE: "bg-orange-50 text-orange-700",
};

function LifecycleBadge({ status }: { status: string }) {
  const cfg = LIFECYCLE_CONFIG[status] ?? { label: status, dot: "bg-slate-400", pill: "bg-slate-50 text-slate-500 border-slate-200" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap", cfg.pill)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function checkerWorkflowLabel(req: PendingRequestOut): string {
  const mode  = req.checker_mode ?? "ANY";
  const count = req.checker_assignments?.length ?? 0;
  if (mode === "ASSIGNED_SEQUENTIAL") {
    const step  = req.sequence_no ?? 1;
    const total = req.required_checker_count ?? count;
    return `Step ${step} of ${total} · Sequential`;
  }
  if (mode === "ASSIGNED_PARALLEL") return `${count} checker${count !== 1 ? "s" : ""} · Parallel`;
  return "Any checker";
}

function getEntityName(req: PendingRequestOut): string {
  const after  = (req.after_data  ?? {}) as Record<string, unknown>;
  const before = (req.before_data ?? {}) as Record<string, unknown>;
  return String(after.name ?? after.username ?? after.code ?? before.name ?? before.username ?? before.code ?? req.entity_id);
}

function isFinalizedStatus(status: string) {
  return ["REJECTED", "APPROVED", "AUTHORIZED", "DEAUTHORIZED", "LIFECYCLE_COMPLETED", "ACTIVE", "VERIFIED"].includes(status);
}

// ── Copy-to-clipboard ────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={copy} className="ml-1 text-slate-300 hover:text-indigo-400 transition-colors shrink-0" title="Copy">
      {copied ? <span className="text-[9px] text-emerald-500 font-bold">✓</span> : <Copy size={10} />}
    </button>
  );
}

// ── Confirmation dialog ──────────────────────────────────────────────────────

interface DialogProps {
  req: PendingRequestOut;
  decision: "approve" | "reject";
  onConfirm: (remark: string | null) => void;
  onCancel: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20 shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-slate-700 font-medium">{value}</span>
    </div>
  );
}

function ConfirmDialog({ req, decision, onConfirm, onCancel }: DialogProps) {
  const [remark, setRemark] = useState("");
  const isApprove  = decision === "approve";
  const entityName = getEntityName(req);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.35)", backdropFilter: "blur(4px)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={glass}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-black text-slate-800 mb-1">
          {isApprove ? "Approve Request" : "Reject Request"}
        </h2>
        <p className="text-xs text-slate-400 mb-4">Review the request details before confirming.</p>

        <div className="space-y-2 mb-4 rounded-xl bg-slate-50/80 border border-slate-100 p-3">
          <Row label="Entity"   value={`${entityName} · ${ENTITY_DISPLAY[req.entity_type] ?? req.entity_type}`} />
          <Row label="Action"   value={req.action} />
          <Row label="Maker"    value={req.maker?.name ?? "—"} />
          <Row label="Progress" value={`${req.approval_count} / ${req.required_checker_count} approvals`} />
          <Row label="Workflow" value={checkerWorkflowLabel(req)} />
        </div>

        <label className="block text-xs font-semibold text-slate-600 mb-1">
          Remark {!isApprove && <span className="text-slate-400">(optional)</span>}
        </label>
        <textarea
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          rows={2}
          placeholder={isApprove ? "Optional remark…" : "Reason for rejection…"}
          className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-300 mb-4"
        />

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(remark.trim() || null)}
            className={cn("px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-colors", isApprove ? "shadow-emerald-200/50" : "shadow-red-200/50")}
            style={{ background: isApprove ? "linear-gradient(135deg,#6EDFC4,#3BBFA0)" : "linear-gradient(135deg,#FF8C6B,#FF5C5C)" }}
          >
            {isApprove ? "Approve" : "Reject"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Expanded metadata + ChangeViewer ────────────────────────────────────────

function ExpandedDetail({ req }: { req: PendingRequestOut }) {
  const assignments    = (req.checker_assignments ?? []) as Array<Record<string, unknown>>;
  const isSequential   = req.checker_mode === "ASSIGNED_SEQUENTIAL";
  const entityIdDisplay = req.entity_id != null ? String(req.entity_id) : "—";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4">
      {/* Lifecycle metadata */}
      <div className="rounded-xl border border-slate-100 bg-white/60 p-4 space-y-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Lifecycle Metadata</p>
        {(([
          ["Audit Key",   req.audit_key,   true],
          ["Request ID",  req.request_id,  true],
          ["Sequence",    req.sequence_no != null ? String(req.sequence_no) : "—", false],
          ["Entity Type", ENTITY_DISPLAY[req.entity_type] ?? req.entity_type, false],
          ["Entity ID",   entityIdDisplay, false],
          ["Maker",       req.maker?.name ?? "—", false],
          ["Checker Mode",checkerWorkflowLabel(req), false],
          ["Progress",    `${req.approval_count} / ${req.required_checker_count}`, false],
          ["Remark",      req.remark ?? "—", false],
          ["Submitted",   req.created_at ? new Date(req.created_at).toLocaleString() : "—", false],
        ]) as [string, string, boolean][]).map(([label, value, isUuid]) => (
          <div key={label} className="flex items-start gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24 shrink-0 pt-0.5">{label}</span>
            <span className={cn("break-all flex items-center gap-0.5", isUuid ? "font-mono text-[9px] text-slate-400" : "text-xs text-slate-600 font-medium")}>
              {value}
              {isUuid && value !== "—" && <CopyButton value={value} />}
            </span>
          </div>
        ))}

        {assignments.length > 0 && (
          <div className="pt-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Assigned Checkers</p>
            <div className="space-y-1">
              {assignments
                .slice()
                .sort((a, b) => ((a.sequence as number) ?? 0) - ((b.sequence as number) ?? 0))
                .map((a, idx) => {
                  const name = String(a.checker_name ?? a.user_name ?? a.username ?? a.checker_id ?? a.user_id ?? "—");
                  const seq  = a.sequence ?? a.sequence_no;
                  return (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                      {isSequential && seq != null && (
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-black flex items-center justify-center shrink-0">
                          {String(seq)}
                        </span>
                      )}
                      <span>{name}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* ChangeViewer — wider column */}
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Data Changes</p>
        <ChangeViewer
          action={req.action}
          before_data={req.before_data}
          after_data={req.after_data}
        />
      </div>
    </div>
  );
}

// ── Main table ───────────────────────────────────────────────────────────────

export function PendingTable({ requests, isLoading, currentUserId, onDecision }: PendingTableProps) {
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [dialog,     setDialog]     = useState<{ req: PendingRequestOut; decision: "approve" | "reject" } | null>(null);

  const handleConfirm = async (remark: string | null) => {
    if (!dialog) return;
    const { req, decision } = dialog;
    setDialog(null);
    setProcessing(req.request_id);
    await onDecision(req.request_id, decision, remark);
    setProcessing(null);
  };

  const COLS = ["Request / Entity", "Action", "Status", "Maker", "Checker Workflow", "Progress", "Remark", "Actions"];

  return (
    <>
      <AnimatePresence>
        {dialog && (
          <ConfirmDialog
            req={dialog.req}
            decision={dialog.decision}
            onConfirm={handleConfirm}
            onCancel={() => setDialog(null)}
          />
        )}
      </AnimatePresence>

      <div className="rounded-2xl overflow-hidden" style={glass}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100/80">
              {COLS.map((h, idx) => (
                <th key={h} className={cn("px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest", idx === 0 ? "text-left first:pl-5" : "text-center")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: COLS.length }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  ))}
                </tr>
              ))
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={COLS.length} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                      <ClipboardCheck size={20} className="text-emerald-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-600">All caught up</p>
                    <p className="text-xs text-slate-400">No pending requests match your filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              requests.map((req, i) => {
                const isMaker      = String(req.maker?.id) === String(currentUserId);
                const isFinalized  = isFinalizedStatus(req.auth_status);
                const isExpanded   = expanded === req.request_id;
                const isProcessing = processing === req.request_id;
                const entityName   = getEntityName(req);
                const actionClass  = ACTION_COLORS[req.action] ?? "bg-slate-50 text-slate-600";

                return (
                  <Fragment key={req.request_id}>
                    <motion.tr
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className={cn("border-b border-slate-50 hover:bg-white/60 transition-colors cursor-pointer", isExpanded && "bg-white/60")}
                      onClick={() => setExpanded(isExpanded ? null : req.request_id)}
                    >
                      {/* Request / Entity — wider */}
                      <td className="px-4 py-3 pl-5 min-w-[200px] w-[22%]">
                        <p className="text-xs font-semibold text-slate-800 truncate max-w-[220px]">{entityName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{ENTITY_DISPLAY[req.entity_type] ?? req.entity_type}</p>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-center">
                        <span className={cn("inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase", actionClass)}>
                          {req.action}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <LifecycleBadge status={req.auth_status} />
                      </td>

                      {/* Maker */}
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap text-center">{req.maker?.name ?? "—"}</td>

                      {/* Checker Workflow */}
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap text-center">{checkerWorkflowLabel(req)}</td>

                      {/* Progress */}
                      <td className="px-4 py-3 text-center">
                        <span className={cn("text-xs font-bold", isFinalized ? "text-emerald-600" : "text-amber-600")}>
                          {req.approval_count}/{req.required_checker_count}
                        </span>
                      </td>

                      {/* Remark */}
                      <td className="px-4 py-3 text-xs text-slate-400 max-w-[100px] truncate text-center">{req.remark ?? "—"}</td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {isMaker ? (
                          <button
                            onClick={() => setExpanded(isExpanded ? null : req.request_id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-500 border border-slate-200/60 hover:bg-slate-50 transition-colors"
                          >
                            <Eye size={10} /> View
                          </button>
                        ) : isFinalized ? (
                          <span className="text-[11px] text-emerald-600 font-bold">Completed</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <motion.button
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              disabled={isProcessing}
                              onClick={() => setDialog({ req, decision: "reject" })}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-red-500 border border-red-200/60 hover:bg-red-50/60 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              disabled={isProcessing}
                              onClick={() => setDialog({ req, decision: "approve" })}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-white shadow-md shadow-emerald-200/50 disabled:opacity-50"
                              style={{ background: "linear-gradient(135deg,#6EDFC4,#3BBFA0)" }}
                            >
                              Approve
                            </motion.button>
                          </div>
                        )}
                      </td>
                    </motion.tr>

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <tr key={`${req.request_id}-detail`} className="bg-slate-50/60">
                        <td colSpan={COLS.length} className="px-5 py-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-black text-slate-600 tracking-tight">Request Details</span>
                            <button
                              onClick={() => setExpanded(null)}
                              className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
                            >
                              Collapse ↑
                            </button>
                          </div>
                          <ExpandedDetail req={req} />
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
    </>
  );
}
