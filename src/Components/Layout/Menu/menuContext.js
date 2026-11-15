import { createContext, useContext } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { menuPage, menuPathForItem } from "./menuRouteMap";

// The sidebar menu the current page was opened from (MenuPage): { menu,
// module, branch, menus }. Null on routes that aren't a menu path (dashboard,
// legacy one-segment links, detail pages outside the menu tree).
export const MenuContext = createContext(null);

export const useMenuContext = () => useContext(MenuContext);

// Open another menu's page by its page slug (e.g. "kycschemes"), staying in the
// current module when it has that menu: an MMS screen's "Add company type"
// opens MMS's Company Type, not EPURSE's. `state` goes along to the page
// (e.g. { caseId } to open one case). The URL is built as goTo builds it
// (Admin_33 B7): a merged menu's tab as ?part=, a case as ?record=, and
// `{ action: "add" }` opens the page's add form.
export function useOpenMenu() {
  const context = useMenuContext();
  const menus = useSelector((state) => state.menu.menuArray);
  const navigate = useNavigate();
  return (slug, state = {}, { action } = {}) => {
    const active = (menus ?? []).filter((m) => m?.status === 1);
    const inModule = active.filter((m) => !context?.module || m.module_name === context.module);
    const target = inModule.find((m) => menuPage(m).slugs.includes(slug)) ?? inModule.find((m) => menuPage(m).slugs.includes(`corp${slug}`)) ?? active.find((m) => menuPage(m).slugs.includes(slug));
    // A merged menu opens on the tab that page is.
    const view = target && menuPage(target).views?.slice(1).find((v) => v.slug === slug || v.slug === `corp${slug}`);
    const q = new URLSearchParams();
    if (view) q.set("part", view.key);
    if (state.caseId != null) q.set("record", String(state.caseId));
    if (action) q.set("action", action);
    const query = q.toString() ? `?${q}` : "";
    navigate(target ? `${menuPathForItem(target, active)}${query}` : `/${slug}`, { state: { menuClick: Date.now(), ...state } });
  };
}
