import { lazy } from "react";
import { pageElement } from "../routeSupport";

// GLOBAL SETTINGS > Limit: limit groups, their rules and members.
const LimitGroups = lazy(() => import("@/Components/GlobalSettings/Limit/LimitGroups.jsx").then((m) => ({ default: m.LimitGroups })));

// GLOBAL SETTINGS > Fee Schedules (menu 190).
const FeeSchedules = lazy(() => import("@/Components/GlobalSettings/FeeSchedules/FeeSchedules.jsx").then((m) => ({ default: m.FeeSchedules })));

// GLOBAL SETTINGS > External Providers (menu 210).
const ExtProviders = lazy(() => import("@/Components/GlobalSettings/ExtProviders/ExtProviders.jsx").then((m) => ({ default: m.ExtProviders })));

export const globalSettingsRoutes = [
  { path: "feeschedules", element: pageElement(FeeSchedules) },
  { path: "feeschedules/:id", element: pageElement(FeeSchedules) },
  { path: "externalproviders", element: pageElement(ExtProviders) },
  { path: "externalproviders/:id", element: pageElement(ExtProviders) },
  { path: "limit", element: pageElement(LimitGroups) },
  { path: "limit/:id", element: pageElement(LimitGroups) },
];
