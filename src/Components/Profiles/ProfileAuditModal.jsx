import { motion } from "motion/react";
import { AlertCircle, History } from "lucide-react";
import { Skeleton } from "@/Components/UI/skeleton";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { useProfileAuditQuery } from "@/Hooks/Profiles/profileHooks";

// Mirrors InstitutionAuditModal.jsx's formatting approach (real key/value
// fields, not a raw JSON dump), adapted to whatever fields a real
// /profile/audit_list response actually contains. The exact field set is
// unverified against a live backend (network calls blocked in this sandbox)
// — this renders the fields payse's own AuditProfile.jsx reads off each
// record (profile_name, status, auth_status, created/auth/updated
// times+users, deauth_narration, audit_note/audit_action) and falls back
// gracefully wherever a field is absent, rather than guessing further ones.
function formatValue(value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === "" || value == null || value === "UNDEFINED") return "—";
  return String(value);
}

function formatTimestamp(value) {
  if (!value || (typeof value === "string" && value.startsWith("0001-01-01"))) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function AuditEntry({ entry }) {
  const status = String(entry.auth_status ?? entry.status ?? "").toUpperCase();
  const grants = Array.isArray(entry.menu_info)
    ? entry.menu_info
    : Array.isArray(entry.menu_audit_array)
      ? entry.menu_audit_array
      : [];
  return (
    <div className="rounded-xl border border-slate-100 bg-white/70 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
            {entry.audit_action ?? entry.profile_name ?? "—"}
          </span>
          <StatusBadge status={status} />
        </div>
        <p className="text-[11px] text-slate-400 font-mono">{entry.audit_key ?? ""}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {[
          ["profile_name", "Profile Name"],
          ["audit_note", "Audit Note"],
        ].map(([key, label]) => (
          <div key={key}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {label}
            </p>
            <p className="text-xs font-medium text-slate-700">{formatValue(entry[key])}</p>
          </div>
        ))}
      </div>
      {grants.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Menu / Action grants
          </p>
          <div className="flex flex-wrap gap-1.5">
            {grants.map((grant, i) => (
              <span
                key={i}
                className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600"
              >
                menu #{grant.menu_id ?? grant.profile_menu_action_id} · action{" "}
                {Array.isArray(grant.actions) ? grant.actions.join(",") : (grant.action_id ?? "—")}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-1 gap-1.5 sm:grid-cols-2 text-[11px] text-slate-500">
        <p>
          Created by{" "}
          <span className="font-semibold text-slate-600">{entry.created_username ?? "—"}</span> ·{" "}
          {formatTimestamp(entry.created_time)}
        </p>
        <p>
          Authorized by{" "}
          <span className="font-semibold text-slate-600">{entry.auth_username ?? "—"}</span> ·{" "}
          {formatTimestamp(entry.auth_time)}
        </p>
        {entry.deauth_narration ? (
          <p className="sm:col-span-2 text-amber-700">Reason: {entry.deauth_narration}</p>
        ) : null}
      </div>
    </div>
  );
}

export function ProfileAuditModal({ profile, profileId, onClose }) {
  const auditQuery = useProfileAuditQuery(profileId);
  const entries = auditQuery.data ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4"
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={16} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800">
              Audit — {profile?.profile_name ?? `#${profileId}`}
            </h2>
          </div>
          <button onClick={onClose} className="text-sm font-bold text-slate-400 hover:text-slate-700">
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
              <AuditEntry key={entry.audit_id ?? entry.audit_key ?? i} entry={entry} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
