import { useState } from "react";

// Pages a list that is already all in memory (an import's results, a history),
// so a long one stays a short table. Spread `pager` onto <Pager>; it is null
// while everything fits on one page.
export function useClientPage(rows, initialSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);
  const list = rows ?? [];
  const lastPage = Math.max(1, Math.ceil(list.length / pageSize));
  // A shorter list (a new search, a removed row) keeps a page that still exists.
  const current = Math.min(page, lastPage);
  const shown = list.slice((current - 1) * pageSize, current * pageSize);
  const pager =
    list.length > Math.min(pageSize, initialSize)
      ? {
          page: current,
          pageSize,
          total: list.length,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(1);
          },
        }
      : null;
  return { rows: shown, pager };
}
