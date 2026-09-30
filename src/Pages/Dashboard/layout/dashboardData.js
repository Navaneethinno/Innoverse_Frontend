import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { dashboardApi } from "@/Services/Dashboard/dashboard.api";
import { notifications } from "@/Utils/Lib/notifications";

// The dashboard's data: one /config/dashboard/summary call for every widget
// (the server decides what each user may see), refreshed as a whole or per
// widget. Nothing is pushed live, so the page re-asks on demand.
export const DashboardDataContext = createContext({ widgets: null, loading: true, error: null });

export function useDashboardSummary() {
  const [state, setState] = useState({ widgets: null, layout: undefined, loading: true, error: null });

  const refresh = useCallback(async (ids) => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await dashboardApi.summary(ids ? { widgets: ids } : {});
      setState((s) => ({
        widgets: ids ? { ...(s.widgets ?? {}), ...(data?.widgets ?? {}) } : (data?.widgets ?? {}),
        layout: ids ? s.layout : (data?.layout ?? null),
        loading: false,
        error: null,
      }));
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error }));
      notifications.error(error.message);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}

// One widget's data: `data` is the widget object once loaded (null while
// loading or when the summary failed).
export function useWidgetData(id) {
  const { widgets, loading, error } = useContext(DashboardDataContext);
  const data = widgets?.[id];
  return { data: data?.available ? data : null, loading: loading && !data, failed: Boolean(error) && !data };
}

// Widgets the server says this user can't see are hidden. quickActions is
// frontend-only and always shown.
export const isHidden = (widgets, id) => id !== "quickActions" && widgets?.[id]?.available === false;
