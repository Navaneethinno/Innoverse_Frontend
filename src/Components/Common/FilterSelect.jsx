import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// A styled dropdown to replace bare native <select> filters, which render
// with the browser's own unstyled popup (plain white background, default
// blue highlight) regardless of any className applied to the <select>
// itself — no CSS reaches that native list. This renders the options as a
// themed floating panel instead, matching ModuleDropdown's popover style.
//
// The panel is portaled to document.body and positioned with fixed
// coordinates computed from the trigger button's own bounding rect, rather
// than living inside this component's DOM position with `position:
// absolute`. A FilterSelect this close to the bottom of a scrollable card
// (e.g. DataTable's "Show entries" control, which sits inside the glass
// wrapper's own `overflow-hidden`) would otherwise have its dropdown
// silently clipped by that ancestor — same reason a native <select>'s
// popup never had this problem: it renders in the browser's own top-level
// layer, not inside any element's box. Flips to open upward when there
// isn't enough room below in the viewport.
export function FilterSelect({ value, onChange, options, className, panelClassName, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState(null);
  const containerRef = useRef(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    const PANEL_MAX_HEIGHT = 224; // matches max-h-56 below
    const GAP = 6;
    function updatePosition() {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < PANEL_MAX_HEIGHT && rect.top > spaceBelow;
      setPlacement({
        left: rect.left,
        width: rect.width,
        top: openUpward ? undefined : rect.bottom + GAP,
        bottom: openUpward ? window.innerHeight - rect.top + GAP : undefined,
        maxHeight: Math.min(PANEL_MAX_HEIGHT, (openUpward ? rect.top : spaceBelow) - GAP * 2),
      });
    }
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || disabled) return undefined;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    }
    function handleKey(e) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((open) => !open)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled && "cursor-not-allowed opacity-60 hover:border-border",
        )}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          size={15}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && !disabled && placement &&
        createPortal(
          <div
            className={cn(
              "fixed z-50 overflow-y-auto rounded-xl border p-1.5",
              panelClassName,
            )}
            style={{
              left: placement.left,
              width: placement.width,
              top: placement.top,
              bottom: placement.bottom,
              maxHeight: placement.maxHeight,
              background: "var(--popover)",
              borderColor: "var(--border)",
              boxShadow: "var(--glass-shadow)",
            }}
          >
            {options.map((option) => {
              const isActive = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-light text-primary"
                      : "text-muted-foreground hover:bg-primary-light hover:text-primary",
                  )}
                >
                  {option.label}
                  {isActive && <Check size={14} className="shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
