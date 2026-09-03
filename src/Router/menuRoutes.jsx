import { lazy } from "react";
import { pageElement } from "./routeSupport";
const MenusPage = lazy(() =>
  import("@/Pages/Menus/MenusPage").then((m) => ({ default: m.MenusPage })),
);
export const menuRoutes = [{ path: "/menus", element: pageElement(MenusPage) }];
