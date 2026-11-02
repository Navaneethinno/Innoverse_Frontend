import { StatusBadge } from "./StatusBadge";

// A list shows one Status column. A second badge appears only while the
// record waits for approval or is a draft (process status other than Active).
const FOLDED = new Set(["process_status_name", "process_status", "auth_status"]);

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
          if (!process || String(process).toLowerCase() === "active") return main;
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
