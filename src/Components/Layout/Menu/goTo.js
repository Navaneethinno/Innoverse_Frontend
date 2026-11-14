import { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { i18n } from "@/Utils/I18n/i18n";
import { notifications } from "@/Utils/Lib/notifications";
import { useMenuContext } from "./menuContext";
import { menuLabel } from "./menuLabels";
import { menuPathForItem } from "./menuRouteMap";

// One way to open another screen (Admin_33 B7). A target is
// { menu_id, part?, record_id?, action?, module_name? }: the menu is found in
// the user's menu tree, its route built as the sidebar builds it (the
// sidebar follows the route: module, open parents, highlight), and the rest
// goes in the query (?part=&record=&action=). Never a hand-built path.
// A menu missing from the tree is not opened: "You do not have access".
export const targetQuery = ({ part, record_id: record, action } = {}) => {
  const q = new URLSearchParams();
  if (part) q.set("part", part);
  if (record != null && record !== "") q.set("record", String(record));
  if (action) q.set("action", action);
  const s = q.toString();
  return s ? `?${s}` : "";
};

// The menu of a target in the active tree; the current module's first when
// the same id is in several modules (or the target names its module).
export function findTargetMenu(menus, target, currentModule) {
  const active = (menus ?? []).filter((m) => m?.status === 1);
  const same = active.filter((m) => Number(m.menu_id) === Number(target?.menu_id));
  const module = target?.module_name ?? currentModule;
  return { menu: same.find((m) => m.module_name === module) ?? same[0] ?? null, active };
}

export function targetPath(menus, target, currentModule) {
  const { menu, active } = findTargetMenu(menus, target, currentModule);
  return menu ? `${menuPathForItem(menu, active)}${targetQuery(target)}` : null;
}

export function useGoTo() {
  const menus = useSelector((state) => state.menu.menuArray);
  const navigate = useNavigate();
  const currentModule = useMenuContext()?.module;
  return useCallback(
    (target, { label } = {}) => {
      const path = targetPath(menus, target, currentModule);
      if (!path) {
        notifications.error(i18n.t("setup:noAccess", { label: label ?? target?.title ?? `#${target?.menu_id}` }));
        return false;
      }
      navigate(path, { state: { menuClick: Date.now() } });
      return true;
    },
    [menus, navigate, currentModule],
  );
}

// The label of a menu id from the tree (null when the user does not have it).
export function useMenuLabelOf() {
  const menus = useSelector((state) => state.menu.menuArray);
  return useCallback(
    (menuId) => {
      const m = (menus ?? []).find((x) => x?.status === 1 && Number(x.menu_id) === Number(menuId));
      return m ? menuLabel(m) : null;
    },
    [menus],
  );
}

// What a page was opened with (goTo's query): ?record= opens that record,
// ?action=add the add form, ?action=edit&record= the edit form. Read once,
// when the page mounts; `clear()` drops them from the URL afterwards.
export function useTargetQuery() {
  const [params, setParams] = useSearchParams();
  const [target] = useState(() => ({ record: params.get("record"), action: params.get("action") }));
  const clear = useCallback(
    () =>
      setParams(
        (p) => {
          const q = new URLSearchParams(p);
          q.delete("record");
          q.delete("action");
          return q;
        },
        { replace: true },
      ),
    [setParams],
  );
  return { ...target, clear };
}
