import { motion } from "motion/react";
import { AlertCircle, History } from "lucide-react";
import { Skeleton } from "@/Components/UI/skeleton";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { useInstitutionAuditQuery } from "@/Hooks/Institutions/institutionHooks";

// Field labels/order confirmed against a real POST /institution/profile/audit
// response — see institutionHooks.js's mapInstitutionListResponse comment
// for the full envelope shape this was verified against.
const AUDIT_FIELDS = [
  ["code", "Code"],
  ["name", "Name"],
  ["type", "Type"],
  ["timezone", "Timezone"],
  ["date_format", "Date Format"],
  ["has_branch", "Has Branch"],
  ["max_branches_allowed", "Max Branches"],
  ["kyc_enabled", "KYC Enabled"],
  ["total_kyc_levels", "Total KYC Levels"],
];

function formatValue(value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === "" || value == null) return "—";
  return String(value);
}

function formatTimestamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function AuditEntry({ entry }) {
  const status = String(entry.auth_status ?? entry.status ?? "").toUpperCase();
  return (
    <div className="rounded-xl border border-slate-100 bg-white/70 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
            {entry.audit_action ?? "—"}
          </span>
          <StatusBadge status={status} />
        </div>
        <p className="text-[11px] text-slate-400 font-mono">{entry.audit_key ?? ""}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {AUDIT_FIELDS.map(([key, label]) => (
          <div key={key}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {label}
            </p>
            <p className="text-xs font-medium text-slate-700">{formatValue(entry[key])}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-1 gap-1.5 sm:grid-cols-2 text-[11px] text-slate-500">
        <p>
          Created by <span className="font-semibold text-slate-600">{entry.created_by ?? "—"}</span>{" "}
          · {formatTimestamp(entry.created_time)}
        </p>
        <p>
          Updated by{" "}
          <span className="font-semibold text-slate-600">
            {entry.updated_by && entry.updated_by !== "NA" ? entry.updated_by : "—"}
          </span>{" "}
          · {formatTimestamp(entry.updated_time)}
        </p>
        {entry.deauth_narration ? (
          <p className="sm:col-span-2 text-amber-700">Reason: {entry.deauth_narration}</p>
        ) : null}
      </div>
    </div>
  );
}

export function InstitutionAuditModal({ institution, institutionId, onClose }) {
  const auditQuery = useInstitutionAuditQuery(institutionId);
  const entries = auditQuery.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={16} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800">
              Audit — {institution?.name ?? institution?.code ?? `#${institutionId}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-sm font-bold text-slate-400 hover:text-slate-700"
          >
            Close
          </button>
        </div>

        {auditQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : auditQuery.error ? (
          <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            <AlertCircle size={14} /> {auditQuery.error.message}
          </div>
        ) : entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No audit history found.</p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, i) => (
              <AuditEntry key={entry.id ?? entry.audit_key ?? i} entry={entry} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
