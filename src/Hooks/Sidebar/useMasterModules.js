import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { masterApi } from "@/Services/Master/master.api";
import { setMasterModules } from "@/Redux/MenuSlice";

// Mirrors payse's useFetchModuleData: fetch the Master module reference list
// once per authenticated session and persist it into Redux, independent of
// the user's own permission dataset (menu_array).
export function useMasterModules() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const token = useSelector((store) => store.token?.token);
  const masterModules = useSelector((store) => store.menu.masterModules);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const fetchModules = async () => {
      setLoading(true);
      setError(null);
      try {
        const modules = await masterApi.moduleList();
        if (!cancelled) dispatch(setMasterModules(modules));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load modules");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchModules();
    return () => {
      cancelled = true;
    };
  }, [token, dispatch]);

  return { masterModules, loading, error };
}
