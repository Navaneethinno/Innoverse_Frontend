import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { findMenuByPath } from "@/Pages/Sidebar/menuRouteMap";
import { getRouteMetadata } from "@/Utils/Config/routeConfig";
import { i18n } from "@/Utils/I18n/i18n";
import { request } from "@/Services/Epurse/onboarding.api";

// Tells the backend which screen opened, once per route change, for the
// System Console's usage reports (/config/user/activity/view). Fire and
// forget: never waits, never shows an error.
export function useScreenViews() {
  const { pathname } = useLocation();
  const menus = useSelector((state) => state.menu.menuArray);
  const ready = (menus ?? []).length > 0;
  useEffect(() => {
    if (!ready) return;
    const menu = findMenuByPath(
      menus.filter((m) => m?.status === 1),
      pathname,
    );
    const crumbs = getRouteMetadata(pathname)?.breadcrumb ?? ["crumbDashboard"];
    const body = menu ? { screen: menu.menu_name, menu_id: Number(menu.menu_id) } : { screen: i18n.getFixedT("en", "routes")(crumbs[crumbs.length - 1]) };
    request("/config/user/activity/view", body).catch(() => {});
    // Only a new page counts, not a menu reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, ready]);
}
