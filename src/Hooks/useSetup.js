import { useCallback, useEffect, useMemo } from "react";
import store from "@/Redux/Store";
import { useLatest } from "@/Hooks/useLatest";
import { useDispatch, useSelector } from "react-redux";
import { i18n } from "@/Utils/I18n/i18n";
import { setSetupState } from "@/Redux/MenuSlice";
import { setupApi } from "@/Services/Setup/setup.api";
import { notifications } from "@/Utils/Lib/notifications";
import { canChooseInstitution } from "@/Utils/Lib/institutionScope";
import { useInstitutionFilter } from "@/Utils/Lib/institutionFilter";
import { menuLabel } from "@/Components/Layout/Menu/menuLabels";

// The institution's setup state (Admin_33, /config/setup/state), kept in
// the menu store. The server decides every state and dependency; this only
// reads it. A menu missing from `menus` has no dependency: open, as before.
const firstRow = (r) => (Array.isArray(r?.data) ? r.data[0] : r?.data) ?? null;

export function useSetup() {
  const setup = useSelector((state) => state.menu.setup);
  return useMemo(() => {
    const menus = new Map((setup?.menus ?? []).map((m) => [Number(m.menu_id), m]));
    const menuOf = (menuId) => menus.get(Number(menuId)) ?? null;
    const partOf = (menuId, key) => menuOf(menuId)?.parts?.find((p) => p.key === key) ?? null;
    return {
      loaded: Boolean(setup),
      flows: setup?.flows ?? [],
      menuOf,
      partOf,
      stateOf: (menuId, part) => (part ? partOf(menuId, part)?.state : menuOf(menuId)?.state) ?? null,
      // The flow step that is next in a module, if this menu is it.
      isNext: (menuId, moduleId) => (setup?.flows ?? []).some((f) => Number(f.module_id) === Number(moduleId) && f.next && Number(f.next.menu_id) === Number(menuId)),
    };
  }, [setup]);
}

// The need's text: a translation by its code, else the server's English.
export const needText = (need) => i18n.t(`setup:need_${need.code}`, { defaultValue: need.text ?? need.code });

// Mounted once in the app layout: loads after sign-in, reloads after any
// successful write ("setup:changed", from authFetch) and when a service
// provider switches institution. A menu that goes LOCKED -> TODO gets a
// toast with Open. `goTo` opens a target (see goTo.js).
export function SetupStateLoader({ goTo }) {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.token?.token);
  const menus = useSelector((state) => state.menu.menuArray);
  const picked = useInstitutionFilter();
  const chooser = canChooseInstitution();

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const next = firstRow(await setupApi.state(chooser && picked ? { inst_profile_id: Number(picked) } : {}));
      if (!next) return;
      const before = { current: store.getState().menu.setup };
      const old = new Map((before.current?.menus ?? []).map((m) => [Number(m.menu_id), m.state]));
      if (before.current && Number(before.current.inst_profile_id) === Number(next.inst_profile_id)) {
        for (const m of next.menus ?? []) {
          if (old.get(Number(m.menu_id)) === "LOCKED" && m.state !== "LOCKED") {
            const menu = (menus ?? []).find((x) => Number(x.menu_id) === Number(m.menu_id));
            const label = menu ? menuLabel(menu) : `#${m.menu_id}`;
            notifications.success(i18n.t("setup:nowAvailable", { label }), { action: { label: i18n.t("setup:open"), onClick: () => goTo({ menu_id: m.menu_id }) }, duration: 8000 });
            break;
          }
        }
      }
      dispatch(setSetupState(next));
    } catch {
      // No setup state (older server, refused): every menu stays open.
    }
  }, [token, chooser, picked, dispatch, menus, goTo]);

  const latest = useLatest({ load });
  useEffect(() => {
    void latest.current.load();
  }, [token, picked, latest]);
  useEffect(() => {
    let timer = null;
    const again = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void latest.current.load(), 400);
    };
    window.addEventListener("setup:changed", again);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("setup:changed", again);
    };
  }, [latest]);
  return null;
}
