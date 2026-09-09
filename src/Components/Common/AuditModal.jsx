import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, CalendarClock, History, User } from "lucide-react";
import { Skeleton } from "@/Components/UI/skeleton";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { Modal } from "@/Components/Common/Modal";
import { CopyButton } from "@/Components/Common/CopyButton";
import { UiTooltip } from "@/Components/Common/UiTooltip";
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
  "narration",
  "changes",
]);

// Every audit entry already carries its own `changes` array (field/current/
// proposed) directly on the record — no separate /pending call needed to
// show what a given history event actually changed, the way Auth/Deauth
// dialogs still need one (they're asking "what does the OPEN request want
// to change", which isn't yet in any audit entry). audit_action doesn't map
// 1:1 onto ADD/EDIT/DELETE, so this only infers enough to pick the right
// column layout (hide "Before" when every current value is null, i.e. a
// creation event) — everything else renders as a plain before/after diff.
function deriveEntryChangeAction(entry) {
  const changes = Array.isArray(entry.changes) ? entry.changes : [];
  if (changes.length === 0) return "NONE";
  if (String(entry.audit_action ?? "").toUpperCase().includes("DELETE")) return "DELETE";
  if (changes.every((c) => c.current == null)) return "ADD";
  return "EDIT";
}

function AuditEntry({ entry, fields, getActionLabel, renderExtra, t }) {
  const status = String(entry.auth_status ?? entry.status ?? "").toUpperCase();
  const reason = entry.narration;
  const actionLabel = getActionLabel(entry);
  const changeAction = deriveEntryChangeAction(entry);

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
            <UiTooltip label={entry.audit_key}>
              <p className="min-w-0 truncate font-mono text-[10px] text-[var(--muted-foreground-soft)]">
                #{entry.audit_key}
              </p>
            </UiTooltip>
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

      {changeAction !== "NONE" && (
        <div
          className="mt-3 rounded-xl border p-3"
          style={{ borderColor: "var(--primary-light)", background: "var(--primary-light)" }}
        >
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
            <History size={11} className="shrink-0" />
            {t("common:whatChangedInThisUpdate")}
          </p>
          <PendingChangesPanel
            data={{ pending_action: changeAction, changes: entry.changes }}
            currentRecord={entry}
          />
        </div>
      )}

      <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6">
        <span className="flex items-center gap-1.5">
          <User size={11} className="shrink-0" />
          {t("common:createdBy")}{" "}
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
            {entry.auth_username ? t("common:authorizedBy") : t("common:updatedBy")}{" "}
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
          {t("common:reason")}: {reason}
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
//
// Fully owns its own fetching via `fetchAudit(page, limit)` rather than
// taking a pre-fetched `entries` array, because the audit endpoint pages
// OLDEST-first: page 1 is the oldest records, not the newest. Showing page
// 1 first (as an earlier version did) meant the actual latest history
// never appeared until the user scrolled far enough to reach whatever page
// it happened to land on. Instead: fetch page 1 once just to learn
// totalPages, then fetch the LAST page as the first thing shown (the
// newest records), and page backwards (totalPages-1, totalPages-2, ...)
// as the user scrolls for older history — newest is visible immediately,
// no scrolling required, and scrolling reveals progressively older pages.
export function AuditModal({
  title,
  fields,
  onClose,
  getActionLabel = (entry) => entry.audit_action,
  getEntryKey = (entry, index) => entry.id ?? entry.audit_key ?? index,
  renderExtra,
  fetchAudit,
  auditLimit = 10,
}) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextPage, setNextPage] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setEntries([]);
    setHasMore(false);
    setNextPage(null);
    (async () => {
      try {
        const first = await fetchAudit(1, auditLimit);
        const totalPages = Math.max(1, first?.totalPages ?? 1);
        if (totalPages <= 1) {
          if (!cancelled) {
            setEntries(first?.entries ?? []);
            setHasMore(false);
          }
          return;
        }
        const last = await fetchAudit(totalPages, auditLimit);
        if (!cancelled) {
          setEntries(last?.entries ?? []);
          setNextPage(totalPages - 1);
          setHasMore(totalPages - 1 >= 1);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError : new Error("Failed to load audit history"));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, retryToken]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || nextPage == null) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await fetchAudit(nextPage, auditLimit);
      setEntries((current) => [...current, ...(page?.entries ?? [])]);
      setHasMore(nextPage - 1 >= 1);
      setNextPage((p) => p - 1);
    } catch (nextError) {
      setLoadMoreError(nextError instanceof Error ? nextError.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, hasMore, nextPage, auditLimit]);

  const handleBodyScroll = (event) => {
    const el = event.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 150) void loadMore();
  };

  // Each fetched page is sorted newest-first within itself — pages arrive
  // newest-page-first already (see the fetch strategy above), so entries
  // stay in the right order as later (older) pages are appended.
  const sortedEntries = useMemo(() => {
    const timeOf = (entry) => {
      const raw = entry.updated_time ?? entry.auth_time ?? entry.created_time;
      const t = raw ? new Date(raw).getTime() : NaN;
      return Number.isNaN(t) ? -Infinity : t;
    };
    const byPageOrder = entries.map((entry, index) => ({ entry, index }));
    // Stable-sort only within same fetched page boundaries isn't tracked
    // separately, so this simply orders everything currently loaded by
    // timestamp — correct as long as each page's own records don't overlap
    // in time with adjacent pages, which holds for sequential audit ids.
    return byPageOrder
      .sort((a, b) => timeOf(b.entry) - timeOf(a.entry) || a.index - b.index)
      .map(({ entry }) => entry);
  }, [entries]);

  return (
    <Modal
      open
      onClose={onClose}
      title={`${t("common:audit")} — ${title}`}
      subtitle={`${entries.length} ${entries.length === 1 ? t("common:record") : t("common:recordsWord")}${
        hasMore ? " · " + t("common:scrollForMore") : ""
      }`}
      icon={<History size={15} />}
      onBodyScroll={handleBodyScroll}
    >
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
          <button onClick={() => setRetryToken((count) => count + 1)} className="shrink-0 text-xs font-bold underline">
            {t("common:retry")}
          </button>
        </div>
      ) : entries.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("common:noAuditHistoryFound")}</p>
      ) : (
        <div className="space-y-3">
          {sortedEntries.map((entry, index) => (
            <AuditEntry
              key={getEntryKey(entry, index)}
              entry={entry}
              fields={fields}
              getActionLabel={getActionLabel}
              renderExtra={renderExtra}
              t={t}
            />
          ))}
          <div className="py-2 text-center text-xs text-muted-foreground">
            {loadMoreError ? (
              <button type="button" onClick={() => void loadMore()} className="font-semibold text-blue-600 underline">
                {t("common:failedLoadMoreRetry")}
              </button>
            ) : loadingMore ? (
              t("common:loadingMore")
            ) : hasMore ? (
              t("common:scrollForMore")
            ) : (
              t("common:allHistoryLoaded")
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
