import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/Components/Layout/AppLayout";
import { RouteError } from "@/Components/Common/RouteError";
import { ProtectRoute } from "./ProtectRoute";
import { MenuPage } from "@/Pages/Sidebar/MenuPage";
import { dashboardRoutes, epurseRoutes, globalSettingsRoutes, innoAmlRoutes, institutionRoutes, publicRoutes, reportsRoutes, userManagementRoutes } from "./index";
// Every page registered by its menu slug. Sidebar menus open at
// /<module>/<menu path> (MenuPage picks the page from this list); the
// one-segment slugs stay registered for old links and in-page navigation.
const pageRoutes = [...dashboardRoutes, ...institutionRoutes, ...userManagementRoutes, ...epurseRoutes, ...innoAmlRoutes, ...reportsRoutes, ...globalSettingsRoutes];

export const appRouter = createBrowserRouter([
  ...publicRoutes.map((route) => ({ errorElement: <RouteError />, ...route })),
  {
    element: (
      <ProtectRoute>
        <AppLayout />
      </ProtectRoute>
    ),
    errorElement: <RouteError />,
    children: [...pageRoutes, { path: "/:module/*", element: <MenuPage routes={pageRoutes} /> }],
  },
]);
export default appRouter;
