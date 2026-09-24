import { useCallback, useState } from "react";
import { institutionModuleApi } from "@/Services/Institution/institutionModule.api";
import { useEntityListQuery } from "@/Hooks/Institution/useEntityListQuery";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";

export function useInstitutionModulesQuery() {
  // Live-reconciled in place (Live Updates guide §3) — see
  // useEntityListQuery.js's `livePath` option.
  return useEntityListQuery(institutionModuleApi.list, {
    livePath: API_ENDPOINTS.INSTITUTION.INSTITUTION_MODULE.LIST,
  });
}

export function useInstitutionModuleMutation(method) {
  const [state, setState] = useState({ isPending: false, error: null });
  const mutateAsync = useCallback(async (payload) => {
    setState({ isPending: true, error: null });
    try {
      const result = await institutionModuleApi[method](payload);
      setState({ isPending: false, error: null });
      notifications.success(apiMessage(result, "Institution module action completed"));
      return result;
    } catch (error) {
      setState({ isPending: false, error });
      notifications.error(error instanceof Error ? error.message : "Institution module action failed");
      throw error;
    }
  }, [method]);
  return { ...state, mutateAsync };
}
