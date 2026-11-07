import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { notifications } from "@/Utils/Lib/notifications";

// The rows and paging of a reply, whichever of the two shapes it has: the
// list standard ({data: [...], pagination}) or a page object
// ({items, total, page, page_size}, alone or as data[0]).
export function pageOf(reply) {
  const data = reply?.data;
  const first = Array.isArray(data) ? data[0] : data;
  if (first && Array.isArray(first.items) && (first.total != null || first.page_size != null)) {
    return { rows: first.items, total: Number(first.total ?? first.items.length), extra: first };
  }
  const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  return { rows, total: Number(reply?.pagination?.totalRecords ?? rows.length), extra: null };
}

// A server-paged list for calls that take {page, page_size} and filters the
// page owns (not the list standard of /config/list/options). `body` is the
// filters; any change goes back to page 1. `livePath` reloads it when
// another user changes a record.
export function usePagedList(call, body, { livePath = null, enabled = true, initialSize = 25 } = {}) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialSize);
  const [state, setState] = useState({ rows: [], total: 0, extra: null, loading: true });
  const [version, setVersion] = useState(0);
  const key = JSON.stringify(body ?? {});
  const seq = useRef(0);
  const callRef = useRef(call);
  useEffect(() => {
    callRef.current = call;
  });
  useEffect(() => setPage(1), [key]);
  useEffect(() => {
    if (!enabled) return;
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true }));
    Promise.resolve(callRef.current({ ...JSON.parse(key), page, page_size: size }))
      .then((r) => id === seq.current && setState({ ...pageOf(r), loading: false }))
      .catch((e) => {
        if (id !== seq.current) return;
        notifications.error(e.message);
        setState({ rows: [], total: 0, extra: null, loading: false });
      });
  }, [key, page, size, version, enabled]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useLiveChannel(livePath, reload);
  return {
    ...state,
    reload,
    pagination: {
      page,
      totalPages: Math.max(1, Math.ceil(state.total / size)),
      totalRecords: state.total,
      limit: size,
      onPageChange: setPage,
      onLimitChange: (next) => {
        setSize(next);
        setPage(1);
      },
    },
  };
}

// A base64 text from the API (a template, a result file) as a download.
export function saveBase64(base64, fileName, type = "text/csv") {
  const bytes = Uint8Array.from(atob(base64 ?? ""), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// A picked file as base64 (without the data: prefix).
export const fileBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
