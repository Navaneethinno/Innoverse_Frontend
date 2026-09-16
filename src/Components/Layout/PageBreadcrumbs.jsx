import { ChevronRight } from "lucide-react";
import { useLocation } from "react-router-dom";
import { getRouteMetadata } from "@/Utils/Config/routeConfig";
import { UiTooltip } from "@/Components/Common/UiTooltip";

// Plain path display, not a navigation control — each crumb used to be a
// clickable button routed through a small hardcoded crumb->path map that
// didn't cover every crumb text routeConfig.js can produce (e.g. "Account"
// had no entry and silently fell back to /dashboard, so clicking it landed
// somewhere unrelated to the page you were actually on). Showing it as text
// avoids promising navigation the map can't reliably deliver.
export function PageBreadcrumbs() {
  const { pathname } = useLocation();
  const crumbs = getRouteMetadata(pathname)?.breadcrumb ?? ["Dashboard"];

  return (
    <nav className="mb-3 flex items-center gap-1 text-xs" aria-label="Page breadcrumb">
      {crumbs.map((crumb, index) => (
        <span key={`${crumb}-${index}`} className="flex min-w-0 items-center gap-1">
          {index > 0 && (
            <ChevronRight size={12} className="shrink-0 text-[var(--muted-foreground-soft)]" />
          )}
          <UiTooltip label={crumb}>
            <span
              className={
                index === crumbs.length - 1
                  ? "truncate font-semibold text-foreground"
                  : "truncate font-medium text-muted-foreground"
              }
            >
              {crumb}
            </span>
          </UiTooltip>
        </span>
      ))}
    </nav>
  );
}
