import { useCallback, useEffect, useState } from "react";
import { useListSearch } from "@/Hooks/useListSearch";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";

// One server-paged list (Blacklist, Whitelist): `call` is the list call,
// `filters` what it sends besides page, limit and the search. Changing the
// filters goes back to page 1. Returns the rows, the DataTable's
// serverPagination and the search box binding. A list not `enabled` (a
// tab not on screen) doesn't call the server.
export function usePagedList(call, filters, enabled = true) {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { body: searchBody, latest, bind } = useListSearch(() => setPage(1));
  const filterKey = JSON.stringify(filters);
  const [lastKey, setLastKey] = useState(filterKey);
  if (lastKey !== filterKey) {
    setLastKey(filterKey);
    setPage(1);
  }

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const active = Object.fromEntries(Object.entries(JSON.parse(filterKey)).filter(([, v]) => v !== "" && v != null));
        const response = await latest(call({ ...searchBody, ...active, page, limit }));
        setRows(rowsOf(response));
        setPagination(response?.pagination ?? {});
      } catch (error) {
        notifications.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    [call, filterKey, searchBody, latest, page, limit],
  );
  useEffect(() => {
    if (enabled) void load();
  }, [load, enabled]);

  return {
    rows,
    loading,
    reload: () => (enabled ? load({ silent: true }) : Promise.resolve()),
    total: pagination.totalRecords,
    searchBind: bind,
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
