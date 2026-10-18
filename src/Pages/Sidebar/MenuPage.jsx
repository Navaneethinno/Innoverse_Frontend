import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { matchRoutes, useLocation, useSearchParams } from "react-router-dom";
import { ComingSoon } from "@/Components/Common/ComingSoon";
import { RouteError } from "@/Components/Common/RouteError";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { setApiScope } from "@/Utils/Lib/apiScope";
import { ModuleDashboard } from "@/Pages/Dashboard/Module/ModuleDashboard";
import { findMenuByPath, findModuleByDashboardPath, menuPage } from "./menuRouteMap";
import { MenuContext } from "./menuContext";

// The page registered under a slug (some only as "<slug>/:id", the old
// per-click id).
const pageFor = (routes, slug) => (slug ? (matchRoutes(routes, `/${slug}`) ?? matchRoutes(routes, `/${slug}/menu`))?.at(-1)?.route.element : null);

// One menu over several pages (Form Builder: Fields | Sections, Address
// Type: Individual | Corporate, ...): a switch, kept in ?view= so a refresh
// or a shared link reopens the same page. The first view is the default.
function MenuViews({ views, routes }) {
  const { t } = useTranslation("common");
  const [searchParams, setSearchParams] = useSearchParams();
  const view = views.find((v) => v.key === searchParams.get("view")) ?? views[0];
  const element = pageFor(routes, view.slug);
  return (
    <div>
      <SegmentedSwitch
        className="mb-3"
        options={views.map((v) => ({ value: v.key, label: t(`view_${v.key}`) }))}
        value={view.key}
        onChange={(next) => setSearchParams(next === views[0].key ? {} : { view: next }, { replace: true })}
      />
      <div key={view.key} className="segmented-view-enter">
        {element ?? <RouteError />}
      </div>
    </div>
  );
}

// A sidebar menu's page at /<module>/<menu path>. The menu comes from
// menu_array by module + full path; its page is the one menuPage names,
// and its module picks the API prefix (EPURSE -> /customer, MMS -> /merchant).
export function MenuPage({ routes }) {
  const menus = useSelector((state) => state.menu.menuArray);
  const location = useLocation();
  const active = useMemo(() => (menus ?? []).filter((m) => m?.status === 1), [menus]);
  const menu = useMemo(() => findMenuByPath(active, location.pathname), [active, location.pathname]);
  const page = useMemo(() => (menu ? menuPage(menu) : null), [menu]);
  const element = useMemo(() => (page?.views ? null : pageFor(routes, page?.slug)), [routes, page]);

  // Set before the page's own effects fire their requests; back to the
  // default once the page goes away.
  setApiScope(menu?.module_name);
  useEffect(() => () => setApiScope(null), []);

  // Clicking the same menu again pushes a fresh nonce: remount the page.
  // (In-page navigation drops the state, which must not remount.)
  const click = location.state?.menuClick;
  const [seen, setSeen] = useState(click);
  const [mount, setMount] = useState(0);
  if (click && click !== seen) {
    setSeen(click);
    setMount(mount + 1);
  }

  const branch = page?.branch ?? null;
  const context = useMemo(() => (menu ? { menu, module: menu.module_name, branch, menus: active } : null), [menu, branch, active]);

  if (!menus?.length) return null;
  if (!menu) {
    const dashboardOf = findModuleByDashboardPath(active, location.pathname);
    if (dashboardOf) return <ModuleDashboard key={dashboardOf} moduleName={dashboardOf} />;
  }
  if (!menu || (!element && !page.views && !page.soon)) return <RouteError />;
  return (
    <MenuContext.Provider value={context}>
      <div key={`${menu.menu_id}:${mount}`} className="contents">
        {page.soon ? <ComingSoon /> : page.views ? <MenuViews views={page.views} routes={routes} /> : element}
      </div>
    </MenuContext.Provider>
  );
}
