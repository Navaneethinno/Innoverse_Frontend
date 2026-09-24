import { useTranslation } from "react-i18next";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";
import { WIDGET_REGISTRY, maxSpanOf, minSpanOf } from "./widgetRegistry";

// One grid slot. Knows nothing about what it renders: it looks the widget up
// in the registry by id. While `editing`, a grip handle (the ONLY drag
// activator, so charts/buttons inside stay clickable) and a width toggle
// appear; outside edit mode the slot is inert (useSortable disabled).
export function SortableWidget({ id, span, editing, onToggleSpan }) {
  const { t } = useTranslation("dashboard");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !editing,
  });
  const widget = WIDGET_REGISTRY[id];
  if (!widget) return null;
  const Widget = widget.component;
  const title = t(widget.titleKey);
  const resizable = minSpanOf(id) !== maxSpanOf(id);

  return (
    <div
      ref={setNodeRef}
      // Translate, not Transform: cards of different widths must slide,
      // never stretch/squash into each other's size while reflowing.
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 30 : undefined }}
      className={cn(
        "relative min-w-0",
        span === 2 ? "md:col-span-2" : "md:col-span-1",
        editing && "rounded-2xl outline-2 outline-offset-2 outline-dashed outline-[var(--primary-light)]",
        isDragging && "opacity-90 shadow-2xl outline-[var(--primary)]",
      )}
    >
      <Widget />
      {editing && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
          {resizable && (
            <button
              type="button"
              onClick={() => onToggleSpan(id)}
              aria-label={t(span === 2 ? "narrowWidget" : "widenWidget", { name: title })}
              title={t(span === 2 ? "narrowWidget" : "widenWidget", { name: title })}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm hover:text-primary"
            >
              {span === 2 ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={t("dragWidget", { name: title })}
            title={t("dragWidget", { name: title })}
            className={cn(
              "flex h-8 w-8 touch-none items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-[var(--primary)]",
              isDragging ? "cursor-grabbing" : "cursor-grab",
            )}
          >
            <GripVertical size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
