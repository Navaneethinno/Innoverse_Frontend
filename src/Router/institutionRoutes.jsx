import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { pageElement } from "./routeSupport";
const InstitutionListPage = lazy(() =>
  import("@/Pages/Institutions/InstitutionListPage").then((m) => ({
    default: m.InstitutionListPage,
  })),
);
const InstitutionCreatePage = lazy(() =>
  import("@/Pages/Institutions/CreateInstitutionFlow").then((m) => ({
    default: m.CreateInstitutionFlow,
  })),
);
const InstitutionDetailPage = lazy(() =>
  import("@/Pages/Institutions/InstitutionDetailPage").then((m) => ({
    default: m.InstitutionDetailPage,
  })),
);
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
];
