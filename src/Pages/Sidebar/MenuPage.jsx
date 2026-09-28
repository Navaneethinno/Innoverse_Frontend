import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { matchRoutes, useLocation } from "react-router-dom";
import { RouteError } from "@/Components/Common/RouteError";
import { setApiScope } from "@/Utils/Lib/apiScope";
import { findMenuByPath, menuBranch, menuSlugForItem } from "./menuRouteMap";
import { MenuContext } from "./menuContext";

// Corporate Onboarding Configuration / Wizard share the hub page with the
// individual one; the hub shows the half the menu's branch names.
const HUB_FOR = {
  corporateonboardingconfiguration: "onboardingconfiguration",
  corporateonboardingwizard: "onboardingwizard",
};

// A sidebar menu's page at /<module>/<menu path> (Menus handoff 12). The
// menu comes from menu_array by module + full path; its page is the one
// registered under the menu's slug (menuSlugForItem), and its module picks
// the API prefix (EPURSE -> /customer, MMS -> /merchant).
export function MenuPage({ routes }) {
  const menus = useSelector((state) => state.menu.menuArray);
  const location = useLocation();
  const active = useMemo(() => (menus ?? []).filter((m) => m?.status === 1), [menus]);
  const menu = useMemo(() => findMenuByPath(active, location.pathname), [active, location.pathname]);
  const branch = menu ? menuBranch(menu, active) : null;
  const slug = menu ? menuSlugForItem(menu, active) : null;
  const pageSlug = HUB_FOR[slug] ?? slug;
  // Some pages are registered only as "<slug>/:id" (the old per-click id).
  const element = useMemo(
    () => (pageSlug ? (matchRoutes(routes, `/${pageSlug}`) ?? matchRoutes(routes, `/${pageSlug}/menu`))?.at(-1)?.route.element : null),
    [routes, pageSlug],
  );

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

  const context = useMemo(() => (menu ? { menu, module: menu.module_name, branch, menus: active } : null), [menu, branch, active]);

  if (!menus?.length) return null;
  if (!menu || !element) return <RouteError />;
  return (
    <MenuContext.Provider value={context}>
      <div key={`${menu.menu_id}:${mount}`} className="contents">
        {element}
      </div>
    </MenuContext.Provider>
  );
}
