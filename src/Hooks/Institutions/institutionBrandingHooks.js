import { useCallback, useState } from "react";
import { institutionBrandingApi } from "@/Services/Institutions/institutionBranding.api";
import { useEntityListQuery } from "@/Hooks/Institutions/useEntityListQuery";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
export function useInstitutionBrandingsQuery() {
  // Live-reconciled in place (Live Updates guide §3) — see
  // useEntityListQuery.js's `livePath` option.
  return useEntityListQuery(institutionBrandingApi.list, {
    livePath: API_ENDPOINTS.INSTITUTION.INSTITUTION_BRANDING.LIST,
  });
}
export function useInstitutionBrandingMutation(method) { const [state, setState] = useState({ isPending: false, error: null }); const mutateAsync = useCallback(async (payload) => { setState({ isPending: true, error: null }); try { const result = await institutionBrandingApi[method](payload); setState({ isPending: false, error: null }); notifications.success(apiMessage(result, "Institution branding action completed")); return result; } catch (error) { setState({ isPending: false, error }); notifications.error(error instanceof Error ? error.message : "Institution branding action failed"); throw error; } }, [method]); return { ...state, mutateAsync }; }
