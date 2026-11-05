import { cn } from "@/Utils/Lib/utils";

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" };

// A small table with the app's header look, for rows that are all on screen:
// a breakdown, a preview, an editable grid. Lists that can grow belong in
// DataTable, which pages, sorts and searches. `columns` holds labels or
// { label, align, className }; children are the <tbody> (and any <tfoot>).
export function SimpleTable({ columns, className, children }) {
  return (
    <table className={cn("w-full text-xs", className)}>
      <thead className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <tr>
          {columns.map((column, i) => {
            const { label, align, className: cell } = column && typeof column === "object" && "label" in column ? column : { label: column };
            return (
              <th key={i} scope="col" className={cn("px-3 py-2", ALIGN[align], cell)}>
                {label}
              </th>
            );
          })}
        </tr>
      </thead>
      {children}
    </table>
  );
}
