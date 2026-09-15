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

// `insertNew: false` for a server-paginated view: a record this tab has
// never fetched (new record, or one that just moved onto some other page)
// can't be correctly slotted into "the current page" without replicating
// the server's own sort/pagination — the guide's own §3 says to just
// ignore a changed record that wouldn't belong on the current page/filter
// rather than guess. Updates/removals of rows already on the current page
// still apply instantly either way; only blind inserts are skipped.
// `rowKey` may be a plain field name (the common case, "id") or a resolver
// function for entities whose identity isn't a bare `id` field — e.g.
// Users/Profiles/Institutions, whose list rows key off userId(row)/
// profileId(row)/institutionId(row) fallback chains (`user_id ?? id`, ...)
// instead, matching whatever each page already passes as DataTable's own
// rowKey prop.
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

// Convenience wrapper for the common case: a component holding its list in
// `setRows` state just wants each live push folded straight in. Matches
// useLiveChannel's own onChanged(action, records) signature directly (the
// action name is deliberately unused here — see reconcileRecords above for
// why removal is keyed off record.status instead).
export function reconcileSetter(setRows, options) {
  return (_action, records) => setRows((prev) => reconcileRecords(prev ?? [], records, options));
}
