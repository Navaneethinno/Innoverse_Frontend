import { useCallback, useEffect, useState } from "react";

// Tolerant response-envelope mapper — mirrors mapInstitutionListResponse in
// institutionHooks.js (data as a plain array, or nested under data.list /
// data.data), so a list endpoint that nests its rows slightly differently
// doesn't silently render as empty.
function mapPage(payload) {
  const data = payload?.data;
  const records = (Array.isArray(data) && data) || data?.list || data?.data || [];
  return {
    records: Array.isArray(records) ? records : [],
    pagination:
      payload?.pagination ??
      data?.pagination ?? {
        totalRecords: Array.isArray(records) ? records.length : 0,
        totalPages: 1,
        currentPage: 1,
        limit: records.length,
      },
  };
}

// None of these list endpoints accept a sort/order param, so there is no way
// to ask the backend for "newest first" on just page 1. Instead we fetch
// every page up to maxPages (10 pages @ limit 100 = 1000 rows) into memory
// and let DataTable's client-side sort (default: updated_time desc) put the
// latest add/edit on page 1 reliably, regardless of which backend page it
// physically landed on.
export function useEntityListQuery(listFn, { limit = 100, maxPages = 10 } = {}) {
  const [state, setState] = useState({ data: [], pagination: {}, isLoading: true, error: null });
  const refetch = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      let page = 1;
      let all = [];
      let pagination = {};
      while (page <= maxPages) {
        const result = mapPage(await listFn({ page, limit }));
        all = all.concat(result.records);
        pagination = result.pagination;
        const totalPages = pagination.totalPages ?? 1;
        if (page >= totalPages) break;
        page += 1;
      }
      setState({ data: all, pagination, isLoading: false, error: null });
    } catch (error) {
      setState((current) => ({ ...current, isLoading: false, error }));
    }
  }, [listFn, limit, maxPages]);
  useEffect(() => {
    void refetch();
  }, [refetch]);
  return { ...state, refetch };
}
