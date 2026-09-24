import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { pageElement } from "../routeSupport";

// "Frontend fixes — onboarding menus and corporate masters", 2026-09,
// fixes 1-2: ONE "Onboarding Configuration" menu (path onboardingconfiguration)
// and ONE "Onboarding Wizard" menu (path onboardingwizard) — individual and
// corporate share the same page behind an Individual|Corporate switch
// (OnboardingConfiguration/OnboardingWizard), kept in ?type=. The
// separate corporate menus/pages are gone; old corporate-only links redirect
// to the unified page with ?type=corporate instead of 404ing or staying
// pages of their own.
const OnboardingConfigHub = lazy(() =>
  import("@/Components/Epurse/Onboarding/OnboardingConfiguration/OnboardingConfiguration.jsx").then((m) => ({ default: m.OnboardingConfiguration })),
);
const OnboardingWizard = lazy(() =>
  import("@/Components/Epurse/Onboarding/OnboardingWizard/OnboardingWizard.jsx").then((m) => ({ default: m.OnboardingWizard })),
);

// The old `/customer/indv_profile/*` maker-checker list+wizard is gone —
// those endpoints 404 across the board. The sidebar's "Customer" menu item
// (slug "customer") now opens the real runtime onboarding work list from
// "Customer Onboarding (Individual) — Frontend Guide" (/customer/individual/*),
// via the same Individual|Corporate hub as "Onboarding Wizard" below.
export const onboardingRoutes = [
  { path: "customer", element: pageElement(OnboardingWizard) },
  { path: "customer/:id", element: pageElement(OnboardingWizard) },
];

// Sidebar menu "Onboarding Wizard" -> confirmed path "onboardingwizard"
// (+ the per-click uuid).
onboardingRoutes.push(
  { path: "onboardingwizard", element: pageElement(OnboardingWizard) },
  { path: "onboardingwizard/:id", element: pageElement(OnboardingWizard) },
);

// Sidebar menu "Onboarding Configuration" -> confirmed path
// "onboardingconfiguration" (+ the per-click uuid). The CONFIGURATION entry
// point (customer types and their maker-checker state), not the
// customer-facing onboarding itself.
onboardingRoutes.push(
  { path: "onboardingconfiguration", element: pageElement(OnboardingConfigHub) },
  { path: "onboardingconfiguration/:id", element: pageElement(OnboardingConfigHub) },
);

// Old corporate-only links (this app's own earlier best-guess slugs, since
// the real menu names weren't confirmed yet at the time) now redirect into
// the unified pages with ?type=corporate rather than staying separate pages
// — fix 1/2 explicitly call out keeping /corporateonboardingconfiguration
// as exactly this kind of redirect so old links still work; the others
// below are this app's own prior guesses getting the same treatment for
// consistency, not routes the fix document itself names.
const redirectToCorporate = (to) => <Navigate to={`${to}?type=corporate`} replace />;
// Sidebar links always carry a trailing /<uuid>, so an old bookmark is
// /corporateonboardingconfiguration/<uuid> — register the :id form too.
const corporateRedirects = {
  corporateonboardingconfiguration: "/onboardingconfiguration",
  corporatecustomertypes: "/onboardingconfiguration",
  corporatecustomertype: "/onboardingconfiguration",
  corporateonboardingdefinition: "/onboardingconfiguration",
  corporateonboardingwizard: "/onboardingwizard",
  corporatecustomer: "/onboardingwizard",
};
onboardingRoutes.push(
  ...Object.entries(corporateRedirects).flatMap(([path, to]) => [
    { path, element: redirectToCorporate(to) },
    { path: `${path}/:id`, element: redirectToCorporate(to) },
  ]),
);
