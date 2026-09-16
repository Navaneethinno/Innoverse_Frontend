// Splits a [key, label, type, ...] field-tuple list into two columns at
// roughly the halfway point, keeping each column's fields in their existing
// top-to-bottom order (unlike alternating every other field between
// columns, which would scatter related fields). The boundary is nudged so
// it never lands in the middle of a run of consecutive checkbox fields —
// e.g. 5 fields (2 dropdowns then 3 checkboxes) would otherwise split as
// [dropdown, dropdown, checkbox] / [checkbox, checkbox], stranding one
// checkbox away from its two siblings; nudging the boundary back keeps the
// whole checkbox run together as [dropdown, dropdown] /
// [checkbox, checkbox, checkbox]. For a field list whose checkboxes are
// already interspersed by design (an "X inherit" toggle next to its own
// length/type fields), no adjacent boolean pair straddles the boundary, so
// this is a no-op there.
//
// Originally built for DigitalProductWorkflow's per-step forms
// (digitalProductWizardShared.jsx); reused by AcctConfigResource.jsx's own
// Add/Edit form for the same reason — a real 2-col CSS grid pairs left/right
// cells into shared rows, so a tall field (a dropdown) next to a short one
// (a checkbox) forces the short cell's row to stretch to the tall one's
// height, stranding it with a large gap before the next row.
export function splitFieldsIntoColumns(fields) {
  let boundary = Math.ceil(fields.length / 2);
  while (boundary > 0 && fields[boundary - 1][2] === "boolean" && fields[boundary]?.[2] === "boolean") {
    boundary -= 1;
  }
  return [fields.slice(0, boundary), fields.slice(boundary)];
}
