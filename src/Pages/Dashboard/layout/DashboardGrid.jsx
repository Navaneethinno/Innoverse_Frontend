import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Responsive, WidthProvider } from "react-grid-layout";
import { Move } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "./dashboardGrid.css";
import { mergeVisible, reflowItems, toGridItems } from "./gridLayout";
import { GRID_COLS, MAX_SPAN, ROW_HEIGHT, WIDGET_REGISTRY } from "./widgetRegistry";

const ResponsiveGrid = WidthProvider(Responsive);

// The widget grid (react-grid-layout). Each card has a cell position and a
// size. While editing, a card is dragged by its whole surface and the grid
// shows where it will land (the shaded placeholder), moving the others out
// of the way. Cards resize from the right edge, the bottom edge or the
// corner, snapping to whole columns and rows. A narrower grid shows the same cards in
// 2 columns (tablets) or 1 (phones), and editing is off there, so a small
// screen never rewrites the desktop layout.
//
// `layout`: every widget's saved place; `visibleIds`: the ones to draw.
export function DashboardGrid({ layout, visibleIds, setLayout, editing }) {
  const { t } = useTranslation("dashboard");
  const [breakpoint, setBreakpoint] = useState("lg");
  const desktop = breakpoint === "lg";
  const canEdit = editing && desktop;
  const shown = useMemo(() => layout.filter((it) => visibleIds.has(it.id)), [layout, visibleIds]);
  const items = useMemo(() => toGridItems(WIDGET_REGISTRY, shown, { maxSpan: MAX_SPAN, editing: canEdit }), [shown, canEdit]);
  const tablet = useMemo(() => reflowItems(items, 2), [items]);
  const phone = useMemo(() => reflowItems(items, 1), [items]);

  // Saved only when the user finishes a move or resize; changes the grid
  // makes on its own (mount, width changes) are never written back.
  const commit = (next) => {
    if (!canEdit) return;
    const merged = mergeVisible(layout, next);
    if (JSON.stringify(merged) !== JSON.stringify(layout)) setLayout(merged);
  };

  return (
    <ResponsiveGrid
      className={cn("dashboard-grid -mx-2", canEdit && "is-editing")}
      layouts={{ lg: items, md: tablet, sm: phone }}
      breakpoints={{ lg: 860, md: 560, sm: 0 }}
      cols={{ lg: GRID_COLS, md: 2, sm: 1 }}
      rowHeight={ROW_HEIGHT}
      margin={[16, 16]}
      containerPadding={[8, 14]}
      compactType="vertical"
      resizeHandles={["e", "s", "se"]}
      draggableCancel="button, a, input, select, textarea"
      onBreakpointChange={setBreakpoint}
      onDragStop={commit}
      onResizeStop={commit}
    >
      {items.map((it) => {
        const widget = WIDGET_REGISTRY[it.i];
        const Widget = widget.component;
        return (
          <div key={it.i} className="dashboard-cell">
            <Widget />
            {canEdit && (
              <span className="dashboard-move-hint" aria-hidden>
                <Move size={11} /> {t(widget.titleKey)}
              </span>
            )}
          </div>
        );
      })}
    </ResponsiveGrid>
  );
}
