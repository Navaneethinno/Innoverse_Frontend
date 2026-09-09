import { useCallback, useEffect, useState } from "react";
import { institutionLegalApi } from "@/Services/Institutions/institutionLegal.api";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
export function useInstitutionLegalsQuery({ page = 1, limit = 10 } = {}) {
  const [state, setState] = useState({ data: [], pagination: {}, isLoading: true, error: null });
  const refetch = useCallback(async () => { setState((s) => ({ ...s, isLoading: true, error: null })); try { const r = await institutionLegalApi.list({ page, limit }); setState({ data: Array.isArray(r?.data) ? r.data : [], pagination: r?.pagination ?? {}, isLoading: false, error: null }); } catch (error) { setState((s) => ({ ...s, isLoading: false, error })); } }, [page, limit]);
  useEffect(() => { void refetch(); }, [refetch]);
  useLiveChannel(API_ENDPOINTS.INSTITUTION.INSTITUTION_LEGAL.LIST, () => void refetch());
  return { ...state, refetch };
}
export function useInstitutionLegalMutation(method) { const [state, setState] = useState({ isPending: false, error: null }); const mutateAsync = useCallback(async (payload) => { setState({ isPending: true, error: null }); try { const result = await institutionLegalApi[method](payload); setState({ isPending: false, error: null }); notifications.success(apiMessage(result, "Institution legal action completed")); return result; } catch (error) { setState({ isPending: false, error }); notifications.error(error instanceof Error ? error.message : "Institution legal action failed"); throw error; } }, [method]); return { ...state, mutateAsync }; }
