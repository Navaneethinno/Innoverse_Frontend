import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { reconcileRecords } from "@/Utils/Lib/liveReconcile";

// Tolerant response-envelope mapper — mirrors mapInstitutionListResponse in
// institutionHooks.js (data as a plain array, or nested under data.list /
// data.data), so a list endpoint that nests its rows slightly differently
// doesn't silently render as empty.
function mapPage(payload) {
  const data = payload?.data;
  const records = (Array.isArray(data) && data) || data?.list || data?.data || [];
  return {
    records: Array.isArray(records) ? records : [],
    pagination: payload?.pagination ?? data?.pagination ?? {},
  };
}

const idOf = (row) => row?.id;

// One server page of a maker-checker list: the request carries exactly what
// the screen shows — the chosen page, page size, status tab and order — and
// the server paginates (totalRecords/totalPages come back in `pagination`).
// `livePath` (optional): the entity's own /list REST path, to subscribe to
// its live-push channel (Live Updates guide). A pushed record already on
// this page is merged in place; anything else (a new record, or a tab other
// than All, where it may no longer belong) refetches the page quietly, since
// only the server knows which page it lands on.
export function useEntityListQuery(listFn, { page = 1, limit = 10, livePath, filter, sortBy } = {}) {
  const narrowed = Boolean(filter) && filter !== "all";
  const [state, setState] = useState({ data: [], pagination: {}, isLoading: true, error: null });
  const dataRef = useRef([]);
  dataRef.current = state.data;

  const refetch = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setState((current) => ({ ...current, isLoading: true, error: null }));
      try {
        const result = mapPage(
          await listFn({ page, limit, ...(filter ? { filter } : {}), ...(sortBy ? { sort_by: sortBy } : {}) }),
        );
        setState({ data: result.records, pagination: result.pagination, isLoading: false, error: null });
      } catch (error) {
        setState((current) => ({ ...current, isLoading: false, error }));
      }
    },
    [listFn, page, limit, filter, sortBy],
  );
  useEffect(() => {
    void refetch();
  }, [refetch]);

  // Shared by the live-push handler and by callers reconciling a mutation's
  // own response, so a local change and a push from another user behave the
  // same way.
  const applyRecords = useCallback(
    (records) => {
      const onPage = new Set(dataRef.current.map((row) => String(idOf(row))));
      if (narrowed || !records?.length || records.some((r) => !onPage.has(String(idOf(r))))) {
        void refetch({ silent: true });
        return;
      }
      setState((current) => ({ ...current, data: reconcileRecords(current.data, records) }));
    },
    [narrowed, refetch],
  );
  useLiveChannel(livePath, (_action, records) => applyRecords(records));
  return { ...state, refetch, applyRecords };
}
