import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { masterApi } from "@/Services/Master/master.api";
import { setMasterModules, setMenuArray } from "@/Redux/MenuSlice";
import store from "@/Redux/Store";
import { onApiLanguageChange } from "@/Utils/Lib/apiLanguage";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { API_ENDPOINTS } from "@/Utils/Constant";

// Mirrors payse's useFetchModuleData: fetch the Master module reference list
// once per authenticated session and persist it into Redux, independent of
// the user's own permission dataset (menu_array).
export function useMasterModules() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const token = useSelector((store) => store.token?.token);
  const masterModules = useSelector((store) => store.menu.masterModules);

  const fetchModules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const modules = await masterApi.moduleList();
      dispatch(setMasterModules(modules));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load modules");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (!token) return;
    void fetchModules();
  }, [token, fetchModules]);

  // Live push (anyone adding/editing/deauthorizing a module reference-data
  // record) re-fetches the same way a local mutation would — this list has
  // no local add/edit UI of its own to notify from, so there is no
  // notify*Change()-style window event to piggyback on the way institutions/
  // users/profiles do; the live channel itself is the only signal.
  useLiveChannel(API_ENDPOINTS.MASTER.MODULE_LIST, fetchModules, { enabled: Boolean(token) });

  // Menu and module labels come in the language of the request: a new
  // language fetches them again (the menus keep their names and grants).
  useEffect(() => {
    if (!token) return undefined;
    return onApiLanguageChange(async () => {
      void fetchModules();
      try {
        const labels = new Map((await masterApi.menuList()).map((m) => [Number(m.id ?? m.menu_id), m]));
        const menus = store.getState().menu.menuArray ?? [];
        dispatch(
          setMenuArray(
            menus.map((m) => {
              const l = labels.get(Number(m.menu_id));
              return l ? { ...m, menu_label: l.menu_label, module_label: l.module_label, parent_menu_label: l.parent_menu_label } : m;
            }),
          ),
        );
      } catch {
        // The labels stay in the previous language until the next sign-in.
      }
    });
  }, [token, fetchModules, dispatch]);

  return { masterModules, loading, error };
}
