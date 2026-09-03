import { lazy } from "react";
import { pageElement } from "./routeSupport";
const PendingPage = lazy(() =>
  import("@/Pages/Pending/PendingDashboardPage").then((m) => ({
    default: m.PendingDashboardPage,
  })),
);
export const pendingRoutes = [{ path: "/pending", element: pageElement(PendingPage) }];
