import { createContext, useContext } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { menuPathForItem, menuSlugForItem } from "./menuRouteMap";

// The sidebar menu the current page was opened from (MenuPage): { menu,
// module, branch, menus }. Null on routes that aren't a menu path (dashboard,
// legacy one-segment links, detail pages outside the menu tree).
export const MenuContext = createContext(null);

export const useMenuContext = () => useContext(MenuContext);

// Open another menu's page by its slug (e.g. "kycschemes"), staying in the
// current module when it has that menu: an MMS screen's "Add company type"
// opens MMS's Company Type, not EPURSE's.
export function useOpenMenu() {
  const context = useMenuContext();
  const menus = useSelector((state) => state.menu.menuArray);
  const navigate = useNavigate();
  return (slug) => {
    const active = (menus ?? []).filter((m) => m?.status === 1);
    const inModule = active.filter((m) => !context?.module || m.module_name === context.module);
    const target = inModule.find((m) => menuSlugForItem(m, active) === slug || menuSlugForItem(m, active) === `corp${slug}`);
    navigate(target ? menuPathForItem(target, active) : `/${slug}`, { state: { menuClick: Date.now() } });
  };
}
