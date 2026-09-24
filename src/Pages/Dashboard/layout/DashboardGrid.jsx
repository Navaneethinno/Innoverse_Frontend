import { useTranslation } from "react-i18next";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { SortableWidget } from "./SortableWidget";
import { WIDGET_REGISTRY, clampSpan } from "./widgetRegistry";

// The widget grid: an ordered array of { id, span } rendered into a
// 4-column CSS grid (1 column below md, spans ignored there). Placement is
// ONLY ever an index in that array, so cards can't overlap however fast or
// wherever the pointer moves.
//
// rectSortingStrategy gives the live sliding reflow: while a card is
// dragged over others, they animate out of the way to preview the result,
// continuously, and the dragged card follows the pointer before settling
// into the previewed slot on drop. KeyboardSensor makes the same reorder
// work from the keyboard (Space/Enter to pick up, arrows to move, Space to
// drop, Escape to cancel).
export function DashboardGrid({ layout, setLayout, editing }) {
  const { t } = useTranslation("dashboard");
  const sensors = useSensors(
    // A small distance before a drag starts, so a plain click on the handle
    // doesn't pick the card up.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const nameOf = (id) => t(WIDGET_REGISTRY[id]?.titleKey ?? String(id));
  const positionOf = (id) => layout.findIndex((w) => w.id === id) + 1;

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setLayout((prev) => {
      const from = prev.findIndex((w) => w.id === active.id);
      const to = prev.findIndex((w) => w.id === over.id);
      return from < 0 || to < 0 ? prev : arrayMove(prev, from, to);
    });
  };

  const onToggleSpan = (id) =>
    setLayout((prev) => prev.map((w) => (w.id === id ? { ...w, span: clampSpan(id, w.span === 2 ? 1 : 2) } : w)));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: { draggable: t("dragInstructions") },
        announcements: {
          onDragStart: ({ active }) => t("announcePickedUp", { name: nameOf(active.id), position: positionOf(active.id) }),
          onDragOver: ({ active, over }) =>
            over ? t("announceMovedOver", { name: nameOf(active.id), position: positionOf(over.id) }) : undefined,
          onDragEnd: ({ active, over }) =>
            over ? t("announceDropped", { name: nameOf(active.id), position: positionOf(over.id) }) : t("announceCancelled", { name: nameOf(active.id) }),
          onDragCancel: ({ active }) => t("announceCancelled", { name: nameOf(active.id) }),
        },
      }}
    >
      <SortableContext items={layout.map((w) => w.id)} strategy={rectSortingStrategy}>
        {/* Extra row gap while editing leaves room for each card’s control pill. */}
        <div className={`grid grid-cols-1 gap-x-4 md:grid-cols-4 ${editing ? "gap-y-9 pt-3" : "gap-y-4"}`}>
          {layout.map((w) => (
            <SortableWidget key={w.id} id={w.id} span={w.span} editing={editing} onToggleSpan={onToggleSpan} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
