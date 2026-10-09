import { dayDate, money } from "@/Components/Epurse/Accounts/accountShared";
import { atIst } from "../Shared/reportShared";

// The report builder's pure parts: filter rules, the definition sent to
// `run` and saved in templates, and cell values for the table and files.

export const NO_VALUE_OPS = ["is_empty", "is_not_empty", "is_true", "is_false"];
const LIST_OPS = ["in", "not_in"];
export const DATE_TYPES = ["date", "datetime"];
export const NUMBER_TYPES = ["number", "money"];

let seq = 0;
const uid = () => `r${(seq += 1)}`;

// The operator a new condition starts with, and its empty value.
const FIRST_OP = {
  text: "contains",
  enum: "in",
  date: "period",
  datetime: "period",
  bool: "is_true",
  number: "eq",
  money: "gte",
};
export const firstOp = (field) =>
  field.operators.includes(FIRST_OP[field.type]) ? FIRST_OP[field.type] : field.operators[0];
export function emptyValue(field, op, periods = []) {
  if (NO_VALUE_OPS.includes(op)) return undefined;
  if (op === "period")
    return periods.find((p) => p.value === "THIS_MONTH")?.value ?? periods[0]?.value ?? "";
  if (op === "between") return ["", ""];
  if (LIST_OPS.includes(op)) return [];
  return "";
}

export const newCondition = (field, periods) => {
  const op = firstOp(field);
  return { id: uid(), field: field.key, op, value: emptyValue(field, op, periods) };
};
export const newGroup = (rules = []) => ({ id: uid(), match: "ALL", rules });
export const isGroup = (rule) => Array.isArray(rule.rules);

// A saved / sent filter tree with ids for the screen (and back).
export const withIds = (node) =>
  isGroup(node)
    ? { id: uid(), match: node.match ?? "ALL", rules: node.rules.map(withIds) }
    : { id: uid(), field: node.field, op: node.op, value: node.value };
const filled = (v) => v !== "" && v != null;
export function isComplete(rule) {
  if (NO_VALUE_OPS.includes(rule.op)) return true;
  if (rule.op === "between") return Array.isArray(rule.value) && rule.value.every(filled);
  if (LIST_OPS.includes(rule.op)) return Array.isArray(rule.value) && rule.value.length > 0;
  return filled(rule.value);
}
export function strip(node) {
  if (isGroup(node)) return { match: node.match, rules: node.rules.map(strip) };
  return NO_VALUE_OPS.includes(node.op)
    ? { field: node.field, op: node.op }
    : { field: node.field, op: node.op, value: node.value };
}
export const conditionsIn = (node) =>
  isGroup(node) ? node.rules.reduce((n, r) => n + conditionsIn(r), 0) : 1;
export const allComplete = (node) =>
  isGroup(node) ? node.rules.every(allComplete) : isComplete(node);

// What the screen holds, as the API's definition. Totals mode sends
// group_by / aggregates (columns are then ignored by the API).
export function definitionOf({ source, mode, columns, groupBy, aggregates, filters, sort }) {
  return {
    source,
    ...(mode === "totals"
      ? {
          group_by: groupBy,
          aggregates: aggregates.map(({ fn, field }) => (field ? { fn, field } : { fn })),
        }
      : { columns }),
    ...(filters.rules.length ? { filters: strip(filters) } : {}),
    ...(sort.length ? { sort: sort.map(({ field, dir }) => ({ field, dir })) } : {}),
  };
}

// A saved definition back into the screen's state.
export const stateOf = (definition, meta) => {
  const totals = Boolean(definition.group_by?.length || definition.aggregates?.length);
  return {
    source: definition.source,
    mode: totals ? "totals" : "rows",
    columns: definition.columns?.length
      ? definition.columns
      : meta.fields.filter((f) => f.default).map((f) => f.key),
    groupBy: definition.group_by ?? [],
    aggregates: (definition.aggregates ?? []).map((a) => ({
      id: uid(),
      fn: a.fn,
      field: a.field ?? "",
    })),
    filters: withRequired(
      definition.filters ? withIds({ match: "ALL", ...definition.filters }) : newGroup(),
      meta,
    ),
    sort: (definition.sort ?? []).map((s) => ({ id: uid(), field: s.field, dir: s.dir ?? "asc" })),
  };
};
export const newAggregate = (fn = "count", field = "") => ({ id: uid(), fn, field });
export const newSort = (field, dir = "asc") => ({ id: uid(), field, dir });

// A report with required filters (User Activity: one user and a date)
// always has a top-level condition for each.
export function withRequired(filters, meta) {
  const missing = (meta.required_filters ?? []).filter(
    (key) => !filters.rules.some((r) => !isGroup(r) && r.field === key),
  );
  const add = missing.map((key) => meta.fields.find((f) => f.key === key)).filter(Boolean);
  if (!add.length) return filters;
  return {
    ...filters,
    rules: [
      ...add.map((f) => ({
        ...newCondition(f, meta.periods),
        op: f.operators.includes("eq") ? "eq" : firstOp(f),
        value: f.operators.includes("eq") ? "" : emptyValue(f, firstOp(f), meta.periods),
      })),
      ...filters.rules,
    ],
  };
}

// One cell of a run's reply, as people read it. `row` is the whole row and
// `index` maps a column key to its position (for a money column's currency).
export function cellText(value, column, row, index, optionLabels) {
  if (value == null || value === "") return "";
  switch (column.type) {
    case "datetime":
      return atIst(value);
    case "date":
      return dayDate(value);
    case "bool":
      return value ? "✓" : "✗";
    case "money": {
      const at = column.currency_field ? index[column.currency_field] : undefined;
      return money(value, at === undefined ? undefined : row[at]);
    }
    case "number":
      return Number(value).toLocaleString();
    case "enum":
      return optionLabels?.[column.key]?.[value] ?? String(value);
    default:
      return String(value);
  }
}

// The same cell for a file: numbers stay numbers (no grouping), so Excel
// and CSV readers can add them up.
export function fileValue(value, column, optionLabels) {
  if (value == null) return null;
  if (NUMBER_TYPES.includes(column.type)) return Number(value);
  if (column.type === "datetime") return atIst(value);
  if (column.type === "bool") return value ? "Yes" : "No";
  if (column.type === "enum") return optionLabels?.[column.key]?.[value] ?? String(value);
  return String(value);
}

const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const csvText = (head, rows) =>
  `\uFEFF${[head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
