import { motion } from "motion/react";
import { AlertCircle, CalendarClock, History, User, X } from "lucide-react";
import { Skeleton } from "@/Components/UI/skeleton";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { useInstitutionAuditQuery } from "@/Hooks/Institutions/institutionHooks";
import { cn } from "@/Utils/Lib/utils";

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

// Values the backend sends as literal placeholder strings for "no value" —
// treated the same as null/empty so the UI doesn't surface them as if they
// were real data (matches the existing updated_by !== "NA" precedent below).
const EMPTY_PLACEHOLDERS = new Set(["", "na", "n/a", "undefined", "null"]);

function isEmptyPlaceholder(value) {
  return value == null || EMPTY_PLACEHOLDERS.has(String(value).trim().toLowerCase());
}

function formatValue(value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return isEmptyPlaceholder(value) ? "—" : String(value);
}

function formatTimestamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

// Keyed off the real POST /institution/profile/audit auth_status values
// (see StatusBadge.jsx's STATUS_CONFIG for the full confirmed set).
const STATUS_ACCENT = {
  ACTIVE: "border-l-success",
  AUTHORIZED: "border-l-success",
  APPROVED: "border-l-success",
  VERIFIED: "border-l-success",
  "AUTH WAIT": "border-l-warning",
  NEW_AUTH: "border-l-warning",
  EDIT_AUTH: "border-l-warning",
  DEL_AUTH: "border-l-warning",
  DEL_WAIT_AUTH: "border-l-warning",
  MOD_AUTH: "border-l-warning",
  ADD_AUTH: "border-l-warning",
  PENDING: "border-l-warning",
  REJECTED: "border-l-destructive",
  DEAUTHORIZED: "border-l-destructive",
  DEAUTH: "border-l-destructive",
  DEACTIVATED: "border-l-destructive",
  DELETED: "border-l-destructive",
};

function AuditEntry({ entry }) {
  const status = String(entry.auth_status ?? entry.status ?? "").toUpperCase();
  const reason = entry.deauth_narration;

  return (
    <div
      className={cn(
        "rounded-xl border border-l-4 bg-card p-4",
        STATUS_ACCENT[status] ?? "border-l-border",
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">
            {entry.audit_action ?? "—"}
          </span>
          <StatusBadge status={status} />
        </div>
        {!isEmptyPlaceholder(entry.audit_key) && (
          <p
            className="max-w-[45%] truncate font-mono text-[10px] text-[var(--muted-foreground-soft)]"
            title={entry.audit_key}
          >
            #{entry.audit_key}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {AUDIT_FIELDS.map(([key, label]) => (
          <div key={key}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-foreground">{formatValue(entry[key])}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6">
        <span className="flex items-center gap-1.5">
          <User size={11} className="shrink-0" />
          Created by <span className="font-semibold text-foreground">{entry.created_by ?? "—"}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarClock size={11} className="shrink-0" />
          {formatTimestamp(entry.created_time)}
        </span>
        {!isEmptyPlaceholder(entry.updated_by) && (
          <span className="flex items-center gap-1.5">
            <User size={11} className="shrink-0" />
            Updated by <span className="font-semibold text-foreground">{entry.updated_by}</span>
            {" · "}
            {formatTimestamp(entry.updated_time)}
          </span>
        )}
      </div>

      {!isEmptyPlaceholder(reason) && (
        <p
          className="mt-2 rounded-lg px-3 py-1.5 text-[11px] font-medium text-warning"
          style={{ background: "var(--warning-soft)" }}
        >
          Reason: {reason}
        </p>
      )}
    </div>
  );
}

export function InstitutionAuditModal({ institution, institutionId, onClose }) {
  const auditQuery = useInstitutionAuditQuery(institutionId);
  const entries = auditQuery.data ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
              <History size={16} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-foreground">
                Audit — {institution?.name ?? institution?.code ?? `#${institutionId}`}
              </h2>
              <p className="text-xs text-muted-foreground">
                {entries.length} {entries.length === 1 ? "record" : "records"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {auditQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : auditQuery.error ? (
          <div
            className="flex items-center gap-2 rounded-xl border p-4 text-sm text-destructive"
            style={{ borderColor: "var(--destructive-soft)", background: "var(--destructive-soft)" }}
          >
            <AlertCircle size={14} /> {auditQuery.error.message}
          </div>
        ) : entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No audit history found.</p>
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
