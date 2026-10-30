import { useCallback, useState } from "react";

// What the guide remembers for this user in this browser: topics finished
// (per page), pages seen, modules visited, whether a practice step was done,
// and where an unfinished topic stopped. Browser storage only, so it can be
// empty (private window, cleared data) and everything still works.

const EMPTY = { done: {}, seen: {}, modules: {}, practiced: false, resume: null };

function read(key) {
  try {
    return { ...EMPTY, ...JSON.parse(window.localStorage.getItem(key) ?? "{}") };
  } catch {
    return { ...EMPTY };
  }
}

export function useGuideProgress(userKey) {
  const key = `guide:v1:${userKey ?? "anon"}`;
  const [state, setState] = useState(() => read(key));
  const update = useCallback(
    (fn) =>
      setState((previous) => {
        const next = { ...previous, ...fn(previous) };
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Storage blocked: kept for this visit only.
        }
        return next;
      }),
    [key],
  );
  return [state, update];
}
