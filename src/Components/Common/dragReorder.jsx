import { useState } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// `list` with the item at `from` moved to `to`.
export function moveItem(list, from, to) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// Drag-and-drop reordering for a list that also keeps its up/down buttons.
// The row is picked up by its grip only (inputs inside a row stay usable);
// the row being dragged fades and the drop target shows a line on the side
// the row will land (left/right with `horizontal`, for a row of chips).
// onMove(from, to) gets the indexes.
export function useDragReorder(onMove, { horizontal = false } = {}) {
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const end = () => {
    setDrag(null);
    setOver(null);
  };
  return {
    gripProps: (index) => ({
      draggable: true,
      onDragStart: (e) => {
        setDrag(index);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
        const row = e.currentTarget.closest("[data-drag-row]");
        if (row) e.dataTransfer.setDragImage(row, 24, 20);
      },
      onDragEnd: end,
    }),
    rowProps: (index) => ({
      "data-drag-row": "",
      onDragOver: (e) => {
        if (drag === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (over !== index) setOver(index);
      },
      onDrop: (e) => {
        e.preventDefault();
        if (drag !== null && drag !== index) onMove(drag, index);
        end();
      },
    }),
    rowClass: (index) =>
      cn(
        "transition-[opacity,box-shadow] duration-150",
        drag === index && "opacity-40",
        drag !== null &&
          over === index &&
          drag !== index &&
          (horizontal
            ? drag < index
              ? "shadow-[3px_0_0_0_var(--primary)]"
              : "shadow-[-3px_0_0_0_var(--primary)]"
            : drag < index
              ? "shadow-[0_3px_0_0_var(--primary)]"
              : "shadow-[0_-3px_0_0_var(--primary)]"),
      ),
  };
}

export function DragGrip({ label, ...props }) {
  return (
    <span
      {...props}
      role="button"
      aria-label={label}
      title={label}
      className="flex cursor-grab touch-none items-center rounded-md p-1 text-slate-400 hover:bg-muted hover:text-slate-600 active:cursor-grabbing"
    >
      <GripVertical size={14} />
    </span>
  );
}
