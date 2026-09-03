import { lazy } from "react";
import { pageElement } from "./routeSupport";
const ApplicationsPage = lazy(() =>
  import("@/Pages/Applications/ApplicationsPage").then((m) => ({
    default: m.ApplicationsPage,
  })),
);
export const applicationRoutes = [
  { path: "/applications", element: pageElement(ApplicationsPage) },
];
