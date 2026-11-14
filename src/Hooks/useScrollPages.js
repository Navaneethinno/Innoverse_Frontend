import { useCallback, useEffect, useRef, useState } from "react";
import { listPage } from "@/Hooks/useServerList";

// A list shown in a scroll box that loads page by page from the server
// (page, limit, sort_by: newest first unless `sort` says otherwise; null
// keeps the server's own order): page 1 on load, the next one as the
// box is scrolled to its end (`onScroll`), until `total`. `all()` loads the
// remaining pages, for a step that needs every row.
export function useScrollPages(call, body, { limit = 50, enabled = true, sort = "desc" } = {}) {
  const [state, setState] = useState({ items: null, page: 0, total: 0, loading: false });
  const key = JSON.stringify(body ?? {});
  const busy = useRef(false);

  const fetchPage = useCallback(
    async (page) => {
      const reply = await call({ ...JSON.parse(key), page, limit, ...(sort ? { sort_by: sort } : {}) });
      return listPage(reply);
    },
    [call, key, limit, sort],
  );

  const reload = useCallback(async () => {
    if (!enabled) return;
    busy.current = true;
    setState((s) => ({ ...s, loading: true }));
    try {
      const { items, total } = await fetchPage(1);
      setState({ items, page: 1, total, loading: false });
    } catch (error) {
      setState({ items: [], page: 0, total: 0, loading: false });
      throw error;
    } finally {
      busy.current = false;
    }
  }, [enabled, fetchPage]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  const more = useCallback(async () => {
    if (busy.current || !state.items || state.items.length >= state.total) return;
    busy.current = true;
    setState((s) => ({ ...s, loading: true }));
    try {
      const { items } = await fetchPage(state.page + 1);
      setState((s) => ({ ...s, items: [...(s.items ?? []), ...items], page: s.page + 1, loading: false }));
    } catch {
      setState((s) => ({ ...s, loading: false }));
    } finally {
      busy.current = false;
    }
  }, [fetchPage, state.items, state.page, state.total]);

  const onScroll = (event) => {
    const el = event.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) void more();
  };

  // Every row (the remaining pages), e.g. to tick cards in one dialog.
  const all = useCallback(async () => {
    let rows = state.items ?? [];
    let page = state.page;
    while (rows.length < state.total) {
      const { items } = await fetchPage(page + 1);
      if (!items.length) break;
      rows = [...rows, ...items];
      page += 1;
    }
    setState((s) => ({ ...s, items: rows, page }));
    return rows;
  }, [fetchPage, state.items, state.page, state.total]);

  return { ...state, reload, more, onScroll, all };
}
