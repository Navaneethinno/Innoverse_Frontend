import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, LayoutGrid, RefreshCw, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/Components/Common/Button";
import { useAuth } from "../../Hooks/useAuth";
import { DashboardGrid } from "./layout/DashboardGrid";
import { useDashboardLayout } from "./layout/useDashboardLayout";
import { DashboardDataContext, isHidden, useDashboardSummary } from "./layout/dashboardData";
import { WIDGET_REGISTRY } from "./layout/widgetRegistry";

// Control Space: a customizable widget dashboard. One summary call brings
// the saved layout and every widget's data (layout/dashboardData); a widget
// the user may not see comes back unavailable and is hidden.
//
//   ControlSpacePage        header + "Customize layout"/"Done" toggle
//   layout/widgetRegistry   id -> component, default size
//   layout/gridLayout       saved layout <-> grid items (pure helpers)
//   layout/useDashboardLayout  per-user saved places and sizes (server only)
//   layout/DashboardGrid    react-grid-layout: drag, resize, drop preview
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
  const summary = useDashboardSummary();
  const { layout, setLayout, resetLayout } = useDashboardLayout(currentUser, summary.layout);
  const visibleIds = useMemo(() => new Set(Object.keys(WIDGET_REGISTRY).filter((id) => !isHidden(summary.widgets, id))), [summary.widgets]);
  const [editing, setEditing] = useState(false);

  // Esc leaves customize mode.
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
          {!editing && (
            <Button variant="secondary" size="sm" disabled={summary.loading} onClick={() => void summary.refresh(Object.keys(WIDGET_REGISTRY))}>
              <RefreshCw size={13} className={summary.loading ? "animate-spin" : ""} /> {t("refresh")}
            </Button>
          )}
          {editing && layout && (
            <Button variant="secondary" size="sm" icon={RotateCcw} onClick={resetLayout}>
              {t("resetLayout")}
            </Button>
          )}
          <Button variant={editing ? "primary" : "outline"} size="sm" icon={editing ? Check : LayoutGrid} aria-pressed={editing} onClick={() => setEditing((v) => !v)} className="hidden lg:inline-flex">
            {editing ? t("done") : t("customizeLayout")}
          </Button>
        </div>
      </motion.div>

      <DashboardDataContext.Provider value={summary}>
        {layout ? (
          <DashboardGrid layout={layout} visibleIds={visibleIds} setLayout={setLayout} editing={editing} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted/60" />
            ))}
          </div>
        )}
      </DashboardDataContext.Provider>
    </div>
  );
}
