import { useCallback, useState } from "react";
import { institutionModuleApi } from "@/Services/Institutions/institutionModule.api";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { useEntityListQuery } from "@/Hooks/Institutions/useEntityListQuery";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";

export function useInstitutionModulesQuery() {
  const query = useEntityListQuery(institutionModuleApi.list);
  useLiveChannel(API_ENDPOINTS.INSTITUTION.INSTITUTION_MODULE.LIST, () => void query.refetch());
  return query;
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
