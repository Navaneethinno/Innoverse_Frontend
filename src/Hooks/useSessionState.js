import { useEffect, useState } from "react";

// useState that survives leaving the page and coming back within the same
// browser tab (sessionStorage), e.g. a list's page, filter and search while
// the user opens a record on its own route and returns. Values must be
// JSON-serialisable. Storage failures (private mode, quota) just fall back
// to plain in-memory state. A null/empty key disables persistence, so a
// component can opt in with a prop without calling hooks conditionally.
export function useSessionState(key, initialValue) {
  const storageKey = key ? `innoverse:view:${key}` : null;
  const [value, setValue] = useState(() => {
    if (storageKey) {
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (stored !== null) return JSON.parse(stored);
      } catch {
        // fall through to the initial value
      }
    }
    return typeof initialValue === "function" ? initialValue() : initialValue;
  });

  useEffect(() => {
    if (!storageKey) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // not persisted; the in-memory state still works
    }
  }, [storageKey, value]);

  return [value, setValue];
}
