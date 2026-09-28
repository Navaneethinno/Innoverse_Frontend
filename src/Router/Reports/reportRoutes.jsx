import { lazy } from "react";
import { pageElement } from "../routeSupport";

// Reports (read-only). Slugs are the menu names, as everywhere else.
const UserActivity = lazy(() => import("@/Components/Reports/UserActivity").then((m) => ({ default: m.UserActivity })));

export const reportRoutes = [
  { path: "useractivity", element: pageElement(UserActivity) }, // Reports > User Activity (menu 106)
  { path: "useractivity/:id", element: pageElement(UserActivity) },
];
