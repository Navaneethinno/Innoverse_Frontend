// The `Deviceinfo` header sent with every call: the device is recorded with
// sign-ins and with every change and transaction a user makes. This is a web
// browser; `device_id` is made once per browser and kept (same shape as the
// merchant and customer portals).
const KEY = "innoverse-admin:device-id";

function deviceId() {
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = window.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "web-unknown";
  }
}

export const DEVICE_INFO = {
  device_id: deviceId(),
  device_type: "WEB",
  device_isp: "Unknown",
  network_type: typeof navigator !== "undefined" ? (navigator.connection?.effectiveType ?? "Unknown") : "Unknown",
  user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
};
