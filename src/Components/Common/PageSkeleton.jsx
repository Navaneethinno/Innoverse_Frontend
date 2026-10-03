import { useTranslation } from "react-i18next";

// A record page's shape while it loads: a header card and two sections of
// shimmering lines, so the page does not jump when the data lands.
export function PageSkeleton() {
  const { t } = useTranslation("common");
  const line = (w) => <span className={`skeleton-shimmer block h-3 rounded ${w}`} />;
  return (
    <div className="grid gap-4 pb-8 pt-4" role="status" aria-label={t("loading")}>
      <span className="skeleton-shimmer block h-4 w-28 rounded" />
      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4">
        <span className="skeleton-shimmer block h-6 w-56 max-w-full rounded-lg" />
        {line("w-80 max-w-full")}
      </div>
      {[0, 1].map((s) => (
        <div key={s} className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
          {["w-3/4", "w-1/2", "w-2/3", "w-5/6", "w-1/3", "w-3/5"].map((w) => (
            <div key={w} className="grid gap-1.5">
              {line("w-20")}
              {line(w)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
