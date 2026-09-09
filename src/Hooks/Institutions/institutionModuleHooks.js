import { useCallback, useEffect, useState } from "react";
import { institutionModuleApi } from "@/Services/Institutions/institutionModule.api";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";

function mapList(payload) {
  const records = Array.isArray(payload?.data) ? payload.data : [];
  return { records, pagination: payload?.pagination ?? {} };
}

export function useInstitutionModulesQuery(params = {}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const [state, setState] = useState({ data: [], pagination: {}, isLoading: true, error: null });
  const refetch = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const result = mapList(await institutionModuleApi.list({ page, limit }));
      setState({ data: result.records, pagination: result.pagination, isLoading: false, error: null });
    } catch (error) {
      setState((current) => ({ ...current, isLoading: false, error }));
    }
  }, [page, limit]);
  useEffect(() => { void refetch(); }, [refetch]);
  useLiveChannel(API_ENDPOINTS.INSTITUTION.INSTITUTION_MODULE.LIST, () => void refetch());
  return { ...state, refetch };
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
