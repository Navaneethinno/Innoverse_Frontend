import { forwardRef, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { ArrowRight, Lock, Search, X } from "lucide-react";
import { useGoTo, useMenuLabelOf } from "@/Components/Layout/Menu/goTo";
import { menuLabel } from "@/Components/Layout/Menu/menuLabels";
import { menuPage } from "@/Components/Layout/Menu/menuRouteMap";
import { useSetup, needText } from "@/Hooks/useSetup";

const norm = (s) => String(s ?? "").toLowerCase();

// Search over the menus (the tree below filters, every module). Besides it
// (Admin_33 B8): Enter opens the first match through goTo; a menu's parts
// (Form Builder > Sections) are results too; with an empty box, each setup
// guide's next step. A locked result says what it needs.
export const SidebarSearch = forwardRef(function SidebarSearch({ value, onChange, onClear, isCollapsed }, ref) {
  const { t } = useTranslation(["sidebar", "setup", "common"]);
  const menus = useSelector((state) => state.menu.menuArray);
  const setup = useSetup();
  const goTo = useGoTo();
  const labelOf = useMenuLabelOf();
  const [focused, setFocused] = useState(false);
  const q = norm(value).trim();

  const active = useMemo(() => (menus ?? []).filter((m) => m?.status === 1), [menus]);
  const leaves = useMemo(() => {
    const parents = new Set(active.map((m) => String(m.parent_menu_id ?? "")));
    return active.filter((m) => !parents.has(String(m.menu_id)));
  }, [active]);

  // Matching menus, and each matching part of a multi-part menu.
  const results = useMemo(() => {
    if (!q) return [];
    const out = [];
    for (const m of leaves) {
      const label = menuLabel(m);
      if (norm(label).includes(q) || norm(m.menu_name).includes(q)) out.push({ target: { menu_id: m.menu_id, module_name: m.module_name }, label, module: m.module_label || m.module_name, menuId: m.menu_id });
      for (const v of menuPage(m).views ?? []) {
        const partLabel = t(`setup:part_${v.key}`, { defaultValue: t(`common:view_${v.key}`, { defaultValue: v.key }) });
        const full = `${label} › ${partLabel}`;
        if (norm(partLabel).includes(q) || (norm(label).includes(q) && q.length > 2))
          out.push({ target: { menu_id: m.menu_id, module_name: m.module_name, part: v.key }, label: full, module: m.module_label || m.module_name, menuId: m.menu_id, part: v.key });
      }
    }
    return out.slice(0, 12);
  }, [q, leaves, t]);

  // Empty box: the next step of each setup guide.
  const nextSteps = useMemo(
    () =>
      setup.flows
        .filter((f) => !f.complete && f.next)
        .map((f) => ({ target: { menu_id: f.next.menu_id, part: f.next.part }, label: [labelOf(f.next.menu_id), f.next.part ? f.next.title : null].filter(Boolean).join(" › ") || f.next.title, module: f.title, menuId: f.next.menu_id, part: f.next.part })),
    [setup.flows, labelOf],
  );

  const lockOf = (r) => {
    const state = setup.stateOf(r.menuId, r.part);
    if (state !== "LOCKED") return null;
    const needs = (r.part ? setup.partOf(r.menuId, r.part)?.needs : setup.menuOf(r.menuId)?.needs) ?? [];
    return t("setup:lockedNeeds", { list: needs.filter((n) => n.required).map(needText).join(", ") });
  };
  const open = (r) => {
    goTo(r.target, { label: r.label });
    onClear?.();
  };
  const shown = q ? results : focused ? nextSteps : [];

  if (isCollapsed) return null;
  return (
    <div className="relative px-2">
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={ref}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && shown[0]) {
              event.preventDefault();
              open(shown[0]);
            }
          }}
          placeholder={t("searchMenuPlaceholder")}
          className="w-full pl-7 pr-6 py-1.5 rounded-lg text-[11px] text-slate-700 bg-muted border border-border outline-none focus:border-[var(--primary)]"
        />
        {value && (
          <button type="button" onClick={onClear} aria-label={t("clearSearch")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-600">
            <X size={12} />
          </button>
        )}
      </div>
      {focused && shown.length > 0 && (
        <ul className="absolute left-2 right-2 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-[var(--popover)] p-1 shadow-lg">
          {!q && <li className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("setup:setupGuides")}</li>}
          {shown.map((r, i) => {
            const lock = lockOf(r);
            return (
              <li key={`${r.menuId}:${r.part ?? ""}:${i}`}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => open(r)} className="flex w-full items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] hover:bg-muted">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-700">{r.label}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {r.module}
                      {lock && (
                        <>
                          {" · "}
                          <Lock size={9} className="inline" /> {lock}
                        </>
                      )}
                    </span>
                  </span>
                  {i === 0 && <ArrowRight size={11} className="mt-0.5 shrink-0 text-muted-foreground" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
