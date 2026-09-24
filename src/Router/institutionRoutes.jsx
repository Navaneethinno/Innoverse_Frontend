import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { pageElement } from "./routeSupport";
const InstitutionListPage = lazy(() =>
  import("@/Components/Institution/InstitutionProfile").then((m) => ({
    default: m.InstitutionProfile,
  })),
);
const InstitutionCreatePage = lazy(() =>
  import("@/Components/Institution/InstitutionProfile").then((m) => ({
    default: m.AddInstitutionProfile,
  })),
);
const InstitutionDetailPage = lazy(() =>
  import("@/Components/Institution/InstitutionProfile").then((m) => ({
    default: m.ViewInstitutionProfile,
  })),
);
const InstitutionModule = lazy(() => import("@/Components/Institution/InstitutionModule").then((m) => ({ default: m.InstitutionModule })));
const InstitutionModuleView = lazy(() => import("@/Components/Institution/InstitutionModule").then((m) => ({ default: m.InstitutionModuleView })));
const InstitutionLegal = lazy(() => import("@/Components/Institution/InstitutionLegal").then((m) => ({ default: m.InstitutionLegal })));
const InstitutionBranding = lazy(() => import("@/Components/Institution/InstitutionBranding").then((m) => ({ default: m.InstitutionBranding })));
const InstitutionChannel = lazy(() => import("@/Components/Institution/InstitutionChannel").then((m) => ({ default: m.InstitutionChannel })));
const InstitutionCurrency = lazy(() => import("@/Components/Institution/InstitutionCurrency").then((m) => ({ default: m.InstitutionCurrency })));
export const institutionRoutes = [
  { path: "/institutions", element: pageElement(InstitutionListPage) },
  { path: "/institutions/pending", element: <Navigate to="/institutions" replace /> },
  { path: "/institutions/create", element: pageElement(InstitutionCreatePage) },
  { path: "/institutions/:id", element: pageElement(InstitutionDetailPage) },
  // Wired to the backend menu "Institution Profile" (menu_id 148, module_id
  // 14). The sidebar's leaf-click navigation (MenuItem.jsx, ported verbatim
  // from payseFrontend) slugifies the menu_name and navigates to
  // `/{slug}/{uuid}` regardless of whether a route exists for it — same
  // mechanism payse uses. slugifyMenuName("Institution Profile") ==
  // "institutionprofile", so this route must match that exact slug (with a
  // trailing :id, since the fabricated navigation always appends one) for
  // the click to land here instead of the app's error/not-found screen.
  { path: "/institutionprofile/:id", element: pageElement(InstitutionListPage) },
  { path: "/institutionmodule", element: pageElement(InstitutionModule) },
  { path: "/institutionmodule/view/:id", element: pageElement(InstitutionModuleView) },
  { path: "/institutionmodule/:id", element: pageElement(InstitutionModule) },
  { path: "/institutionlegal", element: pageElement(InstitutionLegal) },
  { path: "/institutionlegal/:id", element: pageElement(InstitutionLegal) },
  { path: "/institutionbranding", element: pageElement(InstitutionBranding) },
  { path: "/institutionbranding/:id", element: pageElement(InstitutionBranding) },
  { path: "/institution/branding", element: pageElement(InstitutionBranding) },
  { path: "/institution/branding/:id", element: pageElement(InstitutionBranding) },
  { path: "/institutionchannel", element: pageElement(InstitutionChannel) },
  { path: "/institutionchannel/:id", element: pageElement(InstitutionChannel) },
  { path: "/institutioncurrency", element: pageElement(InstitutionCurrency) },
  { path: "/institutioncurrency/:id", element: pageElement(InstitutionCurrency) },
];
