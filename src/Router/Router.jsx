import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/Components/Layout/AppLayout";
import { RouteError } from "@/Components/Common/RouteError";
import { ProtectRoute } from "./ProtectRoute";
import {
  applicationRoutes,
  dashboardRoutes,
  institutionRoutes,
  kycRoutes,
  menuRoutes,
  pendingRoutes,
  profileRoutes,
  publicRoutes,
  userRoutes,
} from "./index";
export const appRouter = createBrowserRouter([
  ...publicRoutes.map((route) => ({ errorElement: <RouteError />, ...route })),
  {
    element: (
      <ProtectRoute>
        <AppLayout />
      </ProtectRoute>
    ),
    errorElement: <RouteError />,
    children: [
      ...dashboardRoutes,
      ...pendingRoutes,
      ...institutionRoutes,
      ...userRoutes,
      ...profileRoutes,
      ...applicationRoutes,
      ...menuRoutes,
      ...kycRoutes,
    ],
  },
]);
export default appRouter;
