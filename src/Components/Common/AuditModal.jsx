import { X } from "lucide-react";
import { motion } from "motion/react";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";

function formatValue(value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value == null || value === "" || value === "UNDEFINED") return "—";
  return String(value);
}

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function recordsFrom(data) {
  if (Array.isArray(data)) return data;
  return data?.data?.user_audit_array ?? data?.data?.audit_array ?? data?.data ?? [];
}

function AuditRecord({ record }) {
  const excluded = new Set([
    "id", "audit_key", "audit_action", "auth_status", "status", "process_status",
    "created_by", "created_userid", "created_time", "updated_by", "updated_userid", "updated_time",
  ]);
  const fields = Object.entries(record).filter(([key]) => !excluded.has(key) && typeof record[key] !== "object");
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-600">
            {record.audit_action ?? "Audit"}
          </span>
          <StatusBadge status={String(record.auth_status ?? record.status ?? "")} />
        </div>
        <span className="text-[10px] font-mono text-slate-400">{record.audit_key ?? ""}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3">
        {fields.map(([key, value]) => (
          <div key={key}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{key.replaceAll("_", " ")}</p>
            <p className="text-xs font-medium text-slate-700">{formatValue(value)}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-1 border-t border-slate-100 pt-3 text-[11px] text-slate-500 sm:grid-cols-2">
        <p>Created by <b>{record.created_by ?? "—"}</b> · {formatTime(record.created_time)}</p>
        <p>Updated by <b>{record.updated_by ?? "—"}</b> · {formatTime(record.updated_time)}</p>
      </div>
    </div>
  );
}

export function AuditModal({ title, data, onClose }) {
  const records = recordsFrom(data);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4"
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} aria-label="Close audit">
            <X />
          </button>
        </div>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
          {records.length > 0 ? records.map((record, index) => (
            <AuditRecord key={record.id ?? record.audit_key ?? index} record={record} />
          )) : <p className="py-10 text-center text-sm text-slate-400">No audit history found.</p>}
        </div>
      </motion.div>
    </div>
  );
}
