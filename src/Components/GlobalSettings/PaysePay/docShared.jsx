import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Facts, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field } from "@/Components/InnoCBS/Loans/loanShared";
import { useInstitutionScope } from "@/Components/InnoCBS/Loans/loanShared";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";

// One document's plain fields: Facts when read, inputs when editing.
// `fields`: [{ key, label, type (bool | int | amount | percent | text | select | multi), options, hint }].
export function DocFields({ value, fallback, editing, onChange, fields, columns = "lg:grid-cols-3" }) {
  const { t } = useTranslation("paysePay");
  // Nothing set yet: the defaults show and a first edit starts from them.
  const empty = !value || !Object.keys(value).length;
  const v = empty ? fallback ?? {} : value;
  const seed = editing && empty && fallback && Object.keys(fallback).length;
  useEffect(() => {
    if (seed) onChange(fallback);
  }, [seed]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!editing) return <Facts rows={fields.map((f) => [f.label, shownValue(t, f, v[f.key])])} />;
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", columns)}>
      {fields.map((f) => (
        <label key={f.key} className={cn(labelClass, f.type === "bool" && "flex items-center justify-between gap-2 self-end rounded-xl border border-border px-3 py-2")}>
          {f.label}
          {f.type === "list" ? (
            <ListInput field={f} value={v[f.key]} onChange={(x) => onChange({ ...v, [f.key]: x })} />
          ) : (
            <Field field={f} value={v[f.key]} onChange={(x) => onChange({ ...v, [f.key]: x })} />
          )}
          {f.hint && <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{f.hint}</span>}
        </label>
      ))}
    </div>
  );
}

// Several free values typed with commas (codes, IP ranges); kept as a list.
export function ListInput({ field, value, onChange }) {
  const text = Array.isArray(value) ? value.join(", ") : value ?? "";
  return (
    <Field
      field={{ ...field, type: "text" }}
      value={text}
      onChange={(x) => onChange(String(x).split(",").map((s, i, all) => (i < all.length - 1 ? s.trim() : s.trimStart())).filter((s, i, all) => s !== "" || i === all.length - 1))}
    />
  );
}

export function shownValue(t, f, x) {
  if (f.type === "bool") return x ? t("yes") : t("no");
  if (Array.isArray(x)) return x.length ? x.map((o) => optionLabel(f, o)).join(", ") : t("none");
  if (x === undefined || x === null || x === "") return f.emptyText ?? "—";
  if (f.type === "select") return optionLabel(f, x);
  return String(x);
}
const optionLabel = (f, x) => (f.options ?? []).find((o) => typeof o === "object" && String(o.value) === String(x))?.label ?? String(x);

// Form values back to the server's types: whole numbers as numbers, the rest as given.
export function typed(fields, form) {
  const out = { ...form };
  for (const f of fields) {
    if (f.type === "int") out[f.key] = form?.[f.key] === "" || form?.[f.key] == null ? null : Number(form[f.key]);
    if (f.type === "amount" || f.type === "percent") out[f.key] = form?.[f.key] == null ? "" : String(form[f.key]);
    if (f.type === "bool") out[f.key] = Boolean(form?.[f.key]);
    if (f.type === "list" || f.type === "multi") out[f.key] = (Array.isArray(form?.[f.key]) ? form[f.key] : []).map((x) => (typeof x === "string" ? x.trim() : x)).filter((x) => x !== "");
  }
  return out;
}

// Inputs keep strings; numbers from the server become text.
export function asForm(fields, value) {
  const out = { ...(value ?? {}) };
  for (const f of fields) if (f.type === "int" && out[f.key] != null) out[f.key] = String(out[f.key]);
  return out;
}

// A whole-number field outside its range: the first such field's text.
export function rangeProblem(t, fields, form) {
  for (const f of fields) {
    if (f.type !== "int" || f.min == null) continue;
    const raw = form?.[f.key];
    if ((raw === "" || raw == null) && f.optional) continue;
    const n = Number(raw);
    if (raw === "" || raw == null || !Number.isInteger(n) || n < f.min || n > f.max) return t("outOfRange", { field: f.label, min: f.min, max: f.max });
  }
  return "";
}

// A list that is not on the list standard: page / page_size (or limit) in,
// rows with `pagination` or `{rows, total}` back. `body` changes reload page 1.
export function usePagedList(call, body, { sizeKey = "limit" } = {}) {
  const { scope } = useInstitutionScope();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [state, setState] = useState({ rows: [], total: 0, loading: true });
  const [version, setVersion] = useState(0);
  const key = JSON.stringify(body);
  const seq = useRef(0);
  useEffect(() => setPage(1), [key]);
  useEffect(() => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true }));
    call(scope({ ...JSON.parse(key), page, [sizeKey]: limit }))
      .then((r) => {
        if (id !== seq.current) return;
        const data = Array.isArray(r?.data) ? r.data : [];
        const inner = data.length === 1 && Array.isArray(data[0]?.rows) ? data[0] : null;
        const rows = inner ? inner.rows : Array.isArray(r?.rows) ? r.rows : data;
        const total = inner?.total ?? r?.total ?? r?.pagination?.totalRecords ?? rows.length;
        setState({ rows, total, loading: false });
      })
      .catch((e) => {
        if (id !== seq.current) return;
        notifications.error(e.message);
        setState({ rows: [], total: 0, loading: false });
      });
  }, [call, scope, key, page, limit, sizeKey, version]);
  const reload = useCallback(() => setVersion((x) => x + 1), []);
  return {
    ...state,
    reload,
    pagination: {
      page,
      limit,
      totalRecords: state.total,
      totalPages: Math.max(1, Math.ceil(state.total / limit)),
      onPageChange: setPage,
      onLimitChange: (n) => (setLimit(n), setPage(1)),
    },
  };
}

export const when = (x) => (x ? accountDate(x) : "—");

// A row of page tabs (Settings | list).
export function PillTabs({ tabs, value, onChange }) {
  return <SegmentedSwitch className="mb-3" options={tabs.map(([key, label]) => ({ value: key, label }))} value={value} onChange={onChange} />;
}

// Every plain value of a record as Facts (a detail whose fields the spec leaves open).
export function RecordFacts({ record, skip = [] }) {
  const rows = Object.entries(record ?? {})
    .filter(([k, v]) => !skip.includes(k) && (v == null || typeof v !== "object"))
    .map(([k, v]) => [k.replace(/_/g, " "), v == null || v === "" ? "—" : /(_at|_time)$/.test(k) ? when(v) : String(v)]);
  return <Facts rows={rows} />;
}
