import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { findMenuByPath, menuChain, moduleDashboardPath } from "@/Components/Layout/Menu/menuRouteMap";
import { useTranslation } from "react-i18next";
import { getPathForCrumb, getRouteMetadata } from "@/Utils/Config/routeConfig";
import { menuLabel, moduleLabel } from "@/Components/Layout/Menu/menuLabels";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { useGoTo } from "@/Components/Layout/Menu/goTo";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

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
  const tr = useConfigLabel();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation("routes");
  const crumbKeys = getRouteMetadata(pathname)?.breadcrumb ?? ["crumbDashboard"];
  const menus = useSelector((state) => state.menu.menuArray);
  const goTo = useGoTo();
  // A sidebar menu page (/<module>/<menu path>): its module and menu chain,
  // as the backend names them. The module opens its dashboard.
  const menuCrumbs = useMemo(() => {
    const active = (menus ?? []).filter((m) => m?.status === 1);
    const menu = findMenuByPath(active, pathname);
    if (!menu) return null;
    // Each group level opens the first page under it (Admin_33 B8).
    const firstLeaf = (group) => {
      const kids = active.filter((m) => String(m.parent_menu_id) === String(group.menu_id) && m.module_name === group.module_name);
      if (!kids.length) return group;
      return firstLeaf(kids.sort((a, b) => Number(a.priority ?? 0) - Number(b.priority ?? 0))[0]);
    };
    const chain = menuChain(menu, active);
    return {
      dashboard: moduleDashboardPath(menu.module_name),
      names: [moduleLabel(menu), ...chain.map(menuLabel)].filter(Boolean),
      targets: [null, ...chain.map((m, i) => (i < chain.length - 1 ? firstLeaf(m) : null))],
    };
  }, [menus, pathname]);

  if (menuCrumbs) {
    return (
      <nav className="mb-3 flex items-center gap-1 text-xs" aria-label={tr("Page breadcrumb")}>
        {menuCrumbs.names.map((name, index) => (
          <span key={`${name}-${index}`} className="flex min-w-0 items-center gap-1">
            {index > 0 && <ChevronRight size={12} className="shrink-0 text-[var(--muted-foreground-soft)]" />}
            {index === 0 ? (
              <button type="button" onClick={() => navigate(menuCrumbs.dashboard)} className="truncate font-medium text-muted-foreground transition-colors hover:text-primary hover:underline">
                {name}
              </button>
            ) : menuCrumbs.targets[index] ? (
              <button type="button" onClick={() => goTo({ menu_id: menuCrumbs.targets[index].menu_id, module_name: menuCrumbs.targets[index].module_name })} className="truncate font-medium text-muted-foreground transition-colors hover:text-primary hover:underline">
                {name}
              </button>
            ) : (
              <span className={index === menuCrumbs.names.length - 1 ? "truncate font-semibold text-foreground" : "truncate font-medium text-muted-foreground"}>
                {name}
              </span>
            )}
          </span>
        ))}
      </nav>
    );
  }

  return (
    <nav className="mb-3 flex items-center gap-1 text-xs" aria-label={tr("Page breadcrumb")}>
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
