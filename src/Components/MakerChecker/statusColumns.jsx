import { StatusBadge } from "./StatusBadge";

// A list shows one Status column. A second badge appears only while the
// record waits for approval or is a draft (process status other than Active).
const FOLDED = new Set(["process_status_name", "process_status", "auth_status"]);
// Settled states say nothing the main badge does not ("Inactive" twice).
const SETTLED = new Set(["active", "inactive", "approved", "authorized", "authorised", "deactivated"]);

export function mergeStatusColumns(columns) {
  return columns
    .filter((column) => !FOLDED.has(column.key))
    .map((column) => {
      if (column.key !== "status" && column.key !== "status_name") return column;
      return {
        ...column,
        render: (row, ...rest) => {
          const process = row?.process_status_name;
          const main = column.render ? column.render(row, ...rest) : row?.[column.key];
          const p = String(process ?? "").trim().toLowerCase();
          const shown = String(row?.status_name ?? "").trim().toLowerCase();
          if (!p || SETTLED.has(p) || p === shown) return main;
          return (
            <span className="inline-flex flex-wrap items-center gap-1">
              {main}
              <StatusBadge status={String(process)} variant="subtle" />
            </span>
          );
        },
      };
    });
}
