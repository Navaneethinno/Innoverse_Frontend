import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { request } from "@/Services/Epurse/onboarding.api";
import { useInstitutionFilter } from "@/Utils/Lib/institutionFilter";
import { canChooseInstitution } from "@/Utils/Lib/institutionScope";
import { notifications } from "@/Utils/Lib/notifications";

// One way to list, search and filter (handoff 62). `api` is the page's list
// call; POST /config/list/options says which tabs, filters, date and amount
// ranges, sort, page sizes and exports it has. Every choice lives in the URL
// query (bookmarkable, Back works), any change goes back to page 1, and the
// API does all filtering, searching and paging.
//
// `call(body)` makes the list request (the page's own api.list) and gets the
// standard body: page, limit, search, tab, filters, date_from/date_to,
// amount_min/amount_max, sort_by, list_version 2. `prefix` keeps two lists
// on one page apart in the URL. `extra` is sent as is (a parent's id).
const SEARCH_DELAY = 400;
const optionsCache = new Map();

const isSet = (v) => v !== undefined && v !== null && v !== "" && v !== false;

export function useServerList({ api, call, prefix = "", extra = null }) {
  const [params, setParams] = useSearchParams();
  const institution = useInstitutionFilter();
  const [options, setOptions] = useState(null);
  const [state, setState] = useState({ rows: [], pagination: null, summary: null, loading: true });
  const [version, setVersion] = useState(0);
  const p = (name) => `${prefix}${name}`;
  const get = (name) => params.get(p(name)) ?? "";

  // The list's description; again when the header's institution changes,
  // since filter choices are limited to it.
  const inst = canChooseInstitution() ? institution : "";
  useEffect(() => {
    if (!api) {
      // A page wired without its list path: nothing can load.
      console.error("useServerList: no list path given");
      return undefined;
    }
    const key = `${api}|${inst}`;
    if (optionsCache.has(key)) {
      setOptions(optionsCache.get(key));
      return undefined;
    }
    let cancelled = false;
    request("/config/list/options", { api, ...(inst ? { inst_profile_id: Number(inst) } : {}) })
      .then((r) => {
        const o = (Array.isArray(r?.data) ? r.data[0] : r?.data) ?? {};
        optionsCache.set(key, o);
        if (!cancelled) setOptions(o);
      })
      .catch((e) => {
        if (cancelled) return;
        notifications.error(e.message);
        setOptions({});
      });
    return () => {
      cancelled = true;
    };
  }, [api, inst]);

  // The search box shows what is typed at once; the list follows 400 ms
  // after typing stops.
  const [typed, setTyped] = useState(get("q"));
  const urlQ = get("q");
  useEffect(() => setTyped(urlQ), [urlQ]);

  const update = useCallback(
    (changes, { keepPage = false } = {}) =>
      setParams(
        (cur) => {
          const next = new URLSearchParams(cur);
          for (const [k, v] of Object.entries(changes)) {
            if (isSet(v)) next.set(`${prefix}${k}`, String(v));
            else next.delete(`${prefix}${k}`);
          }
          if (!keepPage) next.delete(`${prefix}page`);
          return next;
        },
        { replace: true },
      ),
    [setParams, prefix],
  );

  const timer = useRef(null);
  const onSearch = (value) => {
    setTyped(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => update({ q: value.trim() }), SEARCH_DELAY);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const filterDefs = useMemo(() => (options?.filters ?? []).filter((f) => f.kind !== "select" || f.options?.length), [options]);
  const filters = Object.fromEntries(filterDefs.map((f) => [f.key, get(`f_${f.key}`)]).filter(([, v]) => v !== ""));
  const tab = get("tab") || options?.tabs?.options?.[0]?.value || "";
  const limit = Number(get("rows")) || options?.default_page_size || 25;
  const page = Number(get("page")) || 1;
  const sort = get("sort") || (options?.sort ? options.sort_options?.[0]?.value ?? "desc" : "");
  const range = { date_from: get("from"), date_to: get("to"), amount_min: get("amin"), amount_max: get("amax") };

  // The request body: only what is set; the "all" tab and Any choices left out.
  const body = (() => {
    if (!options) return null;
    const typedFilters = Object.fromEntries(
      Object.entries(filters).map(([k, v]) => {
        const def = filterDefs.find((f) => f.key === k);
        if (def?.kind === "toggle") return [k, true];
        if (def?.kind === "number") return [k, Number(v)];
        const match = def?.options?.find((o) => String(o.value) === v);
        return [k, match ? match.value : v];
      }),
    );
    return {
      page,
      limit,
      ...(urlQ ? { search: urlQ } : {}),
      ...(tab && tab !== "all" && options.tabs ? { tab } : {}),
      ...(Object.keys(typedFilters).length ? { filters: typedFilters } : {}),
      ...(options.date_range && range.date_from ? { date_from: range.date_from } : {}),
      ...(options.date_range && range.date_to ? { date_to: range.date_to } : {}),
      ...(options.amount_range && range.amount_min ? { amount_min: Number(range.amount_min) } : {}),
      ...(options.amount_range && range.amount_max ? { amount_max: Number(range.amount_max) } : {}),
      ...(options.sort && sort ? { sort_by: sort } : {}),
      ...(extra ?? {}),
      list_version: 2,
    };
  })();

  // Only the newest request's answer counts.
  const seq = useRef(0);
  const bodyKey = JSON.stringify(body);
  useEffect(() => {
    if (!body) return;
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true }));
    Promise.resolve(call(body))
      .then((r) => {
        if (id !== seq.current) return;
        setState({ rows: Array.isArray(r?.data) ? r.data : [], pagination: r?.pagination ?? null, summary: r?.summary ?? null, loading: false });
      })
      .catch((e) => {
        if (id !== seq.current) return;
        notifications.error(e.message);
        setState({ rows: [], pagination: null, summary: null, loading: false });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyKey, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const pg = state.pagination;
  return {
    options,
    body,
    rows: state.rows,
    summary: state.summary,
    loading: state.loading || !options,
    reload,
    // For ListToolbar. A tab fixed by the page (`extra.tab`) leaves no tabs to pick.
    toolbar: {
      options: extra?.tab && options ? { ...options, tabs: null } : options,
      filterDefs,
      search: typed,
      onSearch,
      tab,
      onTab: (value) => update({ tab: value === options?.tabs?.options?.[0]?.value ? "" : value }),
      filters,
      setFilter: (key, value) => update({ [`f_${key}`]: value }),
      range,
      setRange: (changes) => update(Object.fromEntries(Object.entries(changes).map(([k, v]) => [{ date_from: "from", date_to: "to", amount_min: "amin", amount_max: "amax" }[k], v]))),
      sort,
      onSort: (value) => update({ sort: value === options?.sort_options?.[0]?.value ? "" : value }),
      clearAll: () => update({ ...Object.fromEntries(filterDefs.map((f) => [`f_${f.key}`, ""])), from: "", to: "", amin: "", amax: "" }),
    },
    // For DataTable (bare, serverSorted).
    pagination: {
      page: pg?.currentPage ?? page,
      totalPages: pg?.totalPages ?? 1,
      totalRecords: pg?.totalRecords ?? state.rows.length,
      limit,
      pageSizes: options?.page_sizes,
      onPageChange: (next) => update({ page: next > 1 ? next : "" }, { keepPage: true }),
      onLimitChange: (next) => update({ rows: next === options?.default_page_size ? "" : next }),
    },
  };
}
