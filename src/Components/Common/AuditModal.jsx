import { useMemo } from "react";
import { AlertCircle, CalendarClock, History, User } from "lucide-react";
import { Skeleton } from "@/Components/UI/skeleton";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { Modal } from "@/Components/Common/Modal";
import { CopyButton } from "@/Components/Common/CopyButton";
import { PendingChangesPanel } from "@/Components/Common/PendingChangesDiff";
import { cn } from "@/Utils/Lib/utils";

// Values the backend sends as literal placeholder strings for "no value" —
// treated the same as null/empty everywhere below.
const EMPTY_PLACEHOLDERS = new Set(["", "na", "n/a", "undefined", "null"]);

function isEmptyPlaceholder(value) {
  return value == null || EMPTY_PLACEHOLDERS.has(String(value).trim().toLowerCase());
}

function formatValue(value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return isEmptyPlaceholder(value) ? "—" : String(value);
}

function formatTimestamp(value) {
  if (!value || (typeof value === "string" && value.startsWith("0001-01-01"))) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

// Keyed off the real auth_status values seen across Institution/Profile/User
// audit responses (see StatusBadge.jsx's STATUS_CONFIG for the full set).
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

// Meta fields every entry already surfaces via its own dedicated row
// (header/status/key/footer) — never duplicated into the generic field grid.
const META_KEYS = new Set([
  "id",
  "audit_key",
  "audit_action",
  "auth_status",
  "status",
  "process_status",
  "created_by",
  "created_userid",
  "created_username",
  "created_time",
  "updated_by",
  "updated_userid",
  "updated_time",
  "auth_username",
  "auth_time",
  "deauth_narration",
]);

function AuditEntry({ entry, fields, getActionLabel, renderExtra, pendingPanel }) {
  const status = String(entry.auth_status ?? entry.status ?? "").toUpperCase();
  const reason = entry.deauth_narration;
  const actionLabel = getActionLabel(entry);

  // A curated field list is preferred (matches the entity's known shape);
  // falling back to a dynamic dump of whatever's left keeps this component
  // usable for entities with no confirmed field set yet.
  const fieldEntries =
    fields ??
    Object.keys(entry)
      .filter((key) => !META_KEYS.has(key) && typeof entry[key] !== "object")
      .map((key) => [key, key.replaceAll("_", " ")]);

  return (
    <div
      className={cn(
        "rounded-xl border border-l-4 bg-card p-4",
        STATUS_ACCENT[status] ?? "border-l-border",
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        {actionLabel && (
          <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">
            {actionLabel}
          </span>
        )}
        <StatusBadge status={status} />
        {!isEmptyPlaceholder(entry.audit_key) && (
          <span className="ml-auto flex max-w-full basis-full items-center gap-1 sm:basis-auto">
            <p
              className="min-w-0 truncate font-mono text-[10px] text-[var(--muted-foreground-soft)]"
              title={entry.audit_key}
            >
              #{entry.audit_key}
            </p>
            <CopyButton value={entry.audit_key} />
          </span>
        )}
      </div>

      {fieldEntries.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {fieldEntries.map(([key, label]) => (
            <div key={key}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-foreground">
                {formatValue(entry[key])}
              </p>
            </div>
          ))}
        </div>
      )}

      {renderExtra?.(entry)}

      {pendingPanel && (
        <div
          className="mt-3 rounded-xl border p-3"
          style={{ borderColor: "var(--primary-light)", background: "var(--primary-light)" }}
        >
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
            <History size={11} className="shrink-0" />
            What this pending request changes
          </p>
          {pendingPanel}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6">
        <span className="flex items-center gap-1.5">
          <User size={11} className="shrink-0" />
          Created by{" "}
          <span className="font-semibold text-foreground">
            {entry.created_by ?? entry.created_username ?? "—"}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarClock size={11} className="shrink-0" />
          {formatTimestamp(entry.created_time)}
        </span>
        {!isEmptyPlaceholder(entry.auth_username ?? entry.updated_by) && (
          <span className="flex items-center gap-1.5">
            <User size={11} className="shrink-0" />
            {entry.auth_username ? "Authorized by" : "Updated by"}{" "}
            <span className="font-semibold text-foreground">
              {entry.auth_username ?? entry.updated_by}
            </span>
            {" · "}
            {formatTimestamp(entry.auth_time ?? entry.updated_time)}
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

// The one reusable audit-history modal — Institution/Profile/User audit
// screens all render through this instead of each hand-rolling the same
// header/card/status-accent/footer markup. `fields` (curated [key, label]
// pairs) is entity-specific; everything else about the presentation is
// shared, so a layout fix here fixes it everywhere at once.
export function AuditModal({
  title,
  entries = [],
  fields,
  isLoading = false,
  error = null,
  onRetry,
  onClose,
  getActionLabel = (entry) => entry.audit_action,
  getEntryKey = (entry, index) => entry.id ?? entry.audit_key ?? index,
  renderExtra,
  // Optional: when the record has an open pending request, showing it here
  // means the checker doesn't have to leave the audit trail they're already
  // looking at to see what's actually being asked of them.
  pendingChanges = null,
  pendingLoading = false,
  pendingError = null,
  currentRecord = null,
}) {
  const hasPending =
    pendingLoading || pendingError || (pendingChanges?.pending_action && pendingChanges.pending_action !== "NONE");

  // Newest first — the pending/open request (if any) is always the most
  // recent thing that happened to the record, so this also naturally puts
  // it right at the top instead of buried under older entries.
  const sortedEntries = useMemo(() => {
    const timeOf = (entry) => {
      const raw = entry.updated_time ?? entry.auth_time ?? entry.created_time;
      const t = raw ? new Date(raw).getTime() : NaN;
      return Number.isNaN(t) ? -Infinity : t;
    };
    return entries
      .map((entry, index) => ({ entry, index }))
      .sort((a, b) => timeOf(b.entry) - timeOf(a.entry) || a.index - b.index)
      .map(({ entry }) => entry);
  }, [entries]);

  const pendingMatchesEntry =
    hasPending && !pendingLoading && !pendingError
      ? sortedEntries.some((entry) => entry.audit_key === pendingChanges?.audit_key)
      : false;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Audit — ${title}`}
      subtitle={`${entries.length} ${entries.length === 1 ? "record" : "records"}`}
      icon={<History size={15} />}
    >
      <>
        {/* Fallback only — normally the panel renders inline, right next to
            the audit entry sharing the same audit_key, so it reads as part
            of that entry rather than a disconnected block. This only fires
            while loading/erroring, or if the matching entry hasn't loaded. */}
        {hasPending && (pendingLoading || pendingError || !pendingMatchesEntry) && (
          <div className="mb-4">
            <PendingChangesPanel
              data={pendingChanges}
              isLoading={pendingLoading}
              error={pendingError}
              currentRecord={currentRecord}
            />
          </div>
        )}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div
            className="flex items-center gap-2 rounded-xl border p-4 text-sm text-destructive"
            style={{ borderColor: "var(--destructive-soft)", background: "var(--destructive-soft)" }}
          >
            <AlertCircle size={14} className="shrink-0" />
            <span className="flex-1">{error.message ?? String(error)}</span>
            {onRetry && (
              <button onClick={onRetry} className="shrink-0 text-xs font-bold underline">
                Retry
              </button>
            )}
          </div>
        ) : entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No audit history found.</p>
        ) : (
          <div className="space-y-3">
            {sortedEntries.map((entry, index) => (
              <AuditEntry
                key={getEntryKey(entry, index)}
                entry={entry}
                fields={fields}
                getActionLabel={getActionLabel}
                renderExtra={renderExtra}
                pendingPanel={
                  pendingMatchesEntry && entry.audit_key === pendingChanges?.audit_key ? (
                    <PendingChangesPanel data={pendingChanges} currentRecord={currentRecord} />
                  ) : null
                }
              />
            ))}
          </div>
        )}
      </>
    </Modal>
  );
}
