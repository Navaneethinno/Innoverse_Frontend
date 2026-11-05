import { useSelector } from "react-redux";
import { Outlet, useLocation } from "react-router-dom";
import { RouteError } from "@/Components/Common/RouteError";
import { slugDenied } from "@/Components/Layout/Menu/menuRouteMap";

// A direct link to a menu's page the user's profile does not have: not found,
// the same as a menu they cannot see. The server refuses the data anyway.
export function MenuGuard() {
  const menus = useSelector((state) => state.menu.menuArray);
  const { pathname } = useLocation();
  return slugDenied(menus, pathname) ? <RouteError /> : <Outlet />;
}
