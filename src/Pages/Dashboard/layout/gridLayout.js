// Pure helpers for a dashboard's saved grid layout.
//
// Saved shape (layout_version 2): [{ id, span, x, y, h }] where span is the
// width in columns (the server checks it is 1 or 2), x/y the top-left cell
// and h the height in rows. Version 1 layouts ({ id, span } only) have no
// position and are flowed into the grid in their saved order.
export const LAYOUT_VERSION = 2;

const int = (v) => (v != null && Number.isFinite(Number(v)) ? Math.round(Number(v)) : null);

// Widgets without a position are placed left to right below the positioned
// ones, starting a new row when the next one does not fit.
export function flowLayout(registry, items, { cols = 4, maxSpan = 2 } = {}) {
  const sized = items.map((item) => {
    const def = registry[item.id];
    const span = Math.min(maxSpan, Math.max(1, int(item.span) ?? def.w));
    const h = Math.max(def.minH ?? 1, int(item.h) ?? def.h);
    const x = int(item.x);
    const y = int(item.y);
    const placed = x != null && y != null && x >= 0 && y >= 0;
    return { id: item.id, span, x: placed ? Math.min(x, cols - span) : null, y: placed ? y : null, h };
  });
  let y = sized.reduce((bottom, it) => (it.y == null ? bottom : Math.max(bottom, it.y + it.h)), 0);
  let x = 0;
  let rowH = 0;
  for (const it of sized) {
    if (it.x != null) continue;
    if (x + it.span > cols) {
      y += rowH;
      x = 0;
      rowH = 0;
    }
    it.x = x;
    it.y = y;
    x += it.span;
    rowH = Math.max(rowH, it.h);
  }
  return sized;
}

// A saved layout against the current registry: unknown or repeated widgets
// are dropped, sizes clamped, and widgets added since are appended.
export function reconcileLayout(registry, saved, options) {
  const seen = new Set();
  const kept = (Array.isArray(saved) ? saved : []).filter((it) => it && registry[it.id] && !seen.has(it.id) && seen.add(it.id));
  const added = Object.keys(registry)
    .filter((id) => !seen.has(id))
    .map((id) => ({ id }));
  return flowLayout(registry, [...kept, ...added], options);
}

// To react-grid-layout's items.
export const toGridItems = (registry, layout, { maxSpan = 2, editing = false } = {}) =>
  layout.map((it) => ({
    i: it.id,
    x: it.x,
    y: it.y,
    w: it.span,
    h: it.h,
    minW: 1,
    maxW: maxSpan,
    minH: registry[it.id]?.minH ?? 1,
    isDraggable: editing,
    isResizable: editing,
  }));

// The grid only holds the visible widgets; hidden ones keep their saved place.
export const mergeVisible = (layout, gridItems) => {
  const byId = new Map(gridItems.map((it) => [it.i, { id: it.i, span: it.w, x: it.x, y: it.y, h: it.h }]));
  return layout.map((it) => byId.get(it.id) ?? it);
};

// The same cards in reading order, one per row (phones).
export const stackItems = (items) =>
  [...items]
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .reduce((acc, it) => {
      const prev = acc[acc.length - 1];
      return [...acc, { ...it, x: 0, y: prev ? prev.y + prev.h : 0, w: 1, maxW: 1, isDraggable: false, isResizable: false }];
    }, []);
