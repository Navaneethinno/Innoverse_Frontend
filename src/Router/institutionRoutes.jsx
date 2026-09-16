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
const InstitutionModulePage = lazy(() => import("@/Components/Institution/InstitutionModule").then((m) => ({ default: m.InstitutionModulePage })));
const InstitutionModuleViewPage = lazy(() => import("@/Components/Institution/InstitutionModule").then((m) => ({ default: m.InstitutionModuleViewPage })));
const InstitutionLegalPage = lazy(() => import("@/Components/Institution/InstitutionLegal").then((m) => ({ default: m.InstitutionLegalPage })));
const InstitutionBrandingPage = lazy(() => import("@/Components/Institution/InstitutionBranding").then((m) => ({ default: m.InstitutionBrandingPage })));
const InstitutionChannelPage = lazy(() => import("@/Components/Institution/InstitutionChannel").then((m) => ({ default: m.InstitutionChannelPage })));
const InstitutionCurrencyPage = lazy(() => import("@/Components/Institution/InstitutionCurrency").then((m) => ({ default: m.InstitutionCurrencyPage })));
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
  { path: "/institutionmodule", element: pageElement(InstitutionModulePage) },
  { path: "/institutionmodule/view/:id", element: pageElement(InstitutionModuleViewPage) },
  { path: "/institutionmodule/:id", element: pageElement(InstitutionModulePage) },
  { path: "/institutionlegal", element: pageElement(InstitutionLegalPage) },
  { path: "/institutionlegal/:id", element: pageElement(InstitutionLegalPage) },
  { path: "/institutionbranding", element: pageElement(InstitutionBrandingPage) },
  { path: "/institutionbranding/:id", element: pageElement(InstitutionBrandingPage) },
  { path: "/institution/branding", element: pageElement(InstitutionBrandingPage) },
  { path: "/institution/branding/:id", element: pageElement(InstitutionBrandingPage) },
  { path: "/institutionchannel", element: pageElement(InstitutionChannelPage) },
  { path: "/institutionchannel/:id", element: pageElement(InstitutionChannelPage) },
  { path: "/institutioncurrency", element: pageElement(InstitutionCurrencyPage) },
  { path: "/institutioncurrency/:id", element: pageElement(InstitutionCurrencyPage) },
];
