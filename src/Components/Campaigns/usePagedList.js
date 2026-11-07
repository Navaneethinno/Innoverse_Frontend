import { useCallback, useEffect, useState } from "react";
import { useListSearch } from "@/Hooks/useListSearch";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";

// A server-paged list: `call(body)` gets page, limit, search and `filters`
// (left out when empty). Any filter or search change goes back to page 1.
export function usePagedList(call, filters) {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { body: searchBody, latest, bind } = useListSearch(() => setPage(1));
  const key = JSON.stringify(filters ?? {});
  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const response = await latest(call({ ...searchBody, ...JSON.parse(key), page, limit }));
        setRows(rowsOf(response));
        setPagination(response?.pagination ?? {});
      } catch (error) {
        notifications.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    [call, searchBody, latest, key, page, limit],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => setPage(1), [key]);
  return {
    rows,
    loading,
    reload: () => void load({ silent: true }),
    searchBind: bind,
    total: pagination.totalRecords,
    serverPagination: {
      page,
      totalPages: pagination.totalPages ?? 1,
      totalRecords: pagination.totalRecords ?? rows.length,
      onPageChange: setPage,
      limit,
      onLimitChange: (n) => {
        setLimit(n);
        setPage(1);
      },
    },
  };
}

// The first record of a reply.
export const firstOf = (r) => (Array.isArray(r?.data) ? r.data[0] : r?.data) ?? null;

// Whole-number ids from chips ("12" -> 12), dropping anything else.
export const idsOf = (list) => (list ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
