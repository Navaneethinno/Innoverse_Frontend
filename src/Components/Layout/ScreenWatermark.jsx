import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/Hooks/useAuth";
import { formatDateTime } from "@/Utils/Lib/dateFormat";
import { useEnvironment } from "@/Utils/Lib/environment";
import { isLockedEnvironment } from "@/Utils/Lib/uiLock";

const MINUTE = 60000;
const escapeXml = (text) => String(text).replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

// The signed-in user and the time, faintly across the screen, so a screenshot
// shows who took it (no page can stop the system's own screenshots). Clicks go
// through it, and it stays off printed receipts and reports.
export function ScreenWatermark() {
  const on = isLockedEnvironment(useEnvironment());
  const user = useAuth((state) => state.user);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!on) return undefined;
    const timer = window.setInterval(() => setNow(new Date()), MINUTE);
    return () => window.clearInterval(timer);
  }, [on]);
  const name = user?.username ?? user?.user_name;
  const stamp = formatDateTime(now);
  const image = useMemo(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="200"><text x="170" y="100" transform="rotate(-24 170 100)" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#64748b" fill-opacity="0.13">${escapeXml(`${name} · ${stamp}`)}</text></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, [name, stamp]);
  if (!on || !name) return null;
  return <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9999] print:hidden" style={{ backgroundImage: image }} />;
}
