import { lazy } from "react";
import { pageElement } from "../routeSupport";

// Reports (read-only). Slugs are the menu names, as everywhere else.
const UserActivity = lazy(() => import("@/Components/Reports/UserActivity").then((m) => ({ default: m.UserActivity })));
const RiskScoreBreakdown = lazy(() => import("@/Components/Reports/RiskScoreBreakdown").then((m) => ({ default: m.RiskScoreBreakdown })));

export const reportRoutes = [
  { path: "useractivity", element: pageElement(UserActivity) }, // Reports > User Activity (menu 106)
  { path: "useractivity/:id", element: pageElement(UserActivity) },
  { path: "riskscorebreakdown", element: pageElement(RiskScoreBreakdown) }, // Reports > Risk Score Breakdown (menu 107)
  { path: "riskscorebreakdown/:id", element: pageElement(RiskScoreBreakdown) },
];
