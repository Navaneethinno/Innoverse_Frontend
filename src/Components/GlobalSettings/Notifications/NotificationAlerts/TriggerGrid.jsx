import { useMemo } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/Utils/Lib/cn";
import { useTranslation } from "react-i18next";
import { triggerKey } from "./useAlertOptions";

// Tri-state checkbox in the theme's colours: ticked, empty, or partly (dash).
function Tick({ state, onChange, label, size = "md" }) {
  const on = state !== "none";
  const box = size === "sm" ? "h-4 w-4 rounded-[4px]" : "h-[18px] w-[18px] rounded-[5px]";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "some" ? "mixed" : state === "all"}
      aria-label={label}
      title={label}
      onClick={onChange}
      className={cn(
        "inline-flex shrink-0 items-center justify-center border-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        box,
        on ? "border-primary bg-primary text-primary-foreground" : "border-slate-300 bg-card hover:border-primary",
      )}
    >
      {state === "all" && <Check size={12} strokeWidth={3.5} />}
      {state === "some" && <Minus size={12} strokeWidth={3.5} />}
    </button>
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

  const colWidth = "w-[92px]";
  return (
    <div className="mt-3 max-h-[26rem] overflow-auto rounded-xl border bg-card">
      <table className="w-full min-w-[680px] table-fixed border-separate border-spacing-0 text-sm">
        <colgroup>
          <col />
          <col className="w-[72px]" />
          {columns.map((col) => (
            <col key={col.id} className={colWidth} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10">
          <tr className="bg-muted">
            <th className="border-b px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t("menu")}</th>
            <th className="border-b border-l bg-primary-light px-2 py-2">
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-700">{t("all")}</span>
                <Tick size="sm" state={stateOf(allKeys, selected)} onChange={() => toggle(allKeys)} label={t("selectAll")} />
              </div>
            </th>
            {columns.map((col) => (
              <th key={col.id} className="border-b px-1 py-2">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="truncate text-[11px] font-bold text-slate-600" title={col.name}>
                    {col.name}
                  </span>
                  <Tick size="sm" state={stateOf(columnKeys(col.id), selected)} onChange={() => toggle(columnKeys(col.id))} label={t("selectAllAction", { action: col.name })} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map(([parent, list]) => [
            parent && (
              <tr key={`p:${parent}`}>
                <td colSpan={columns.length + 2} className="border-b bg-card px-4 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-wider text-primary">
                  {parent}
                </td>
              </tr>
            ),
            ...list.map((menu) => {
              const rowKeys = keysOf(menu);
              const rowState = stateOf(rowKeys, selected);
              const picked = rowKeys.filter((k) => selected.has(k)).length;
              return (
                <tr key={menu.menu_id} className={cn("group transition-colors", rowState !== "none" ? "bg-primary-light" : "hover:bg-muted")}>
                  <td className="border-b px-4 py-2">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium text-slate-700">{menu.menu_name}</span>
                      {picked > 0 && (
                        <span className="shrink-0 rounded-full bg-primary px-1.5 py-px text-[10px] font-bold text-primary-foreground">
                          {picked}/{rowKeys.length}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="border-b border-l px-2 py-2 text-center">
                    <Tick size="sm" state={rowState} onChange={() => toggle(rowKeys)} label={t("selectAllMenu", { menu: menu.menu_name })} />
                  </td>
                  {columns.map((col) => {
                    const has = (menu.actions ?? []).some((a) => a.action_id === col.id);
                    const key = triggerKey(menu.menu_id, col.id);
                    return (
                      <td key={col.id} className="border-b px-1 py-2 text-center">
                        {has ? (
                          <Tick size="sm" state={selected.has(key) ? "all" : "none"} onChange={() => toggle([key])} label={`${menu.menu_name} · ${col.name}`} />
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
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
