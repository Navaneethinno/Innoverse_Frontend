import { request } from "@/Services/Epurse/onboarding.api";

// REPORTS > the report builder. No menu of its own: each report ("source")
// is granted by View on its existing report menu, and `sources` lists only
// the ones the user may open.
//   sources: {} -> [{ key, label, group, group_label, required_filters }]
//   fields:  { source } -> { fields, default_sort, required_filters, periods, limits }
//   options: { source, field, search, limit } -> [{ value, label }] (lookup fields)
//   run:     { source, columns | group_by + aggregates, filters, sort, page, page_size | all }
//            -> { columns: [{ key, label, type, currency_field }], rows: [[...]], warnings }
// Templates: saved definitions, private or shared; only the owner edits them.
const base = "/config/report/builder";
const call =
  (path) =>
  (body = {}) =>
    request(`${base}/${path}`, body);

export const reportBuilderApi = {
  ...Object.fromEntries(["sources", "fields", "options", "run"].map((name) => [name, call(name)])),
  template: Object.fromEntries(
    ["list", "get", "add", "edit", "delete", "copy"].map((name) => [
      name,
      call(`template/${name}`),
    ]),
  ),
};
