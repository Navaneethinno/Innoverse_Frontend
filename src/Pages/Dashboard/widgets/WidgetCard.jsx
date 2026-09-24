import { cn } from "@/Utils/Lib/utils";

// The glass card every dashboard widget sits in — same look as the
// original Control Space tiles (glass tokens from theme.css), so each widget
// only renders its own content.
export const glass = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--glass-shadow)",
};

export function WidgetCard({ title, icon: Icon, action, className, children }) {
  return (
    <div className={cn("relative flex h-full flex-col overflow-hidden rounded-2xl border p-5", className)} style={glass}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-2 pr-16">
          <div className="flex min-w-0 items-center gap-2">
            {Icon && (
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
                style={{ background: "var(--primary)", boxShadow: "0 4px 10px var(--primary-light)" }}
              >
                <Icon size={14} />
              </span>
            )}
            <h2 className="truncate text-sm font-bold text-slate-800">{title}</h2>
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
