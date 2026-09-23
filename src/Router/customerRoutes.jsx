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

// Sidebar menu "Onboarding Wizard" -> slug "onboardingwizard" (+ the
// per-click uuid). Same runtime onboarding work list as "customer" above —
// just the entry point the backend menu now names explicitly.
customerRoutes.push(
  { path: "onboardingwizard", element: pageElement(Resource) },
  { path: "onboardingwizard/:id", element: pageElement(Resource) },
);

// Sidebar menu "Onboarding Configuration" -> slug "onboardingconfiguration"
// (+ the per-click uuid). The CONFIGURATION entry point for individual
// customers (customer types and their versions), not the customer-facing
// onboarding itself.
customerRoutes.push(
  { path: "onboardingconfiguration", element: pageElement(CustomerTypes) },
  { path: "onboardingconfiguration/:id", element: pageElement(CustomerTypes) },
);

// Corporate mirror of the "customer"/"onboardingwizard" entry points above
// (Customer Onboarding (Corporate) — Frontend Guide, 2026-09) — real
// menu_name not confirmed yet, same "answer on a few plausible slugs" hedge
// used throughout this app's menu-driven routing.
const CorpResource = lazy(() =>
  import("@/Components/Customer/CorporateCustomerOnboardingResource.jsx").then((m) => ({ default: m.CorporateCustomerOnboardingResource })),
);
customerRoutes.push(
  { path: "corporatecustomer", element: pageElement(CorpResource) },
  { path: "corporatecustomer/:id", element: pageElement(CorpResource) },
  { path: "corporateonboardingwizard", element: pageElement(CorpResource) },
  { path: "corporateonboardingwizard/:id", element: pageElement(CorpResource) },
);
