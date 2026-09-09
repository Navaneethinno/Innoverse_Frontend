import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { masterApi } from "@/Services/Master/master.api";
import { setMasterModules } from "@/Redux/MenuSlice";
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

  return { masterModules, loading, error };
}
