import { createContext, useContext, useState } from "react";
const SidebarContext = createContext({
  collapsed: false,
  hovering: false,
  setHovering: () => {},
  toggle: () => {},
});
export function SidebarStateProvider({ children }) {
  // Collapsed (icon-only rail) by default — the sidebar auto-expands on
  // hover instead of needing to be pinned open. `collapsed` is the user's
  // pinned preference; `hovering` is set by DynamicSidebar while the mouse
  // is over the rail. Both live here (not just inside DynamicSidebar) so
  // AppLayout can reflow the page's reserved margin in sync with the same
  // "is it visually expanded right now" state — an earlier version kept
  // hovering local to DynamicSidebar and had the sidebar overlay on top of
  // the page instead, which looked broken: the glass blur isn't opaque
  // enough to fully hide the content underneath, so text/controls behind
  // the expanded rail visibly collided with it.
  const [collapsed, setCollapsed] = useState(true);
  const [hovering, setHovering] = useState(false);
  return (
    <SidebarContext.Provider
      value={{ collapsed, hovering, setHovering, toggle: () => setCollapsed((c) => !c) }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
export const useSidebar = () => useContext(SidebarContext);
