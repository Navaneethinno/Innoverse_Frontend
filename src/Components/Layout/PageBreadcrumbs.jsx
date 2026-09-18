import { ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPathForCrumb, getRouteMetadata } from "@/Utils/Config/routeConfig";
import { UiTooltip } from "@/Components/Common/UiTooltip";

// Each crumb links to a real registered route via getPathForCrumb
// (routeConfig.js) — a reverse lookup over the same SEGMENT_LABELS map this
// file's own labels come from, so every link target is guaranteed to be an
// actual route. This replaces an earlier, separate hardcoded crumb->path
// map that didn't cover every possible crumb (e.g. "Account" had no entry
// and silently fell back to /dashboard).
//
// routeConfig.js stores stable i18n keys (crumbXxx), not display text, so
// getPathForCrumb's reverse lookup and this component's rendering both key
// off the same untranslated string — only the rendered label passes through
// t() — instead of the old scheme where the English text itself was both
// the display value and the lookup key, which would have silently broken
// crumb links the moment the label was translated to another language.
export function PageBreadcrumbs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation("routes");
  const crumbKeys = getRouteMetadata(pathname)?.breadcrumb ?? ["crumbDashboard"];

  return (
    <nav className="mb-3 flex items-center gap-1 text-xs" aria-label="Page breadcrumb">
      {crumbKeys.map((crumbKey, index) => (
        <span key={`${crumbKey}-${index}`} className="flex min-w-0 items-center gap-1">
          {index > 0 && (
            <ChevronRight size={12} className="shrink-0 text-[var(--muted-foreground-soft)]" />
          )}
          <UiTooltip label={t(crumbKey)}>
            <button
              type="button"
              onClick={() => navigate(`/${getPathForCrumb(crumbKey)}`)}
              className={
                index === crumbKeys.length - 1
                  ? "truncate font-semibold text-foreground hover:text-primary"
                  : "truncate font-medium text-muted-foreground hover:text-primary"
              }
            >
              {t(crumbKey)}
            </button>
          </UiTooltip>
        </span>
      ))}
    </nav>
  );
}
