import { lazy } from "react";
import { pageElement } from "./routeSupport";
const Resource = lazy(() => import("@/Components/Customer/CustomerResource.jsx").then((m) => ({ default: m.CustomerResource })));
// The sidebar's "Customer" menu item slugifies to "customer" (see
// menuRouteMap.js's slugifyMenuName) — a single flat page, same as Digital
// Product's own top-level "Digital Product" entry, not an expandable
// submenu of sub-entity pages.
export const customerRoutes = [
  { path: "customer", element: pageElement(Resource) },
  { path: "customer/:id", element: pageElement(Resource) },
];

const Pending = lazy(() => import("@/Components/Customer/CustomerIndividualPending.jsx").then((m) => ({ default: m.CustomerIndividualPending })));
// Sidebar menu "Customer Individual" -> slug "customerindividual" (+ the
// per-click uuid MenuItem appends).
customerRoutes.push(
  { path: "customerindividual", element: pageElement(Pending) },
  { path: "customerindividual/:id", element: pageElement(Pending) },
);
