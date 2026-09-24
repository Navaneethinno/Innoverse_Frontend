import { useCallback, useEffect, useState } from "react";
import { WIDGET_REGISTRY, clampSpan, defaultLayout } from "./widgetRegistry";

// Per-user widget layout, persisted in localStorage (there is no
// user-settings endpoint yet). Stored as [{ id, span }] — order + width
// only, never pixel positions, so a saved layout can't produce overlap.
const STORAGE_PREFIX = "innoverse:dashboard-layout:";

// A saved layout is reconciled with the current registry on load: widgets
// that no longer exist are dropped, spans are clamped to each widget's
// min/max, and widgets added since the user last saved are appended in their
// default position order — so shipping a new widget needs no migration.
function reconcile(saved) {
  if (!Array.isArray(saved)) return defaultLayout();
  const seen = new Set();
  const kept = saved
    .filter((item) => item && WIDGET_REGISTRY[item.id] && !seen.has(item.id) && seen.add(item.id))
    .map((item) => ({ id: item.id, span: clampSpan(item.id, item.span) }));
  const added = defaultLayout().filter((item) => !seen.has(item.id));
  return [...kept, ...added];
}

function read(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? reconcile(JSON.parse(raw)) : defaultLayout();
  } catch {
    return defaultLayout();
  }
}

function write(key, layout) {
  try {
    window.localStorage.setItem(key, JSON.stringify(layout));
  } catch {
    // Storage unavailable (private mode, quota) — the layout still works
    // for this session, it just won't survive a reload.
  }
}

export function useDashboardLayout(userKey) {
  const storageKey = STORAGE_PREFIX + (userKey || "anonymous");
  const [layout, setLayoutState] = useState(() => read(storageKey));

  // A different user signing in on the same browser gets their own layout.
  useEffect(() => {
    setLayoutState(read(storageKey));
  }, [storageKey]);

  const setLayout = useCallback(
    (next) =>
      setLayoutState((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        write(storageKey, value);
        return value;
      }),
    [storageKey],
  );

  const resetLayout = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore — falls back to the default below either way
    }
    setLayoutState(defaultLayout());
  }, [storageKey]);

  return { layout, setLayout, resetLayout };
}
