import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/Components/Layout/AppLayout";
import { RouteError } from "@/Components/Common/RouteError";
import { ProtectRoute } from "./ProtectRoute";
import { configKycRoutes, dashboardRoutes, digitalProductRoutes, institutionRoutes, masterConfigRoutes, profileRoutes, publicRoutes, userRoutes } from "./index";
export const appRouter = createBrowserRouter([
  ...publicRoutes.map((route) => ({ errorElement: <RouteError />, ...route })),
  {
    element: (
      <ProtectRoute>
        <AppLayout />
      </ProtectRoute>
    ),
    errorElement: <RouteError />,
    children: [...dashboardRoutes, ...institutionRoutes, ...userRoutes, ...profileRoutes, ...masterConfigRoutes, ...digitalProductRoutes, ...configKycRoutes],
  },
]);
export default appRouter;
