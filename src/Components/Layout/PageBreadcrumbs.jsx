import { ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getRouteMetadata } from "@/Utils/Config/routeConfig";
import { getUiTooltipText } from "@/Utils/Lib/tooltips";

function pathForCrumb(crumb) {
  const paths = {
    Dashboard: "/dashboard",
    Institution: "/institutions",
    Institutions: "/institutions",
    "Institution Profile": "/institutions",
    "User Management": "/users",
    User: "/users",
    Users: "/users",
    Profile: "/profiles",
    Profiles: "/profiles",
    Settings: "/change-password",
    "Change Password": "/change-password",
  };
  return paths[crumb] ?? "/dashboard";
}

export function PageBreadcrumbs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const crumbs = getRouteMetadata(pathname)?.breadcrumb ?? ["Dashboard"];

  return (
    <nav className="mb-4 flex items-center gap-1 text-xs" aria-label="Page breadcrumb">
      {crumbs.map((crumb, index) => (
        <span key={`${crumb}-${index}`} className="flex min-w-0 items-center gap-1">
          {index > 0 && (
            <ChevronRight size={12} className="shrink-0 text-[var(--muted-foreground-soft)]" />
          )}
          <button
            type="button"
            title={getUiTooltipText(crumb)}
            onClick={() => navigate(pathForCrumb(crumb))}
            className={
              index === crumbs.length - 1
                ? "truncate font-semibold text-foreground hover:text-primary"
                : "truncate font-medium text-muted-foreground hover:text-primary"
            }
          >
            {crumb}
          </button>
        </span>
      ))}
    </nav>
  );
}
