import { institutionModuleApi } from "@/Services/Institution/institutionModule.api";
import { useEntityListQuery } from "@/Hooks/Institution/useEntityListQuery";
import { API_ENDPOINTS } from "@/Utils/Constant";
export function useInstitutionModulesQuery(params = {}) {
  // Live-reconciled in place (Live Updates guide §3) — see
  // useEntityListQuery.js's `livePath` option.
  return useEntityListQuery(institutionModuleApi.list, {
    page: params.page,
    limit: params.limit,
    filter: params.filter,
    sortBy: params.sort_by,
    search: params.search,
    livePath: API_ENDPOINTS.INSTITUTION.INSTITUTION_MODULE.LIST,
  });
}
