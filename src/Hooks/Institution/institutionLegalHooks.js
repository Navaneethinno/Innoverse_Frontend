import { useCallback, useState } from "react";
import { institutionLegalApi } from "@/Services/Institution/institutionLegal.api";
import { useEntityListQuery } from "@/Hooks/Institution/useEntityListQuery";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
export function useInstitutionLegalsQuery(params = {}) {
  // Live-reconciled in place (Live Updates guide §3) — see
  // useEntityListQuery.js's `livePath` option.
  return useEntityListQuery(institutionLegalApi.list, {
    filter: params.filter,
    sortBy: params.sort_by,
    livePath: API_ENDPOINTS.INSTITUTION.INSTITUTION_LEGAL.LIST,
  });
}
export function useInstitutionLegalMutation(method) { const [state, setState] = useState({ isPending: false, error: null }); const mutateAsync = useCallback(async (payload) => { setState({ isPending: true, error: null }); try { const result = await institutionLegalApi[method](payload); setState({ isPending: false, error: null }); notifications.success(apiMessage(result, "Institution legal action completed")); return result; } catch (error) { setState({ isPending: false, error }); notifications.error(error instanceof Error ? error.message : "Institution legal action failed"); throw error; } }, [method]); return { ...state, mutateAsync }; }
