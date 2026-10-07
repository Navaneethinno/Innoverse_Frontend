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
// its live-push channel. A push refetches the page quietly: its rows may be
// only ids and status (a change made elsewhere), so they are never merged.
// `search` (optional): the server-side search text; only the newest call's
// reply is kept, so a slow older one can't replace newer results.
export function useEntityListQuery(listFn, { page = 1, limit = 10, livePath, filter, sortBy, search } = {}) {
  const narrowed = (Boolean(filter) && filter !== "all") || Boolean(search);
  const [state, setState] = useState({ data: [], pagination: {}, isLoading: true, error: null });
  const dataRef = useRef([]);
  const seq = useRef(0);
  dataRef.current = state.data;

  const refetch = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setState((current) => ({ ...current, isLoading: true, error: null }));
      const id = ++seq.current;
      try {
        const result = mapPage(
          await listFn({ page, limit, ...(filter ? { filter } : {}), ...(sortBy ? { sort_by: sortBy } : {}), ...(search ? { search } : {}) }),
        );
        if (id !== seq.current) return;
        setState({ data: result.records, pagination: result.pagination, isLoading: false, error: null });
      } catch (error) {
        if (id === seq.current) setState((current) => ({ ...current, isLoading: false, error }));
      }
    },
    [listFn, page, limit, filter, sortBy, search],
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
  useLiveChannel(livePath, () => void refetch({ silent: true }));
  return { ...state, refetch, applyRecords };
}
