import { useTranslation } from "react-i18next";
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
        <div className="mb-4 flex items-center justify-between gap-2">
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
          {action && <div className="shrink-0 whitespace-nowrap">{action}</div>}
        </div>
      )}
      {/* tabIndex: a widget that scrolls can be scrolled from the keyboard. */}
      <div tabIndex={0} className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</div>
    </div>
  );
}

// A widget's content, or a placeholder while the summary loads, when it
// failed, or when there is nothing to show.
export function WidgetBody({ loading, failed, empty, emptyText, children }) {
  const { t } = useTranslation("dashboard");
  if (loading) return <div className="min-h-16 flex-1 animate-pulse rounded-xl bg-muted/60" />;
  if (failed) return <p className="flex min-h-16 flex-1 items-center justify-center text-center text-xs text-muted-foreground">{t("couldNotLoad")}</p>;
  if (empty)
    return (
      <div className="flex min-h-16 flex-1 flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        {/* An empty tray, so "nothing yet" reads as calm rather than broken. */}
        <svg width="56" height="44" viewBox="0 0 56 44" aria-hidden="true">
          <rect x="14" y="4" width="28" height="22" rx="3" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
          <rect x="19" y="10" width="14" height="2.5" rx="1.25" fill="var(--border)" />
          <rect x="19" y="16" width="10" height="2.5" rx="1.25" fill="var(--border)" />
          <path d="M4 26 L12 18 H44 L52 26 V38 a4 4 0 0 1 -4 4 H8 a4 4 0 0 1 -4 -4z" fill="color-mix(in srgb, var(--primary) 18%, var(--card))" />
          <path d="M4 26 H18 a10 6 0 0 0 20 0 H52" fill="none" stroke="var(--primary)" strokeWidth="1.5" opacity="0.6" />
        </svg>
        <p>{emptyText ?? t("nothingYet")}</p>
      </div>
    );
  return children;
}
