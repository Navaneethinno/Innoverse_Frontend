import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { findMenuByPath } from "@/Pages/Sidebar/menuRouteMap";
import { SEGMENT_LABELS, getRouteMetadata } from "@/Utils/Config/routeConfig";
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
    const active = menus.filter((m) => m?.status === 1);
    // A record's page (/<module>/<menu>/123) belongs to its menu: try the
    // path, then each shorter one.
    const parts = pathname.split("/").filter(Boolean);
    let menu = null;
    for (let n = parts.length; n > 0 && !menu; n -= 1) menu = findMenuByPath(active, `/${parts.slice(0, n).join("/")}`);
    const crumbs = getRouteMetadata(pathname)?.breadcrumb ?? [];
    const named = crumbs.length && (parts.length === 0 || SEGMENT_LABELS[parts[0]]);
    const body = menu ? { screen: menu.menu_name, menu_id: Number(menu.menu_id) } : { screen: named ? i18n.getFixedT("en", "routes")(crumbs[crumbs.length - 1]) : `/${parts.join("/")}` };
    request("/config/user/activity/view", body).catch(() => {});
    // Only a new page counts, not a menu reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, ready]);
}
