import { lazy } from "react";
import { pageElement } from "../routeSupport";

// GLOBAL SETTINGS > Limit: limit groups, their rules and members.
const LimitGroups = lazy(() => import("@/Components/GlobalSettings/Limit/LimitGroups.jsx").then((m) => ({ default: m.LimitGroups })));

// GLOBAL SETTINGS > Fee Schedules (menu 190).
const FeeSchedules = lazy(() => import("@/Components/GlobalSettings/FeeSchedules/FeeSchedules.jsx").then((m) => ({ default: m.FeeSchedules })));

export const globalSettingsRoutes = [
  { path: "feeschedules", element: pageElement(FeeSchedules) },
  { path: "feeschedules/:id", element: pageElement(FeeSchedules) },
  { path: "limit", element: pageElement(LimitGroups) },
  { path: "limit/:id", element: pageElement(LimitGroups) },
];
