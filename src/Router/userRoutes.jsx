import { lazy } from "react";
import { pageElement } from "./routeSupport";
const UsersPage = lazy(() =>
  import("@/Pages/Users/UsersPage").then((m) => ({ default: m.UsersPage })),
);
export const userRoutes = [{ path: "/users", element: pageElement(UsersPage) }];
