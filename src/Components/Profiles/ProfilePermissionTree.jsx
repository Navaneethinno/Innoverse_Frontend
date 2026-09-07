import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn } from "@/Utils/Lib/cn";

// Base data source deliberately reused rather than inventing a new master
// endpoint: the Postman collection has no confirmed /master/menu/list or
// /master/menu-action/list route, so — per the task's constraint to use what
// already exists — this reads the SAME menu_array (menu_id, parent_menu_id,
// module_id, menu_name, actions[]) that the logged-in user's own sidebar
// already consumes (src/Redux/MenuSlice.js), combined with masterModules for
// human-readable module names. This is a deliberate divergence from payse's
// Profile add/edit screens, which read a dedicated module/menu tree endpoint
// (GET_MODULE_API_URL + a menu list) not present in this backend's Postman
// collection — flagged here rather than silently guessing a URL. In
// practice an admin who can manage Profiles already has a menu_array
// covering the full grantable surface, so this is a reasonable stand-in.
export function useMenuTreeSource() {
  const menuArray = useSelector((store) => store.menu.menuArray);
  const masterModules = useSelector((store) => store.menu.masterModules);
  return useMemo(() => {
    const moduleNameById = new Map(
      (masterModules || []).map((m) => [Number(m.module_id), m.module_name]),
    );
    const byModule = new Map();
    for (const item of menuArray || []) {
      const moduleId = Number(item?.module_id);
      if (!byModule.has(moduleId)) byModule.set(moduleId, []);
      byModule.get(moduleId).push(item);
    }
    return Array.from(byModule.entries())
      .map(([moduleId, menus]) => ({
        moduleId,
        moduleName: moduleNameById.get(moduleId) ?? `Module #${moduleId}`,
        menus: menus.slice().sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)),
      }))
      .sort((a, b) => a.moduleName.localeCompare(b.moduleName));
  }, [menuArray, masterModules]);
}

function allActionIds(menu) {
  return (menu.actions || []).map((a) => a.action_id);
}

/**
 * Menu/action grant picker. Grouped by module, each module collapsible
 * (closed by default) so this stays usable with dozens/hundreds of modules
 * instead of one long scroll — a text filter narrows modules/menus by name
 * for the same reason.
 *
 * Each menu row is a single checkbox: checking it grants every action the
 * menu has in one click (matching the realistic "grant this whole menu"
 * bulk-provisioning flow, not forcing five individual clicks per menu) and
 * expands the row to show each action so the admin can deselect the ones
 * they don't want. Unchecking the row clears every action for that menu and
 * collapses it back down. A "Select all" control at the module header does
 * the same thing for every menu in that module in one click.
 *
 * selected: array of {menu_id, actions: [action_id...], is_configuration_only}
 * readOnly: renders the same grants without any click handlers (e.g. the
 * Profiles "View" action) instead of a second, duplicated read-only tree.
 */
