import { StatusFilterTabs } from "./StatusFilterTabs";

// Every list screen's one panel: the tabs and the add button (`actions`),
// the search with the list's own `filters` beside it and the newest/oldest
// sort, then the table (a DataTable with `bare`) — one card, no seams.
// Toolbar props go to StatusFilterTabs; `tabs={[]}` for a list without tabs.
export function ListPanel({ children, ...toolbar }) {
  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}>
      <StatusFilterTabs bare {...toolbar} />
      {children}
    </div>
  );
}
