import { useEffect, useState } from "react";

const QUERY = "(max-width: 767px)";

// Single source of truth for the "mobile" breakpoint used to switch the
// sidebar between its always-visible desktop rail and an off-canvas drawer
// (see SidebarContext.jsx/DynamicSidebar.jsx/AppLayout.jsx/TopBar.jsx) —
// matches Tailwind's own `md` breakpoint (768px) so this stays in sync with
// every `md:` utility class already used throughout the app.
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const handleChange = (event) => setIsMobile(event.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);
  return isMobile;
}
