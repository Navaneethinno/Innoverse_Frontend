import { API_ENDPOINTS } from "@/Utils/Constant";
import { request, rowsOf } from "@/Services/Epurse/onboarding.api";
import { LAYOUT_VERSION } from "@/Pages/Dashboard/layout/gridLayout";

// Dashboard (Admin portal handoff: dashboard). The layout is per user and
// only the user's own (user_id + user_name must be the signed-in user);
// the summary returns the layout and every widget's data in one call.
const DASHBOARD_KEY = "control_space";
const first = (response) => rowsOf(response)[0] ?? null;

export const dashboardApi = {
  // `layout: null` resets to the default.
  saveLayout: async (user, layout) =>
    first(
      await request(API_ENDPOINTS.USER_MANAGEMENT.DASHBOARD_LAYOUT_SAVE, {
        dashboard_key: DASHBOARD_KEY,
        user_id: user.id,
        user_name: user.username,
        layout,
        ...(layout ? { layout_version: LAYOUT_VERSION } : {}),
      }),
    ),
  // One module's own dashboard; a module without one answers config.dashboard_module_unknown.
  module: async (module) => first(await request(API_ENDPOINTS.DASHBOARD.MODULE, { module })),
  // widgets: ids to refresh (all when left out).
  summary: async (body = {}) => first(await request(API_ENDPOINTS.DASHBOARD.SUMMARY, { dashboard_key: DASHBOARD_KEY, ...body })),
};
