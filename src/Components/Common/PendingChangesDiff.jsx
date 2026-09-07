import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/Utils/Lib/cn";

// Fetches and renders the /{entity}/pending {id} diff inside an Auth/Deauth
// confirm dialog, so the checker sees exactly what a maker is asking to
// change before approving/rejecting — instead of approving blind. Fetches
// once whenever `open` + `id` are both truthy; renders nothing if the
// backend says there's nothing pending (pending_action: "NONE") so it's
// safe to use unconditionally rather than every caller having to first
// check the row's own auth_status.
export function usePendingChanges(fetchPending, id, open) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || id == null) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetchPending({ id })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((nextError) => {
        if (!cancelled) setError(nextError instanceof Error ? nextError.message : "Failed to load changes");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, id]);

  return { data, isLoading, error };
}

function fieldLabel(field) {
  return String(field ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayValue(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function PendingChangesDiff({ data, isLoading, error }) {
  if (isLoading) {
    return <p className="mt-3 text-xs text-slate-400">Loading requested changes…</p>;
  }
  if (error) {
    return <p className="mt-3 text-xs text-red-500">Could not load requested changes: {error}</p>;
  }
  if (!data || data.pending_action == null || data.pending_action === "NONE") return null;

  const changes = Array.isArray(data.changes) ? data.changes : [];
  const isDelete = data.pending_action === "DELETE";
  const isAdd = data.pending_action === "ADD";

  return (
    <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
          {isAdd ? "New record requested" : isDelete ? "Delete requested" : "Requested changes"}
        </span>
        {data.requested_by && (
          <span className="text-[11px] text-slate-400">by {data.requested_by}</span>
        )}
      </div>

      {isDelete && (
        <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          <AlertTriangle size={13} className="shrink-0" />
          This record will be deleted if you authorize.
        </div>
      )}

      {changes.length === 0 ? (
        <p className="px-3 py-3 text-xs text-slate-400">No field-level changes reported.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <th className="px-3 py-1.5 text-left">Field</th>
              {!isAdd && <th className="px-3 py-1.5 text-left">{isDelete ? "Current Value" : "Current"}</th>}
              {!isDelete && <th className="px-3 py-1.5 text-left">{isAdd ? "Value" : "Proposed"}</th>}
            </tr>
          </thead>
          <tbody>
            {changes.map((change) => (
              <tr key={change.field} className="border-b border-slate-50 last:border-0">
                <td className="px-3 py-1.5 font-semibold text-slate-600">{fieldLabel(change.field)}</td>
                {!isAdd && (
                  <td className="px-3 py-1.5 text-slate-500">{displayValue(change.current)}</td>
                )}
                {!isDelete && (
                  <td className="px-3 py-1.5 font-medium text-blue-700">{displayValue(change.proposed)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Fields never worth showing in the "all fields" expansion — internal ids,
// nested objects/arrays, and anything already surfaced by the Lifecycle
// Metadata panel itself.
const ALL_FIELDS_EXCLUDED = new Set([
  "id",
  "audit_key",
  "menu_info",
  "menu_actions",
  "actions",
]);

function formatMetaValue(value) {
  if (value == null || value === "") return "—";
  return String(value);
}

function formatMetaTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

/**
 * Full "Request Details" treatment for the Audit modal — a Lifecycle
 * Metadata panel (audit key, pending action, requested by/when) next to a
 * Data Changes table, matching the senior reference project's Pending
 * Requests screen. Defaults to showing only the fields that actually
 * changed (per the backend's own `changes` array — the source of truth for
 * what differs); "Show all fields" additionally lists every other field
 * already present on `currentRecord` (the same row object already loaded
 * in the table) with its value repeated in both columns, since those
 * fields are — by definition, the backend only reports what changed —
 * identical before and after. Never fabricates a value we don't have: for
 * ADD there is no currentRecord yet, so the toggle simply doesn't appear.
 */
export function PendingChangesPanel({ data, isLoading, error, currentRecord }) {
  const [showAll, setShowAll] = useState(false);

  const changes = useMemo(() => (Array.isArray(data?.changes) ? data.changes : []), [data]);
  const isAdd = data?.pending_action === "ADD";
  const isDelete = data?.pending_action === "DELETE";
  const changedKeys = useMemo(() => new Set(changes.map((c) => c.field)), [changes]);

  const unchangedRows = useMemo(() => {
    if (!showAll || isAdd || !currentRecord) return [];
    return Object.keys(currentRecord)
      .filter(
        (key) =>
          !changedKeys.has(key) &&
          !ALL_FIELDS_EXCLUDED.has(key) &&
          typeof currentRecord[key] !== "object",
      )
      .map((key) => ({ field: key, current: currentRecord[key], proposed: currentRecord[key] }));
  }, [showAll, isAdd, currentRecord, changedKeys]);

  const canShowAll = !isAdd && !!currentRecord;
  const totalFieldCount = changes.length + unchangedRows.length;

  if (isLoading) {
    return <p className="text-xs text-slate-400">Loading requested changes…</p>;
  }
  if (error) {
    return <p className="text-xs text-red-500">Could not load requested changes: {error}</p>;
  }
  if (!data || data.pending_action == null || data.pending_action === "NONE") return null;

  const rows = showAll ? [...changes, ...unchangedRows] : changes;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
            Lifecycle Metadata
          </span>
        </div>
        <dl className="space-y-2.5 px-3 py-3">
          {[
            ["Audit Key", data.audit_key],
            ["Pending Action", data.pending_action],
            ["Requested By", data.requested_by],
            ["Requested Time", formatMetaTime(data.requested_time)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
              <dd className="truncate text-xs font-semibold text-slate-700" title={String(value ?? "")}>
                {formatMetaValue(value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
            Data Changes
          </span>
          {canShowAll && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-[11px] font-bold text-blue-600 hover:underline"
            >
              {showAll ? "Show changed only" : `Show all fields (${totalFieldCount})`}
            </button>
          )}
        </div>

        {isDelete && (
          <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            <AlertTriangle size={13} className="shrink-0" />
            This record will be deleted if authorized.
          </div>
        )}

        {rows.length === 0 ? (
          <p className="px-3 py-3 text-xs text-slate-400">No field-level changes reported.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-3 py-1.5 text-left">Field</th>
                {!isAdd && <th className="px-3 py-1.5 text-left">Before</th>}
                {!isDelete && <th className="px-3 py-1.5 text-left">After</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const changed = changedKeys.has(row.field);
                return (
                  <tr key={row.field} className="border-b border-slate-50 last:border-0">
                    <td className="px-3 py-1.5 font-semibold text-slate-600">{fieldLabel(row.field)}</td>
                    {!isAdd && (
                      <td
                        className={cn(
                          "px-3 py-1.5",
                          changed ? "text-red-500 line-through decoration-red-300" : "text-slate-500",
                        )}
                      >
                        {displayValue(row.current)}
                      </td>
                    )}
                    {!isDelete && (
                      <td
                        className={cn(
                          "px-3 py-1.5",
                          changed ? "font-semibold text-emerald-700" : "text-slate-500",
                        )}
                      >
                        {displayValue(row.proposed)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
