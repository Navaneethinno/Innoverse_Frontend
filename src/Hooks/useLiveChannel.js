import { useEffect, useRef } from "react";
import { getAccessToken } from "@/Services/api/authStorage";
import { buildLiveUrl } from "@/Utils/Lib/liveUrl";

const PING_INTERVAL_MS = 25000;
const MAX_RECONNECT_DELAY_MS = 30000;
const DEBOUNCE_MS = 500;

// Subscribes to a backend "live" WebSocket channel (per the Live Updates
// Integration Guide) for one entity's list endpoint, so every subscriber —
// not just the tab that made the change — hears about mutations the instant
// they succeed, from any user/tab/device. onChanged(action, records) fires
// on every server-pushed `changed` message; callers pass their entity's own
// `notify*Change()` (the same window-event that already drives a refetch
// after this tab's own mutations, see institutionHooks.js/userHooks.js/
// profileHooks.js) so a push from anyone else's action triggers the exact
// same refetch path a local mutation already does.
//
// Reconnects with exponential backoff (capped, unlike payse's flat 5s
// retry) and re-reads the access token on every (re)connect attempt (so a
// refreshed token is picked up instead of retrying with a stale one).
//
// Server messages (Live updates, 3 Oct 2026):
//   changed        - refetch. Any action name may come (disburse, repay,
//                    run, ...), so none is filtered. One change can arrive
//                    twice (the screen action and the database), so pushes
//                    within half a second are merged into one call. `data`
//                    is the full record from a screen action, or only ids
//                    and status from a change made elsewhere: callers
//                    refetch rather than merge it.
//   auth_error     - refused (ended session, or no permission for this
//                    screen): stop, without reconnecting on the same token.
//                    The page's own API calls handle an ended session.
//   session_ended  - the user logged out (any device), the session expired
//                    or the permission was removed: sign out here, as the
//                    REST layer does on a 401.
export function useLiveChannel(listPath, onChanged, { enabled = true } = {}) {
  const onChangedRef = useRef(onChanged);
  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  useEffect(() => {
    if (!enabled || !listPath) return undefined;

    let socket = null;
    let pingTimer = null;
    let reconnectTimer = null;
    let attempt = 0;
    let intentionallyClosed = false;
    let debounceTimer = null;
    let pending = { action: null, records: [] };

    // Pushes within DEBOUNCE_MS reach onChanged once, with every record.
    function deliver(action, records) {
      pending = { action, records: [...pending.records, ...records] };
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        const { action: last, records: all } = pending;
        pending = { action: null, records: [] };
        debounceTimer = null;
        onChangedRef.current?.(last, all);
      }, DEBOUNCE_MS);
    }

    function scheduleReconnect() {
      if (intentionallyClosed) return;
      const delay = Math.min(1000 * 2 ** attempt, MAX_RECONNECT_DELAY_MS);
      attempt += 1;
      reconnectTimer = window.setTimeout(connect, delay);
    }

    function connect() {
      const token = getAccessToken();
      if (!token) return;

      socket = new WebSocket(buildLiveUrl(listPath));

      socket.onopen = () => {
        attempt = 0;
        socket.send(JSON.stringify({ type: "auth", token: `Bearer ${token}` }));
        pingTimer = window.setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping" }));
          }
        }, PING_INTERVAL_MS);
      };

      socket.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        if (message?.type === "changed") {
          const records = Array.isArray(message.data)
            ? message.data
            : typeof message.data === "string"
              ? JSON.parse(message.data)
              : [];
          deliver(message.action, records);
          return;
        }
        if (message?.type === "auth_error") {
          intentionallyClosed = true;
          socket.close();
          return;
        }
        if (message?.type === "session_ended") {
          intentionallyClosed = true;
          socket.close();
          window.dispatchEvent(new Event("auth:unauthorized"));
        }
      };

      socket.onclose = () => {
        if (pingTimer) window.clearInterval(pingTimer);
        pingTimer = null;
        scheduleReconnect();
      };
    }

    connect();

    return () => {
      intentionallyClosed = true;
      if (pingTimer) window.clearInterval(pingTimer);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (debounceTimer) window.clearTimeout(debounceTimer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [enabled, listPath]);
}
