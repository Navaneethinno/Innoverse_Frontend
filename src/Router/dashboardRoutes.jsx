import { lazy } from "react";
import { pageElement } from "./routeSupport";
const DashboardPage = lazy(() =>
  import("@/Pages/Dashboard/ControlSpacePage").then((m) => ({ default: m.ControlSpacePage })),
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
];
