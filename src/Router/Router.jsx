import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/Components/Layout/AppLayout";
import { RouteError } from "@/Components/Common/RouteError";
import { ProtectRoute } from "./ProtectRoute";
import { dashboardRoutes, institutionRoutes, profileRoutes, publicRoutes, userRoutes } from "./index";
export const appRouter = createBrowserRouter([
  ...publicRoutes.map((route) => ({ errorElement: <RouteError />, ...route })),
  {
    element: (
      <ProtectRoute>
        <AppLayout />
      </ProtectRoute>
    ),
    errorElement: <RouteError />,
    children: [...dashboardRoutes, ...institutionRoutes, ...userRoutes, ...profileRoutes],
  },
]);
export default appRouter;
