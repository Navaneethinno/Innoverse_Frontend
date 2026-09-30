import { lazy } from "react";
import { pageElement } from "../routeSupport";

// GLOBAL SETTINGS > Limit: limit groups, their rules and members.
const LimitGroups = lazy(() => import("@/Components/GlobalSettings/Limit/LimitGroups.jsx").then((m) => ({ default: m.LimitGroups })));

export const globalSettingsRoutes = [
  { path: "limit", element: pageElement(LimitGroups) },
  { path: "limit/:id", element: pageElement(LimitGroups) },
];
