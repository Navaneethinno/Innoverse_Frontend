import { useCallback, useEffect, useRef, useState } from "react";
import { dashboardApi } from "@/Services/Dashboard/dashboard.api";
import { notifications } from "@/Utils/Lib/notifications";
import { reconcileLayout } from "./gridLayout";
import { GRID_COLS, MAX_SPAN, WIDGET_REGISTRY, defaultLayout } from "./widgetRegistry";

// Per-user widget layout. The server is the only copy: it comes back with
// the dashboard summary and is saved to /config/user/dashboard_layout a
// moment after the last move or resize. Nothing is kept in the browser.
const SAVE_DELAY = 800;
const options = { cols: GRID_COLS, maxSpan: MAX_SPAN };

// `serverLayout`: the layout the summary returned (undefined until it has
// answered, null when the user never customised). `layout` stays null until
// then, so the page never flashes a layout it is about to replace.
export function useDashboardLayout(user, serverLayout) {
  const [layout, setLayoutState] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    if (serverLayout === undefined) return;
    setLayoutState(serverLayout?.layout ? reconcileLayout(WIDGET_REGISTRY, serverLayout.layout, options) : defaultLayout());
  }, [serverLayout]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const save = useCallback(
    (value) => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (!user?.id) return;
        dashboardApi.saveLayout(user, value).catch((error) => notifications.error(error.message));
      }, SAVE_DELAY);
    },
    [user],
  );

  const setLayout = useCallback(
    (value) => {
      setLayoutState(value);
      save(value);
    },
    [save],
  );

  const resetLayout = useCallback(() => {
    setLayoutState(defaultLayout());
    save(null);
  }, [save]);

  return { layout, setLayout, resetLayout };
}
