import { lazy } from "react";
import { pageElement } from "./routeSupport";
const DashboardPage = lazy(() =>
  import("@/Pages/Dashboard/ControlSpacePage").then((m) => ({ default: m.ControlSpacePage })),
);
export const dashboardRoutes = [{ path: "/dashboard", element: pageElement(DashboardPage) }];
