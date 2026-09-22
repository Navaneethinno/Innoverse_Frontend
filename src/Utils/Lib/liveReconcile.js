// Shared reconcile logic for the "Live Updates (WebSocket) Integration
// Guide"'s §3 recommended client-side pattern: on a `changed` push, upsert
// (or remove) the affected record(s) directly in local state instead of
// re-calling the list endpoint. The backend already did zero extra DB work
// to produce the push (§5); this is what makes the frontend match that —
// zero REST calls per live update, regardless of how many clients are
// subscribed to the same channel.
//
// Removal is keyed off the record's own `status` (STATUS_DELETED === 8),
// never off the action name — a "delete" action does not always mean the
// row is gone (see the guide's §3 for the three distinct outcomes that
// share that one action name: hard-deleted Add-side draft, a live record
// with delete now merely pending checker approval, or a discarded
// Edit-side draft where the row was never touched at all). status 8 is the
// only reliable "remove this row" signal, and it's the same code on every
// entity in this app.
export const STATUS_DELETED = 8;

// `insertNew: false` was tried for server-paginated views, on the theory
// that a record this tab has never fetched can't be correctly slotted into
// "the current page" without replicating the server's own sort/pagination.
// In practice that meant a genuinely new record's `changed` push was
// silently dropped for every server-paginated list in the app (confirmed
// live: the socket frame arrived, nothing on screen changed) — every one
// of those call sites now refetches instead (see useLiveChannel usages in
// userHooks.js, institutionHooks.js, CustomerMasterConfigResource.jsx,
// etc.), which is correct regardless of page/sort/search. `insertNew`
// stays available (default true) for a caller like useEntityListQuery.js
// that already holds every page in memory, where a blind insert is safe.
// `rowKey` may be a plain field name (the common case, "id") or a resolver
// function for entities whose identity isn't a bare `id` field.
export function reconcileRecords(prevRows, records, { rowKey = "id", insertNew = true } = {}) {
  const keyOf = typeof rowKey === "function" ? rowKey : (row) => row?.[rowKey];
  let next = prevRows;
  for (const record of records) {
    const recordKey = keyOf(record);
    const idx = next.findIndex((row) => keyOf(row) === recordKey);
    if (record?.status === STATUS_DELETED) {
      if (idx === -1) continue;
      next = next.filter((row) => keyOf(row) !== recordKey);
      continue;
    }
    if (idx === -1) {
      if (!insertNew) continue;
      next = [record, ...next];
    } else {
      next = next.map((row, i) => (i === idx ? record : row));
    }
  }
  return next;
}
