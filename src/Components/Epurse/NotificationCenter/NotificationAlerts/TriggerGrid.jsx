import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { triggerKey } from "./useAlertOptions";

// Tri-state checkbox: checked, unchecked, or partly (indeterminate).
function Tick({ state, onChange, label }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      title={label}
      checked={state === "all"}
      ref={(el) => {
        if (el) el.indeterminate = state === "some";
      }}
      onChange={onChange}
      className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
    />
  );
}

const stateOf = (keys, selected) => {
  const on = keys.filter((k) => selected.has(k)).length;
  return on === 0 ? "none" : on === keys.length ? "all" : "some";
};

// Menu x action grid for an alert's triggers, with select-all per column
// (action), per row (menu) and overall. Select-alls act on the menus the
// search currently shows. `groups` is [[parentName, menus[]], ...].
export function TriggerGrid({ groups, selected, onChange }) {
  const { t } = useTranslation("notification");

  // Every action any menu offers, as columns, in backend action_id order.
  const columns = useMemo(() => {
    const byId = new Map();
    for (const [, menus] of groups) for (const m of menus) for (const a of m.actions ?? []) byId.set(a.action_id, a.action_name);
    return [...byId.entries()].sort((a, b) => a[0] - b[0]).map(([id, name]) => ({ id, name }));
  }, [groups]);

  const menus = groups.flatMap(([, list]) => list);
  const keysOf = (menu) => (menu.actions ?? []).map((a) => triggerKey(menu.menu_id, a.action_id));
  const columnKeys = (actionId) => menus.filter((m) => (m.actions ?? []).some((a) => a.action_id === actionId)).map((m) => triggerKey(m.menu_id, actionId));
  const allKeys = menus.flatMap(keysOf);

  // Turn a set of keys all on, or all off when they're already all on.
  const toggle = (keys) => {
    const next = new Set(selected);
    const turnOff = keys.length > 0 && keys.every((k) => next.has(k));
    for (const k of keys) {
      if (turnOff) next.delete(k);
      else next.add(k);
    }
    onChange(next);
  };

  if (!menus.length) return null;

  const cell = "px-2 py-2 text-center";
  return (
    <div className="mt-3 max-h-96 overflow-auto rounded-xl border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_var(--border)]">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-bold text-muted-foreground">{t("menu")}</th>
            <th className={cell}>
              <label className="flex flex-col items-center gap-1 text-[11px] font-bold text-primary">
                {t("all")}
                <Tick state={stateOf(allKeys, selected)} onChange={() => toggle(allKeys)} label={t("selectAll")} />
              </label>
            </th>
            {columns.map((col) => (
              <th key={col.id} className={cell}>
                <label className="flex flex-col items-center gap-1 whitespace-nowrap text-[11px] font-bold text-slate-600">
                  {col.name}
                  <Tick state={stateOf(columnKeys(col.id), selected)} onChange={() => toggle(columnKeys(col.id))} label={t("selectAllAction", { action: col.name })} />
                </label>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map(([parent, list]) => [
            parent && (
              <tr key={`p:${parent}`} className="border-t bg-primary-light/50">
                <td colSpan={columns.length + 2} className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {parent}
                </td>
              </tr>
            ),
            ...list.map((menu) => {
              const rowKeys = keysOf(menu);
              return (
                <tr key={menu.menu_id} className="border-t hover:bg-primary-light/40">
                  <td className="px-3 py-2 font-semibold text-slate-700">{menu.menu_name}</td>
                  <td className={cell}>
                    <Tick state={stateOf(rowKeys, selected)} onChange={() => toggle(rowKeys)} label={t("selectAllMenu", { menu: menu.menu_name })} />
                  </td>
                  {columns.map((col) => {
                    const has = (menu.actions ?? []).some((a) => a.action_id === col.id);
                    const key = triggerKey(menu.menu_id, col.id);
                    return (
                      <td key={col.id} className={cell}>
                        {has ? (
                          <Tick state={selected.has(key) ? "all" : "none"} onChange={() => toggle([key])} label={`${menu.menu_name} · ${col.name}`} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            }),
          ])}
        </tbody>
      </table>
    </div>
  );
}
