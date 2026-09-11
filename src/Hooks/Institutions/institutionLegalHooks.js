import { useCallback, useState } from "react";
import { institutionLegalApi } from "@/Services/Institutions/institutionLegal.api";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { useEntityListQuery } from "@/Hooks/Institutions/useEntityListQuery";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
export function useInstitutionLegalsQuery() {
  const query = useEntityListQuery(institutionLegalApi.list);
  useLiveChannel(API_ENDPOINTS.INSTITUTION.INSTITUTION_LEGAL.LIST, () => void query.refetch());
  return query;
}
export function useInstitutionLegalMutation(method) { const [state, setState] = useState({ isPending: false, error: null }); const mutateAsync = useCallback(async (payload) => { setState({ isPending: true, error: null }); try { const result = await institutionLegalApi[method](payload); setState({ isPending: false, error: null }); notifications.success(apiMessage(result, "Institution legal action completed")); return result; } catch (error) { setState({ isPending: false, error }); notifications.error(error instanceof Error ? error.message : "Institution legal action failed"); throw error; } }, [method]); return { ...state, mutateAsync }; }
