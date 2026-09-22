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
// Short forms (a handful of dropdowns plus a couple of checkboxes, e.g.
// Identification Type Config's 3 dropdowns + 3 checkboxes) fit comfortably
// in one column — splitting them in half at this size stranded every
// checkbox alone in a near-empty right column, floated at the same height
// as the left column's first field with nothing below it, which read as a
// separate detached group rather than part of the same form. Below this
// threshold, everything (dropdowns AND checkboxes) fills the left column
// top to bottom in field order; the right column only comes into play once
// there are enough fields that a single column would run too tall (e.g.
// acct_product's ~26 fields).
const SINGLE_COLUMN_THRESHOLD = 8;
export function splitFieldsIntoColumns(fields) {
  if (fields.length <= SINGLE_COLUMN_THRESHOLD) return [fields, []];
  let boundary = Math.ceil(fields.length / 2);
  while (boundary > 0 && fields[boundary - 1][2] === "boolean" && fields[boundary]?.[2] === "boolean") {
    boundary -= 1;
  }
  return [fields.slice(0, boundary), fields.slice(boundary)];
}

// Every dropdown/text/number/date field before every boolean (rendered as a
// CheckboxPill — see CheckboxPill.jsx) toggle: the pills read as a distinct
// "switches" group and belong at the bottom of the form, not interleaved
// between data-entry fields. Shared by AcctConfigResource.jsx/
// KycConfigResource.jsx/DigitalProductResource.jsx and the Digital Product
// wizard — only reorders for rendering; every caller still reads/writes
// values by field key, never by position, so this has no effect on what's
// actually sent to the API.
//
// A field with a `showIf` (4th tuple element) is the one exception to "all
// data fields before all checkboxes": it stays glued immediately after the
// nearest preceding boolean in the field list, instead of moving up with
// the other data fields. Moving it away from its own checkbox (e.g.
// Digital Product's Maximum accounts, only shown once Multiple accounts
// allowed is checked) put it at the top of the form on its own, appearing
// out of nowhere above the checkbox that reveals it and leaving a blank
// gap where it "should" have been — checking the box then had to shift
// the whole layout instead of just growing the space right under it.
export function orderedFields(fields) {
  const leading = [];
  const booleanGroups = [];
  for (const field of fields) {
    const [, , type, showIf] = field;
    if (type === "boolean") {
      booleanGroups.push({ field, followers: [] });
      continue;
    }
    const owner = showIf && booleanGroups[booleanGroups.length - 1];
    if (owner) owner.followers.push(field);
    else leading.push(field);
  }
  return [...leading, ...booleanGroups.flatMap(({ field, followers }) => [field, ...followers])];
}