export function ProfilePermissionTree({ selected, onChange, readOnly = false }) {
  const modules = useMenuTreeSource();
  const [query, setQuery] = useState("");
  const [openModuleIds, setOpenModuleIds] = useState(() => new Set());

  const grantFor = (menuId) => selected.find((g) => g.menu_id === menuId);
  const isMenuGranted = (menuId) => (grantFor(menuId)?.actions?.length ?? 0) > 0;

  const toggleModuleOpen = (moduleId) => {
    setOpenModuleIds((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const setMenuGrant = (menu, actionIds) => {
    if (actionIds.length === 0) {
      onChange(selected.filter((g) => g.menu_id !== menu.menu_id));
      return;
    }
    const existing = grantFor(menu.menu_id);
    if (!existing) {
      onChange([
        ...selected,
        { menu_id: menu.menu_id, actions: actionIds, is_configuration_only: 0 },
      ]);
    } else {
      onChange(
        selected.map((g) => (g.menu_id === menu.menu_id ? { ...g, actions: actionIds } : g)),
      );
    }
  };

  const toggleMenuRow = (menu) => {
    setMenuGrant(menu, isMenuGranted(menu.menu_id) ? [] : allActionIds(menu));
  };

  const toggleAction = (menu, actionId) => {
    const existing = grantFor(menu.menu_id);
    const current = existing?.actions ?? [];
    const next = current.includes(actionId)
      ? current.filter((a) => a !== actionId)
      : [...current, actionId];
    setMenuGrant(menu, next);
  };

  const toggleModuleSelectAll = (module) => {
    const allGranted = module.menus.every((menu) => {
      const grant = grantFor(menu.menu_id);
      return (grant?.actions?.length ?? 0) === allActionIds(menu).length;
    });
    const withoutModule = selected.filter(
      (g) => !module.menus.some((menu) => menu.menu_id === g.menu_id),
    );
    onChange(
      allGranted
        ? withoutModule
        : [
            ...withoutModule,
            ...module.menus.map((menu) => ({
              menu_id: menu.menu_id,
              actions: allActionIds(menu),
              is_configuration_only: 0,
            })),
          ],
    );
  };

  // Grants/clears every menu in every module at once — the module-level
  // "Select all" checkboxes only cover their own module, so with several
  // modules an admin granting a full profile still had to click each one.
  const allModulesGranted =
    modules.length > 0 &&
    modules.every((module) =>
      module.menus.every(
        (menu) => (grantFor(menu.menu_id)?.actions?.length ?? 0) === allActionIds(menu).length,
      ),
    );
  const toggleSelectAllModules = () => {
    onChange(
      allModulesGranted
        ? []
        : modules.flatMap((module) =>
            module.menus.map((menu) => ({
              menu_id: menu.menu_id,
              actions: allActionIds(menu),
              is_configuration_only: 0,
            })),
          ),
    );
  };

  const filteredModules = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return modules;
    return modules
      .map((module) => ({
        ...module,
        menus: module.menus.filter((menu) => menu.menu_name?.toLowerCase().includes(q)),
      }))
      .filter(
        (module) => module.moduleName.toLowerCase().includes(q) || module.menus.length > 0,
      );
  }, [modules, query]);

  const visibleModules = readOnly
    ? filteredModules
        .map((module) => ({
          ...module,
          menus: module.menus.filter((menu) => isMenuGranted(menu.menu_id)),
        }))
        .filter((module) => module.menus.length > 0)
    : filteredModules;

  if (modules.length === 0) {
    return <p className="text-sm text-slate-400">No menu/action data available to grant.</p>;
  }
  if (readOnly && visibleModules.length === 0) {
    return <p className="text-sm text-slate-400">No permissions granted.</p>;
  }

  // When filtering, auto-expand every matching module so results are
  // immediately visible instead of hidden behind a collapsed header.
  const isOpen = (moduleId) => query.trim() !== "" || openModuleIds.has(moduleId);

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="relative">
          <Search
            size={13}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules or menus…"
            className="w-full rounded-xl border border-slate-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-blue-400"
          />
        </div>
      )}

      {!readOnly && modules.length > 1 && (
        <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-blue-700">
            All modules
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600">
            <input
              type="checkbox"
              checked={allModulesGranted}
              onChange={toggleSelectAllModules}
              className="h-3.5 w-3.5 accent-blue-600"
            />
            Select all
          </span>
        </label>
      )}

      <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
        {visibleModules.map((module) => {
          const allGranted =
            !readOnly &&
            module.menus.length > 0 &&
            module.menus.every(
              (menu) => (grantFor(menu.menu_id)?.actions?.length ?? 0) === allActionIds(menu).length,
            );
          const grantedCount = module.menus.filter((menu) => isMenuGranted(menu.menu_id)).length;
          return (
            <div key={module.moduleId} className="rounded-xl border border-slate-100">
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => toggleModuleOpen(module.moduleId)}
                  className="flex min-w-0 items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-500"
                >
                  {isOpen(module.moduleId) ? (
                    <ChevronDown size={13} className="shrink-0" />
                  ) : (
                    <ChevronRight size={13} className="shrink-0" />
                  )}
                  <span className="truncate">{module.moduleName}</span>
                  {readOnly ? (
                    <span className="font-normal normal-case text-slate-400">
                      ({module.menus.length})
                    </span>
                  ) : (
                    <span className="font-normal normal-case text-slate-400">
                      ({grantedCount}/{module.menus.length})
                    </span>
                  )}
                </button>
                {!readOnly && (
                  <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-blue-600">
                    <input
                      type="checkbox"
                      checked={allGranted}
                      onChange={() => toggleModuleSelectAll(module)}
                      className="h-3.5 w-3.5 accent-blue-600"
                    />
                    Select all
                  </label>
                )}
              </div>

              {isOpen(module.moduleId) && (
                <div className="space-y-1.5 border-t border-slate-100 p-3">
                  {module.menus.map((menu) => {
                    const grant = grantFor(menu.menu_id);
                    const granted = isMenuGranted(menu.menu_id);
                    return (
                      <div
                        key={menu.menu_id}
                        className={cn(
                          "rounded-lg border px-3 py-2 transition-colors",
                          granted ? "border-blue-200 bg-blue-50/40" : "border-slate-100",
                        )}
                      >
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={granted}
                            disabled={readOnly}
                            onChange={() => toggleMenuRow(menu)}
                            className="h-4 w-4 shrink-0 accent-blue-600"
                          />
                          <span className="text-xs font-semibold text-slate-700">
                            {menu.menu_name}
                          </span>
                        </label>

                        {granted && (
                          <div className="mt-2 flex flex-wrap items-center gap-3 pl-6">
                            {(menu.actions || []).map((action) => {
                              const active = !!grant?.actions.includes(action.action_id);
                              return (
                                <label
                                  key={action.action_id}
                                  className={cn(
                                    "flex items-center gap-1.5 text-[11px] font-medium",
                                    readOnly ? "text-slate-500" : "cursor-pointer text-slate-600",
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={active}
                                    disabled={readOnly}
                                    onChange={() => toggleAction(menu, action.action_id)}
                                    className="h-3.5 w-3.5 accent-blue-600"
                                  />
                                  {action.action_name}
                                </label>
                              );
                            })}
                            {!readOnly && (
                              <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-slate-400">
                                <input
                                  type="checkbox"
                                  checked={!!grant?.is_configuration_only}
                                  onChange={() =>
                                    onChange(
                                      selected.map((g) =>
                                        g.menu_id === menu.menu_id
                                          ? { ...g, is_configuration_only: g.is_configuration_only ? 0 : 1 }
                                          : g,
                                      ),
                                    )
                                  }
                                  className="h-3.5 w-3.5 accent-blue-600"
                                />
                                Configuration only
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
