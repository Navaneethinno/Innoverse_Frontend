import { lazy, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { matchRoutes, useLocation, useSearchParams } from "react-router-dom";
import { ComingSoon } from "@/Components/Common/ComingSoon";
import { RouteError } from "@/Components/Common/RouteError";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { setApiScope } from "@/Utils/Lib/apiScope";
import { pageElement } from "@/Router/routeSupport";
import { findMenuByPath, findModuleByDashboardPath, menuPage } from "@/Components/Layout/Menu/menuRouteMap";
import { MenuContext } from "@/Components/Layout/Menu/menuContext";
import { menuLabel } from "@/Components/Layout/Menu/menuLabels";
import { Lock } from "lucide-react";
import { useSetup } from "@/Hooks/useSetup";
import { SetupLocked, SetupNext, SetupRecommended } from "@/Components/Common/SetupLocked";

// Charts are heavy: downloaded only when a module dashboard opens.
const ModuleDashboard = lazy(() => import("@/Pages/Dashboard/Module/ModuleDashboard").then((m) => ({ default: m.ModuleDashboard })));

// The page registered under a slug (some only as "<slug>/:id", the old
// per-click id).
const pageFor = (routes, slug) => (slug ? (matchRoutes(routes, `/${slug}`) ?? matchRoutes(routes, `/${slug}/menu`))?.at(-1)?.route.element : null);

// One menu over several pages (Form Builder: Fields | Sections, Address
// Type: Individual | Corporate, ...): a switch, kept in ?part= (the setup
// state's part keys; the older ?view= still opens) so a link, a refresh or
// Back reopens the same tab. A tab the setup state locks shows a lock and,
// when open, the shared explainer instead of its page.
function MenuViews({ views, routes, menu }) {
  const { t } = useTranslation("common");
  const setup = useSetup();
  const [searchParams, setSearchParams] = useSearchParams();
  const asked = searchParams.get("part") ?? searchParams.get("view");
  const view = views.find((v) => v.key === asked) ?? views[0];
  const element = pageFor(routes, view.slug);
  const part = setup.partOf(menu.menu_id, view.key);
  const choose = (next) => {
    const q = new URLSearchParams(searchParams);
    q.delete("view");
    q.delete("record");
    q.delete("action");
    q.set("part", next);
    setSearchParams(q);
  };
  return (
    <div>
      <SegmentedSwitch
        className="mb-3"
        options={views.map((v) => ({
          value: v.key,
          label:
            setup.stateOf(menu.menu_id, v.key) === "LOCKED" ? (
              <span className="inline-flex items-center gap-1">
                {t(`view_${v.key}`)} <Lock size={11} />
              </span>
            ) : (
              t(`view_${v.key}`)
            ),
        }))}
        value={view.key}
        onChange={choose}
      />
      <div key={view.key} className="segmented-view-enter">
        {part?.state === "LOCKED" ? (
          <SetupLocked label={`${menuLabel(menu)} › ${t(`view_${view.key}`)}`} needs={part.needs} />
        ) : (
          <>
            {part?.state === "TODO" && <SetupRecommended needs={part.needs} />}
            {element ?? <RouteError />}
          </>
        )}
      </div>
    </div>
  );
}

// After the first successful save on this menu: its "Next" links.
function useSavedHere() {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const mark = () => setSaved(true);
    window.addEventListener("setup:changed", mark);
    return () => window.removeEventListener("setup:changed", mark);
  }, []);
  return saved;
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

  const setup = useSetup();
  const saved = useSavedHere();
  const branch = page?.branch ?? null;
  const context = useMemo(() => (menu ? { menu, module: menu.module_name, branch, menus: active } : null), [menu, branch, active]);

  if (!menus?.length) return null;
  if (!menu) {
    const dashboardOf = findModuleByDashboardPath(active, location.pathname);
    if (dashboardOf) return <div key={dashboardOf}>{pageElement(ModuleDashboard, { moduleName: dashboardOf })}</div>;
  }
  if (!menu || (!element && !page.views && !page.soon)) return <RouteError />;
  return (
    <MenuContext.Provider value={context}>
      <div key={`${menu.menu_id}:${mount}`} className="contents">
        {(() => {
          // The setup state (Admin_33 B5): a locked menu shows why, not its list.
          const sm = setup.menuOf(menu.menu_id);
          if (sm?.state === "LOCKED") return <SetupLocked label={menuLabel(menu)} needs={sm.needs} />;
          return (
            <>
              {sm?.state === "TODO" && <SetupRecommended needs={sm.needs} />}
              {saved && sm?.leads_to?.length > 0 && <SetupNext leadsTo={sm.leads_to} stateOf={(id) => setup.stateOf(id)} />}
              {page.soon ? <ComingSoon /> : page.views ? <MenuViews views={page.views} routes={routes} menu={menu} /> : element}
            </>
          );
        })()}
      </div>
    </MenuContext.Provider>
  );
}
