import { lazy } from "react";
import { pageElement } from "./routeSupport";
const DashboardPage = lazy(() =>
  import("@/Pages/Dashboard/ControlSpacePage").then((m) => ({ default: m.ControlSpacePage })),
);
// TopBar.jsx's bell button has always navigated here; no route existed for
// it, so it 404'd (RouteError). Not sourced from menu_array like Dashboard,
// for the same reason it was never expected to appear in the sidebar.
const NotificationsPage = lazy(() =>
  import("@/Pages/Notifications/NotificationsPage").then((m) => ({ default: m.NotificationsPage })),
);
// Matches payseFrontend's Router.jsx structure: Dashboard is the default
// route of the protected layout (there, `path: ""` under "/body" — payse's
// own senior-verified adjustment). Here that's the protected group's root
// "/", registered alongside the existing "/dashboard" path so any code
// still calling navigate("/dashboard") keeps working. Either way, Dashboard
// is never sourced from menu_array, so it was already structurally
// impossible for it to appear in the sidebar (DynamicSidebar only renders
// items from the user's own menu_array/masterModules) — this change aligns
// the router structure with payse's, it doesn't change that guarantee.
export const dashboardRoutes = [
  { path: "/", element: pageElement(DashboardPage) },
  { path: "/dashboard", element: pageElement(DashboardPage) },
  { path: "/notifications", element: pageElement(NotificationsPage) },
];
