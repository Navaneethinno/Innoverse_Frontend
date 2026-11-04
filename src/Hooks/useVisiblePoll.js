import { useEffect, useRef } from "react";

// Calls `read` every `every` ms while `enabled`, only while the browser tab is
// visible, and never while the last call is still waiting. `read` returns a
// promise. The first call is the caller's.
export function useVisiblePoll(read, every, enabled = true) {
  const latest = useRef(read);
  useEffect(() => {
    latest.current = read;
  });
  useEffect(() => {
    if (!enabled) return undefined;
    let waiting = false;
    const timer = window.setInterval(() => {
      if (waiting || document.visibilityState !== "visible") return;
      waiting = true;
      Promise.resolve(latest.current()).finally(() => {
        waiting = false;
      });
    }, every);
    return () => window.clearInterval(timer);
  }, [every, enabled]);
}

// One read per body: a call still waiting is shared, and a repeat within
// `fresh` ms gets the same answer, so a remount or a render loop can't send a
// burst. `force` (after the user's own action) always reads again.
export function sharedReader(call, fresh = 5000) {
  const reads = new Map();
  return (body, { force = false } = {}) => {
    const key = JSON.stringify(body);
    const last = reads.get(key);
    if (last && (last.waiting || (!force && Date.now() - last.at < fresh))) return last.promise;
    const entry = { at: Date.now(), waiting: true };
    entry.promise = call(body).finally(() => {
      entry.waiting = false;
      entry.at = Date.now();
    });
    reads.set(key, entry);
    return entry.promise;
  };
}
