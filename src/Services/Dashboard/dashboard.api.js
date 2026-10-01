import { request, rowsOf } from "@/Services/Epurse/onboarding.api";
import { LAYOUT_VERSION } from "@/Pages/Dashboard/layout/gridLayout";

// Dashboard (Admin portal handoff: dashboard). The layout is per user and
// only the user's own (user_id + user_name must be the signed-in user);
// the summary returns the layout and every widget's data in one call.
export const DASHBOARD_KEY = "control_space";
const first = (response) => rowsOf(response)[0] ?? null;

export const dashboardApi = {
  getLayout: async (user) => first(await request("/config/user/dashboard_layout/get", { dashboard_key: DASHBOARD_KEY, user_id: user.id, user_name: user.username })),
  // `layout: null` resets to the default.
  saveLayout: async (user, layout) =>
    first(
      await request("/config/user/dashboard_layout/save", {
        dashboard_key: DASHBOARD_KEY,
        user_id: user.id,
        user_name: user.username,
        layout,
        ...(layout ? { layout_version: LAYOUT_VERSION } : {}),
      }),
    ),
  // widgets: ids to refresh (all when left out).
  summary: async (body = {}) => first(await request("/config/dashboard/summary", { dashboard_key: DASHBOARD_KEY, ...body })),
};
