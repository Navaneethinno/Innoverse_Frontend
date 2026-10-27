import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn } from "@/Utils/Lib/cn";
import { masterApi } from "@/Services/Master/master.api";
import { menuLabel, moduleLabel } from "@/Pages/Sidebar/menuLabels";
import { useTranslation } from "react-i18next";

// Actions always in the same order (unknown ones last, by name), so the
// same action sits in the same place on every menu row.
const ACTION_ORDER = ["view", "add", "edit", "delete", "change status", "authorise", "authorize", "self"];
const actionRank = (name) => {
  const i = ACTION_ORDER.indexOf(String(name ?? "").trim().toLowerCase());
  return i === -1 ? ACTION_ORDER.length : i;
};
const byActionOrder = (a, b) => actionRank(a.action_name) - actionRank(b.action_name) || String(a.action_name).localeCompare(String(b.action_name));

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
const numericId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// Profile grants must be built from master menu/action relations, not from
// the current user's sidebar permissions. A sidebar action can be permitted
// for the current user while still being invalid for a different menu.
function useMenuTreeSource() {
  const [source, setSource] = useState({ modules: [], isLoading: true, error: null });
  const load = useCallback(async () => {
    setSource((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const [rawModules, rawMenus, rawRelations, rawActions] = await Promise.all([
        masterApi.moduleList(),
        masterApi.menuList(),
        masterApi.menuActionList(),
        masterApi.actionList(),
      ]);
      const actionNames = new Map(
        rawActions
          .map((action) => [numericId(action?.action_id ?? action?.id), action?.action_name ?? action?.name])
          .filter(([id]) => id != null),
      );
      const actionsByMenu = new Map();
      rawRelations.forEach((relation) => {
        const menuId = numericId(relation?.menu_id ?? relation?.menu?.id);
        // The relation's `id` identifies the menu_action row, not an action.
        const actionId = numericId(relation?.action_id ?? relation?.action?.id);
        if (!menuId || !actionId) return;
        const current = actionsByMenu.get(menuId) ?? [];
        if (!current.some((action) => action.action_id === actionId)) {
          current.push({
            action_id: actionId,
            action_name: relation?.action_name ?? relation?.action?.name ?? actionNames.get(actionId) ?? `Action #${actionId}`,
          });
        }
        actionsByMenu.set(menuId, current);
      });
      const moduleNames = new Map(
        rawModules.map((module) => [numericId(module?.module_id ?? module?.id), moduleLabel(module) ?? module?.name]),
      );
      const menusByModule = new Map();
      rawMenus.forEach((menu) => {
        const menuId = numericId(menu?.menu_id ?? menu?.id);
        const moduleId = numericId(menu?.module_id);
        const actions = actionsByMenu.get(menuId) ?? [];
        if (!menuId || !moduleId || actions.length === 0) return;
        if (!menusByModule.has(moduleId)) menusByModule.set(moduleId, []);
        menusByModule.get(moduleId).push({
          menu_id: menuId,
          menu_name: menuLabel(menu) ?? menu?.name ?? `Menu #${menuId}`,
          actions: [...actions].sort(byActionOrder),
        });
      });
      const modules = Array.from(menusByModule.entries())
        .map(([moduleId, menus]) => ({
          moduleId,
          moduleName: moduleNames.get(moduleId) ?? `Module #${moduleId}`,
          menus: menus.sort((a, b) => a.menu_name.localeCompare(b.menu_name, undefined, { sensitivity: "base" })),
        }))
        .sort((a, b) => a.moduleName.localeCompare(b.moduleName, undefined, { sensitivity: "base" }));
      setSource({ modules, isLoading: false, error: null });
    } catch (error) {
      setSource({
        modules: [],
        isLoading: false,
        error: error instanceof Error ? error : new Error("Failed to load menu permissions"),
      });
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return { ...source, refetch: load };
}

function allActionIds(menu) {
  return (menu.actions || []).map((a) => a.action_id);
}

function normalizeGrants(grants, modules) {
  const validActionsByMenu = new Map(
    modules.flatMap((module) =>
      module.menus.map((menu) => [menu.menu_id, new Set(allActionIds(menu))]),
    ),
  );
  return (Array.isArray(grants) ? grants : []).flatMap((grant) => {
    const menuId = numericId(grant?.menu_id);
    const validActions = validActionsByMenu.get(menuId);
    if (!menuId || !validActions) return [];
    const actions = [...new Set((grant?.actions ?? []).map(numericId).filter((id) => id && validActions.has(id)))];
    return actions.length > 0
      ? [{ menu_id: menuId, actions, is_configuration_only: grant?.is_configuration_only ? 1 : 0 }]
      : [];
  });
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
  const { t } = useTranslation();
  const { modules, isLoading, error, refetch } = useMenuTreeSource();
  const [query, setQuery] = useState("");
  const [openModuleIds, setOpenModuleIds] = useState(() => new Set());
  const grants = useMemo(() => normalizeGrants(selected, modules), [selected, modules]);
  const selectedKey = JSON.stringify(selected ?? []);
  const grantsKey = JSON.stringify(grants);
  const commit = (nextGrants) => onChange(normalizeGrants(nextGrants, modules));

  useEffect(() => {
    if (!isLoading && selectedKey !== grantsKey) onChange(grants);
  }, [isLoading, selectedKey, grantsKey, grants, onChange]);

  // Editing a profile: its modules (those holding a granted menu) open
  // already selected, once the tree has loaded.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || isLoading || readOnly || grants.length === 0) return;
    opened.current = true;
    const granted = new Set(grants.map((g) => g.menu_id));
    setOpenModuleIds(new Set(modules.filter((m) => m.menus.some((menu) => granted.has(menu.menu_id))).map((m) => m.moduleId)));
  }, [isLoading, readOnly, grants, modules]);

  const grantFor = (menuId) => grants.find((grant) => grant.menu_id === menuId);
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
      commit(grants.filter((grant) => grant.menu_id !== menu.menu_id));
      return;
    }
    const existing = grantFor(menu.menu_id);
    if (!existing) {
      commit([
        ...grants,
        { menu_id: menu.menu_id, actions: actionIds, is_configuration_only: 0 },
      ]);
    } else {
      commit(
        grants.map((grant) => (grant.menu_id === menu.menu_id ? { ...grant, actions: actionIds } : grant)),
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
    const withoutModule = grants.filter(
      (g) => !module.menus.some((menu) => menu.menu_id === g.menu_id),
    );
    commit(
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
    commit(
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

  // A column: one action across many menus. All of them hold it → it is
  // taken off each (a menu left with nothing drops out); otherwise every
  // menu that has the action gets it.
  const columnsOf = (menus) => {
    const byId = new Map();
    menus.forEach((menu) => menu.actions.forEach((a) => byId.has(a.action_id) || byId.set(a.action_id, a)));
    return [...byId.values()].sort(byActionOrder);
  };
  const holders = (menus, actionId) => menus.filter((menu) => menu.actions.some((a) => a.action_id === actionId));
  const columnOn = (menus, actionId) => {
    const list = holders(menus, actionId);
    return list.length > 0 && list.every((menu) => grantFor(menu.menu_id)?.actions.includes(actionId));
  };
  const toggleColumn = (menus, actionId) => {
    const ids = new Set(holders(menus, actionId).map((m) => m.menu_id));
    const on = columnOn(menus, actionId);
    const next = grants.map((g) =>
      ids.has(g.menu_id)
        ? { ...g, actions: on ? g.actions.filter((a) => a !== actionId) : [...new Set([...g.actions, actionId])] }
        : g,
    );
    if (!on)
      ids.forEach((id) => {
        if (!next.some((g) => g.menu_id === id)) next.push({ menu_id: id, actions: [actionId], is_configuration_only: 0 });
      });
    commit(next.filter((g) => g.actions.length > 0));
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

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t("profiles:loadingAvailableMenuActions")}</p>;
  }
  if (error) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
        <span>{error.message}</span>
        <button type="button" onClick={() => void refetch()} className="text-xs font-bold underline">
          {t("profiles:retry")}
        </button>
      </div>
    );
  }
  if (modules.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("profiles:noValidMenuActionDataIsAvailable")}</p>;
  }
  if (readOnly && visibleModules.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("profiles:noPermissionsGranted")}</p>;
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
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("profiles:searchModulesOrMenus")}
            className="w-full rounded-xl border border-border py-2 pl-8 pr-3 text-sm outline-none focus:border-[var(--primary)]"
          />
        </div>
      )}

      {!readOnly && modules.length > 1 && (
        <label
          className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2"
          style={{ borderColor: "var(--primary-light)", background: "var(--primary-light)" }}
        >
          <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--primary)" }}>
            {t("profiles:allModules")}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "var(--primary)" }}>
            <input
              type="checkbox"
              checked={allModulesGranted}
              onChange={toggleSelectAllModules}
              className="h-3.5 w-3.5"
              style={{ accentColor: "var(--primary)" }}
            />
            {t("profiles:selectAll")}
          </span>
        </label>
      )}

      {!readOnly && visibleModules.length > 0 && (
        <div className="rounded-xl border border-border px-3 py-2">
          <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">{t("profiles:wholeColumn")}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {columnsOf(visibleModules.flatMap((m) => m.menus)).map((a) => {
              const menus = visibleModules.flatMap((m) => m.menus);
              const on = columnOn(menus, a.action_id);
              return (
                <button
                  key={a.action_id}
                  type="button"
                  onClick={() => toggleColumn(menus, a.action_id)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors",
                    on ? "border-[var(--primary)] bg-white text-slate-700" : "border-dashed border-border text-muted-foreground hover:border-[var(--primary)]",
                  )}
                >
                  {on ? <Check size={11} className="shrink-0 text-[var(--primary)]" strokeWidth={3} /> : <span className="h-[11px] w-[11px] shrink-0" />}
                  {a.action_name}
                </button>
              );
            })}
          </div>
        </div>
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
            <div key={module.moduleId} className="rounded-xl border border-border">
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => toggleModuleOpen(module.moduleId)}
                  className="flex min-w-0 items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground"
                >
                  {isOpen(module.moduleId) ? (
                    <ChevronDown size={13} className="shrink-0" />
                  ) : (
                    <ChevronRight size={13} className="shrink-0" />
                  )}
                  <span className="truncate">{module.moduleName}</span>
                  {readOnly ? (
                    <span className="font-normal normal-case text-muted-foreground">
                      ({module.menus.length})
                    </span>
                  ) : (
                    <span className="font-normal normal-case text-muted-foreground">
                      ({grantedCount}/{module.menus.length})
                    </span>
                  )}
                </button>
                {!readOnly && (
                  <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] font-semibold" style={{ color: "var(--primary)" }}>
                    <input
                      type="checkbox"
                      checked={allGranted}
                      onChange={() => toggleModuleSelectAll(module)}
                      className="h-3.5 w-3.5"
                      style={{ accentColor: "var(--primary)" }}
                    />
                    {t("profiles:selectAll")}
                  </label>
                )}
              </div>

              {isOpen(module.moduleId) && (
                <div className="overflow-x-auto border-t border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 text-[11px] text-muted-foreground">
                        <th className="px-3 py-2 text-left font-semibold">{t("profiles:menu")}</th>
                        {columnsOf(module.menus).map((a) => (
                          <th key={a.action_id} className="whitespace-nowrap px-2 py-2 text-center font-semibold">
                            <label className={cn("inline-flex flex-col items-center gap-1", !readOnly && "cursor-pointer")}>
                              {a.action_name}
                              {!readOnly && (
                                <input
                                  type="checkbox"
                                  checked={columnOn(module.menus, a.action_id)}
                                  onChange={() => toggleColumn(module.menus, a.action_id)}
                                  className="h-3.5 w-3.5 accent-[var(--primary)]"
                                />
                              )}
                            </label>
                          </th>
                        ))}
                        {!readOnly && (
                          <th className="whitespace-nowrap px-2 py-2 text-center font-semibold">{t("profiles:configurationOnly")}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {module.menus.map((menu) => {
                        const grant = grantFor(menu.menu_id);
                        const granted = isMenuGranted(menu.menu_id);
                        return (
                          <tr
                            key={menu.menu_id}
                            className="border-t border-border"
                            style={granted ? { background: "var(--primary-light)" } : undefined}
                          >
                            <td className="px-3 py-1.5">
                              <label className="flex cursor-pointer items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={granted}
                                  disabled={readOnly}
                                  onChange={() => toggleMenuRow(menu)}
                                  className="h-4 w-4 shrink-0 accent-[var(--primary)]"
                                />
                                <span className="font-semibold text-slate-700">{menu.menu_name}</span>
                              </label>
                            </td>
                            {columnsOf(module.menus).map((a) => (
                              <td key={a.action_id} className="px-2 py-1.5 text-center">
                                {menu.actions.some((x) => x.action_id === a.action_id) ? (
                                  <input
                                    type="checkbox"
                                    checked={!!grant?.actions.includes(a.action_id)}
                                    disabled={readOnly}
                                    onChange={() => toggleAction(menu, a.action_id)}
                                    aria-label={a.action_name}
                                    className="h-3.5 w-3.5 accent-[var(--primary)]"
                                  />
                                ) : (
                                  <span className="text-muted-foreground/50">—</span>
                                )}
                              </td>
                            ))}
                            {!readOnly && (
                              <td className="px-2 py-1.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={!!grant?.is_configuration_only}
                                  disabled={!granted}
                                  aria-label={t("profiles:configurationOnly")}
                                  onChange={() =>
                                    commit(
                                      grants.map((g) =>
                                        g.menu_id === menu.menu_id
                                          ? { ...g, is_configuration_only: g.is_configuration_only ? 0 : 1 }
                                          : g,
                                      ),
                                    )
                                  }
                                  className="h-3.5 w-3.5 accent-[var(--primary)]"
                                />
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
