import { useEffect, useRef } from "react";
import { getAccessToken } from "@/Services/api/authStorage";
import { buildLiveUrl } from "@/Utils/Lib/liveUrl";

const PING_INTERVAL_MS = 25000;
const MAX_RECONNECT_DELAY_MS = 30000;

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
// retry), re-reads the access token on every (re)connect attempt (so a
// refreshed token is picked up instead of retrying with a stale one), and
// treats a server `auth_error` exactly like a REST 401 by dispatching the
// same `auth:unauthorized` event the API layer already uses.
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
          onChangedRef.current?.(message.action, records);
          return;
        }
        if (message?.type === "auth_error") {
          intentionallyClosed = true;
          window.dispatchEvent(new Event("auth:unauthorized"));
          socket.close();
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
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [enabled, listPath]);
}
