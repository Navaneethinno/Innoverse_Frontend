import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { UiTooltip } from "@/Components/Common/UiTooltip";

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
        // The real response wraps the pending object in a single-element
        // array (payload.data: [{ id, pending_action, changes, ... }]),
        // same as the login/refresh session response — not the bare object
        // directly on `data`.
        const unwrapped = Array.isArray(result?.data) ? result.data[0] : (result?.data ?? result);
        if (!cancelled) setData(unwrapped ?? null);
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

// A change's proposed/current value is usually a plain scalar, but Digital
// Product's own pending payload nests entire sections (product_map,
// channel_config, ...) as one "field" — recurse into arrays/objects
// instead of falling through to the default String(value) => "[object
// Object]" every caller was getting for those.
// Joined with "\n", not ", " — a nested section can carry a dozen fields,
// and run-on into one paragraph was unreadable. Callers pair this with a
// `whitespace-pre-line` cell so each entry actually breaks onto its own line.
function displayValue(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value.length === 0 ? "—" : value.map(displayValue).join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== "" && v != null);
    return entries.length === 0 ? "—" : entries.map(([k, v]) => `${fieldLabel(k)}: ${displayValue(v)}`).join("\n");
  }
  return String(value);
}

const isNestedValue = (v) => v != null && typeof v === "object";

// Recursively collects the leaf {field, value} pairs of a nested section
// value (Digital Product's own change entries for product_map,
// security_config, ...), ignoring the wrapper object/array structure
// entirely — the backend now tells us which section a change belongs to
// directly (`change.group`), so this only needs to find the actual leaf
// fields inside it, not re-derive any grouping of its own.
function flattenLeaves(value, out) {
  if (Array.isArray(value)) {
    value.forEach((item) => flattenLeaves(item, out));
  } else if (isNestedValue(value)) {
    Object.entries(value).forEach(([key, v]) => {
      if (isNestedValue(v)) flattenLeaves(v, out);
      else out.push({ field: key, value: v });
    });
  }
  return out;
}

// Expands a {group, field, current, proposed} changes array (the backend
// now sends `group` directly — "" for the entity's own basic fields, the
// section key for a nested one, e.g. "security_config") into
// display-ready rows for a 4-column Group/Field/Before/After table: a
// scalar change is returned as-is (empty group normalized to null); a
// change whose current/proposed is a whole nested section object/array is
// expanded into one row per leaf field, all tagged with that same
// backend-provided group, instead of dumping the whole section into a
// single unreadable cell.
export function expandChangeRows(changes) {
  const rows = [];
  (changes ?? []).forEach((change) => {
    const group = change.group ? change.group : null;
    if (!isNestedValue(change.current) && !isNestedValue(change.proposed)) {
      rows.push({ group, field: change.field, current: change.current, proposed: change.proposed });
      return;
    }
    const byKey = new Map();
    flattenLeaves(change.current, []).forEach((leaf) => {
      byKey.set(leaf.field, { group, field: leaf.field, current: leaf.value, proposed: null });
    });
    flattenLeaves(change.proposed, []).forEach((leaf) => {
      const existing = byKey.get(leaf.field);
      if (existing) existing.proposed = leaf.value;
      else byKey.set(leaf.field, { group, field: leaf.field, current: null, proposed: leaf.value });
    });
    byKey.forEach((row) => {
      if (JSON.stringify(row.current ?? null) !== JSON.stringify(row.proposed ?? null)) rows.push(row);
    });
  });
  return rows;
}

// For a table where consecutive rows repeat the same Group ("Product Map"
// printed on 4 rows in a row), returns a parallel array of rowSpan values:
// the first row of a run gets the run's length, every row after it gets 0
// (meaning "don't render this cell at all — it's covered by the row
// above's rowSpan"). Only merges rows that are already adjacent, so it
// never silently merges two separated occurrences of the same group.
function groupRowSpans(rows) {
  const spans = new Array(rows.length).fill(1);
  let runStart = 0;
  for (let i = 1; i <= rows.length; i += 1) {
    const sameAsRunStart = i < rows.length && rows[i].group === rows[runStart].group;
    if (sameAsRunStart) continue;
    spans[runStart] = i - runStart;
    for (let j = runStart + 1; j < i; j += 1) spans[j] = 0;
    runStart = i;
  }
  return spans;
}

