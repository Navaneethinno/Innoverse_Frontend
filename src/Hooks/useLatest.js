import { useLayoutEffect, useRef } from "react";

// A ref that always holds the latest `value`. An effect reads `.current` to use
// a callback or body the parent rebuilds every render, without re-running for it.
export function useLatest(value) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
