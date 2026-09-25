import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, LayoutGrid, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../../Hooks/useAuth";
import { DashboardGrid } from "./layout/DashboardGrid";
import { useDashboardLayout } from "./layout/useDashboardLayout";

// Control Space: a customizable widget dashboard. Static dummy data only (no
// API — see widgets/dummyData.js), so it always renders instantly.
//
//   ControlSpacePage        header + "Customize layout"/"Done" toggle
//   layout/widgetRegistry   id -> component, default/min/max span
//   layout/useDashboardLayout  per-user saved order + widths (localStorage)
//   layout/DashboardGrid    dnd-kit context + sortable 4-column grid
//   layout/SortableWidget   one slot: drag handle, width toggle
//   widgets/*               the widgets themselves
// Greeting follows the viewer’s local clock rather than always saying
// “Good morning”.
function greetingKey(hour = new Date().getHours()) {
  if (hour < 12) return "goodMorning";
  if (hour < 17) return "goodAfternoon";
  return "goodEvening";
}

export function ControlSpacePage() {
  const { t } = useTranslation("dashboard");
  const currentUser = useAuth((s) => s.user);
  const { layout, setLayout, resetLayout } = useDashboardLayout(currentUser?.username);
  const [editing, setEditing] = useState(false);

  // Esc leaves customize mode. dnd-kit’s keyboard sensor also uses Esc to
  // cancel a drag and marks that event handled, so a cancel doesn’t exit.
  useEffect(() => {
    if (!editing) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !e.defaultPrevented) setEditing(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);

  return (
    <div className="pt-4 pb-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-6 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--primary)" }}>
            {t("controlSpace")}
          </p>
          <h1 className="text-2xl font-black leading-none tracking-tight text-slate-800">
            {t(greetingKey(), { name: currentUser?.username ?? t("admin") })}
          </h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">
            {editing ? t("customizeHint") : t("workspaceSummary")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editing && (
            <button
              type="button"
              onClick={resetLayout}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:text-primary"
            >
              <RotateCcw size={13} /> {t("resetLayout")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-pressed={editing}
            className={
              editing
                ? "flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-md transition-all hover:bg-[var(--primary-hover)]"
                : "flex items-center gap-1.5 rounded-xl border bg-card px-4 py-2 text-xs font-bold transition-colors hover:bg-[var(--primary-light)]"
            }
            style={
              editing
                ? undefined
                : { color: "var(--primary)", borderColor: "var(--primary-light)" }
            }
          >
            {editing ? <Check size={14} /> : <LayoutGrid size={14} />}
            {editing ? t("done") : t("customizeLayout")}
          </button>
        </div>
      </motion.div>

      <DashboardGrid layout={layout} setLayout={setLayout} editing={editing} />
    </div>
  );
}
