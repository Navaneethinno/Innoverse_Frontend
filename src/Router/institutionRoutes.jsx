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
];
