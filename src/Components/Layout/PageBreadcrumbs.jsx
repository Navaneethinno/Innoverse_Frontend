import { ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getPathForCrumb, getRouteMetadata } from "@/Utils/Config/routeConfig";
import { UiTooltip } from "@/Components/Common/UiTooltip";

// Each crumb links to a real registered route via getPathForCrumb
// (routeConfig.js) — a reverse lookup over the same SEGMENT_LABELS map this
// file's own labels come from, so every link target is guaranteed to be an
// actual route. This replaces an earlier, separate hardcoded crumb->path
// map that didn't cover every possible crumb (e.g. "Account" had no entry
// and silently fell back to /dashboard).
export function PageBreadcrumbs() {
  const navigate = useNavigate();
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
            <button
              type="button"
              onClick={() => navigate(`/${getPathForCrumb(crumb)}`)}
              className={
                index === crumbs.length - 1
                  ? "truncate font-semibold text-foreground hover:text-primary"
                  : "truncate font-medium text-muted-foreground hover:text-primary"
              }
            >
              {crumb}
            </button>
          </UiTooltip>
        </span>
      ))}
    </nav>
  );
}
