import { lazy } from "react";
import { pageElement } from "./routeSupport";
// The old `/customer/indv_profile/*` maker-checker list+wizard is gone —
// those endpoints 404 across the board. The sidebar's "Customer" menu item
// (slug "customer") now opens the real runtime onboarding work list from
// "Customer Onboarding (Individual) — Frontend Guide" (/customer/individual/*).
const Resource = lazy(() =>
  import("@/Components/Customer/CustomerOnboardingResource.jsx").then((m) => ({ default: m.CustomerOnboardingResource })),
);
export const customerRoutes = [
  { path: "customer", element: pageElement(Resource) },
  { path: "customer/:id", element: pageElement(Resource) },
];

const CustomerTypes = lazy(() =>
  import("@/Components/OnboardingConfig/OnboardingConfigurationPage.jsx").then((m) => ({ default: m.OnboardingConfigurationPage })),
);
// Sidebar menu "Customer Individual" (older name for the same menu, now
// called "Onboarding Configuration" below) -> slug "customerindividual"
// (+ the per-click uuid MenuItem appends). It is the CONFIGURATION entry
// point for individual customers (customer types and their versions), not
// the customer-facing onboarding itself. Kept as a fallback in case an
// institution's menu still uses the old name.
customerRoutes.push(
  { path: "customerindividual", element: pageElement(CustomerTypes) },
  { path: "customerindividual/:id", element: pageElement(CustomerTypes) },
);

// Sidebar menu "Onboarding Wizard" -> slug "onboardingwizard" (+ the
// per-click uuid). Same runtime onboarding work list as "customer" above —
// just the entry point the backend menu now names explicitly.
customerRoutes.push(
  { path: "onboardingwizard", element: pageElement(Resource) },
  { path: "onboardingwizard/:id", element: pageElement(Resource) },
);

// Sidebar menu "Onboarding Configuration" -> slug "onboardingconfiguration"
// (+ the per-click uuid). Same CONFIGURATION entry point as
// "customerindividual" above — another name the backend menu uses for it.
customerRoutes.push(
  { path: "onboardingconfiguration", element: pageElement(CustomerTypes) },
  { path: "onboardingconfiguration/:id", element: pageElement(CustomerTypes) },
);
