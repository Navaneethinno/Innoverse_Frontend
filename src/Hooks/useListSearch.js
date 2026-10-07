import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSessionState } from "@/Hooks/useSessionState";

// Server search for a list page (Admin handoff "search on list pages"): the
// list call's body carries `search`, the server matches every row (contains,
// any case), then applies the tab, sort and page.
//
// - Typing searches 350 ms after the last key, from 2 characters; clearing
//   the box reloads the whole list.
// - Enter or the search button searches at once.
// - A new search goes back to page 1 (`onReset`); the text stays when the
//   page, tab or sort change.
// - Only the newest reply counts: `latest(promise)` settles only when no
//   newer list call has started since, so a slow older reply never replaces
//   newer results.
const DELAY = 350;
const MIN = 2;
const MAX = 100;
const clean = (text) => String(text ?? "").trim().replace(/\s+/g, " ").slice(0, MAX);

// `persistKey` (optional): keep the text when the user leaves the page and
// comes back in the same tab.
export function useListSearch(onReset, persistKey = null) {
  const [input, setInput] = useSessionState(persistKey, "");
  const [term, setTerm] = useState(() => clean(input));
  const resetRef = useRef(onReset);
  useEffect(() => {
    resetRef.current = onReset;
  });
  const seq = useRef(0);

  const termRef = useRef(term);
  const apply = useCallback((next) => {
    if (termRef.current === next) return;
    termRef.current = next;
    resetRef.current?.();
    setTerm(next);
  }, []);

  useEffect(() => {
    const next = clean(input);
    if (next && next.length < MIN) return undefined;
    const id = window.setTimeout(() => apply(next), next ? DELAY : 0);
    return () => window.clearTimeout(id);
  }, [input, apply]);

  const submit = useCallback(() => apply(clean(input)), [apply, input]);

  const latest = useCallback((promise) => {
    const id = ++seq.current;
    return promise.then(
      (value) => (id === seq.current ? value : new Promise(() => {})),
      (error) => (id === seq.current ? Promise.reject(error) : new Promise(() => {})),
    );
  }, []);

  // Spread into the list call's body (stable while the term is).
  const body = useMemo(() => (term ? { search: term } : {}), [term]);

  return {
    term,
    body,
    latest,
    // Spread into StatusFilterTabs (or any search box with these props).
    bind: { search: input, onSearch: setInput, onSearchSubmit: submit },
  };
}