export function PendingChangesDiff({ data, isLoading, error }) {
  const { t } = useTranslation("common");
  if (isLoading) {
    return <p className="mt-3 text-xs text-muted-foreground">{t("loadingRequestedChanges")}</p>;
  }
  if (error) {
    return <p className="mt-3 text-xs text-red-500">{t("couldNotLoadRequestedChanges")}: {error}</p>;
  }
  if (!data || data.pending_action == null || data.pending_action === "NONE") return null;

  const changes = expandChangeRows(Array.isArray(data.changes) ? data.changes : []);
  const groupSpans = groupRowSpans(changes);
  const isDelete = data.pending_action === "DELETE";
  const isAdd = data.pending_action === "ADD";

  return (
    <div className="mt-3 rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted px-3 py-2">
        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          {isAdd ? t("newRecordRequested") : isDelete ? t("deleteRequested") : t("requestedChanges")}
        </span>
        {data.requested_by && (
          <span className="text-[11px] text-muted-foreground">{t("by")} {data.requested_by}</span>
        )}
      </div>

      {isDelete && (
        <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          <AlertTriangle size={13} className="shrink-0" />
          {t("recordWillBeDeletedIfAuthorize")}
        </div>
      )}

      {changes.length === 0 ? (
        <p className="px-3 py-3 text-xs text-muted-foreground">{t("noFieldLevelChanges")}</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <th className="px-3 py-1.5 text-left">{t("group")}</th>
              <th className="px-3 py-1.5 text-left">{t("field")}</th>
              {!isAdd && <th className="px-3 py-1.5 text-left">{isDelete ? t("currentValue") : t("current")}</th>}
              {!isDelete && <th className="px-3 py-1.5 text-left">{isAdd ? t("value") : t("proposed")}</th>}
            </tr>
          </thead>
          <tbody>
            {changes.map((change, index) => {
              const span = groupSpans[index];
              return (
                <tr key={`${change.group}::${change.field}`} className="border-b border-slate-50 last:border-0">
                  {span > 0 && (
                    <td rowSpan={span} className="border-r border-slate-50 px-3 py-1.5 align-top text-muted-foreground">
                      {change.group ? fieldLabel(change.group) : ""}
                    </td>
                  )}
                  <td className="px-3 py-1.5 font-semibold text-slate-600">{fieldLabel(change.field)}</td>
                  {!isAdd && (
                    <td className="whitespace-pre-line px-3 py-1.5 text-muted-foreground">{displayValue(change.current)}</td>
                  )}
                  {!isDelete && (
                    <td className="whitespace-pre-line px-3 py-1.5 font-medium" style={{ color: "var(--primary)" }}>{displayValue(change.proposed)}</td>
                  )}
                </tr>
              );
            })}
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
  const { t } = useTranslation("common");
  const [showAll, setShowAll] = useState(false);

  const changes = useMemo(() => expandChangeRows(Array.isArray(data?.changes) ? data.changes : []), [data]);
  const isAdd = data?.pending_action === "ADD";
  const isDelete = data?.pending_action === "DELETE";
  const changedKeys = useMemo(() => new Set(changes.map((c) => `${c.group}::${c.field}`)), [changes]);

  const unchangedRows = useMemo(() => {
    if (!showAll || isAdd || !currentRecord) return [];
    return Object.keys(currentRecord)
      .filter(
        (key) =>
          !changedKeys.has(`null::${key}`) &&
          !ALL_FIELDS_EXCLUDED.has(key) &&
          typeof currentRecord[key] !== "object",
      )
      .map((key) => ({ group: null, field: key, current: currentRecord[key], proposed: currentRecord[key] }));
  }, [showAll, isAdd, currentRecord, changedKeys]);

  const canShowAll = !isAdd && !!currentRecord;
  const totalFieldCount = changes.length + unchangedRows.length;

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">{t("loadingRequestedChanges")}</p>;
  }
  if (error) {
    return <p className="text-xs text-red-500">{t("couldNotLoadRequestedChanges")}: {error}</p>;
  }
  if (!data || data.pending_action == null || data.pending_action === "NONE") return null;

  const rows = showAll ? [...changes, ...unchangedRows] : changes;
  const groupSpans = groupRowSpans(rows);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="border-b border-border bg-muted px-3 py-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            {t("lifecycleMetadata")}
          </span>
        </div>
        <dl className="space-y-2.5 px-3 py-3">
          {[
            [t("pendingAction"), data.pending_action],
            [t("requestedBy"), data.requested_by],
            [t("requestedTime"), formatMetaTime(data.requested_time)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
              <UiTooltip label={String(value ?? "")}>
                <dd className="truncate text-xs font-semibold text-slate-700">
                  {formatMetaValue(value)}
                </dd>
              </UiTooltip>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted px-3 py-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            {t("dataChanges")}
          </span>
          {canShowAll && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-[11px] font-bold text-[var(--primary)] hover:underline"
            >
              {showAll ? t("showChangedOnly") : t("showAllFields", { count: totalFieldCount })}
            </button>
          )}
        </div>

        {isDelete && (
          <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            <AlertTriangle size={13} className="shrink-0" />
            {t("recordWillBeDeletedIfAuthorized")}
          </div>
        )}

        {rows.length === 0 ? (
          <p className="px-3 py-3 text-xs text-muted-foreground">{t("noFieldLevelChanges")}</p>
        ) : (
          <div className="thin-scrollbar max-h-64 overflow-y-auto overflow-x-auto">
          <table className="w-full min-w-[360px] text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <th className="sticky top-0 bg-white px-3 py-1.5 text-left">{t("group")}</th>
                <th className="sticky top-0 bg-white px-3 py-1.5 text-left">{t("field")}</th>
                {!isAdd && <th className="sticky top-0 bg-white px-3 py-1.5 text-left">{t("before")}</th>}
                {!isDelete && <th className="sticky top-0 bg-white px-3 py-1.5 text-left">{t("after")}</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const changed = changedKeys.has(`${row.group}::${row.field}`);
                const span = groupSpans[index];
                return (
                  <tr key={`${row.group}::${row.field}`} className="border-b border-slate-50 last:border-0">
                    {span > 0 && (
                      <td rowSpan={span} className="border-r border-slate-50 px-3 py-1.5 align-top text-muted-foreground">
                        {row.group ? fieldLabel(row.group) : ""}
                      </td>
                    )}
                    <td className="px-3 py-1.5 font-semibold text-slate-600">{fieldLabel(row.field)}</td>
                    {!isAdd && (
                      <td className="whitespace-pre-line px-3 py-1.5">
                        {changed ? (
                          <span className="inline-block rounded-md bg-red-100 px-2 py-0.5 font-medium text-red-700 line-through decoration-red-400 decoration-2">
                            {displayValue(row.current)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{displayValue(row.current)}</span>
                        )}
                      </td>
                    )}
                    {!isDelete && (
                      <td className="whitespace-pre-line px-3 py-1.5">
                        {changed ? (
                          <span className="inline-block rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                            {displayValue(row.proposed)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{displayValue(row.proposed)}</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
