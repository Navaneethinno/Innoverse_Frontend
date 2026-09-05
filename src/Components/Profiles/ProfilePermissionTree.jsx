import { useMemo } from "react";
import { useSelector } from "react-redux";

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

// selected: array of {menu_id, actions: [action_id...], is_configuration_only}
// readOnly: renders the same grant chips without any click handlers, for a
// view-only display (e.g. the Profiles "View" action) instead of a second,
// duplicated read-only tree component.
export function ProfilePermissionTree({ selected, onChange, readOnly = false }) {
  const modules = useMenuTreeSource();
  const grantFor = (menuId) => selected.find((g) => g.menu_id === menuId);

  const toggleAction = (menuId, actionId) => {
    const existing = grantFor(menuId);
    if (!existing) {
      onChange([...selected, { menu_id: menuId, actions: [actionId], is_configuration_only: 0 }]);
      return;
    }
    const hasAction = existing.actions.includes(actionId);
    const nextActions = hasAction
      ? existing.actions.filter((a) => a !== actionId)
      : [...existing.actions, actionId];
    if (nextActions.length === 0) {
      onChange(selected.filter((g) => g.menu_id !== menuId));
    } else {
      onChange(
        selected.map((g) => (g.menu_id === menuId ? { ...g, actions: nextActions } : g)),
      );
    }
  };

  if (modules.length === 0) {
    return <p className="text-sm text-slate-400">No menu/action data available to grant.</p>;
  }

  const visibleModules = readOnly
    ? modules.filter((module) =>
        module.menus.some((menu) => (grantFor(menu.menu_id)?.actions?.length ?? 0) > 0),
      )
    : modules;

  if (readOnly && visibleModules.length === 0) {
    return <p className="text-sm text-slate-400">No permissions granted.</p>;
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
      {visibleModules.map((module) => (
        <div key={module.moduleId} className="rounded-xl border border-slate-100 p-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
            {module.moduleName}
          </p>
          <div className="space-y-2">
            {module.menus
              .filter((menu) => !readOnly || (grantFor(menu.menu_id)?.actions?.length ?? 0) > 0)
              .map((menu) => {
              const grant = grantFor(menu.menu_id);
              return (
                <div key={menu.menu_id} className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 min-w-[120px]">
                    {menu.menu_name}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(menu.actions || []).map((action) => {
                      const active = !!grant?.actions.includes(action.action_id);
                      if (readOnly) {
                        return active ? (
                          <span
                            key={action.action_id}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 text-white"
                          >
                            {action.action_name}
                          </span>
                        ) : null;
                      }
                      return (
                        <button
                          type="button"
                          key={action.action_id}
                          onClick={() => toggleAction(menu.menu_id, action.action_id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                            active
                              ? "bg-blue-600 text-white border-transparent"
                              : "text-slate-500 border-slate-200 hover:border-blue-300"
                          }`}
                        >
                          {action.action_name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
