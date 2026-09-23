import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// Below this many options, scanning the list by eye is faster than typing —
// above it (currency/country-sized lists, ~150-250 entries), a search box
// is worth the extra row. An option's own `label` is what's matched by
// default (lowercased, substring match); a caller whose label is JSX (e.g.
// a country name plus a flag icon) rather than plain text passes
// `searchText` on that option so search still works even though the label
// itself isn't a plain string.
const SEARCH_THRESHOLD = 8;

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
// `addAction` ({ label, onClick }) pins an "Add ..." row at the end of the
// list — for dropdowns fed by a master, so an empty (or incomplete) list can
// send the user straight to that master to create the missing value.
export function FilterSelect({ value, onChange, options, className, panelClassName, disabled, disabledReason, addAction }) {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState(null);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const panelRef = useRef(null);
  const searchInputRef = useRef(null);
  const selected = options.find((option) => option.value === value) ?? options[0];
  const showSearch = options.length > SEARCH_THRESHOLD;
  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => {
      const text = option.searchText ?? (typeof option.label === "string" ? option.label : "");
      return text.toLowerCase().includes(q);
    });
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  // Autofocus the search box the instant the panel (and its measured
  // placement) is ready, so typing can start immediately without an extra
  // click — the same reason a native <select> combobox with a search field
  // grabs focus on open.
  useEffect(() => {
    if (isOpen && showSearch && placement) searchInputRef.current?.focus();
  }, [isOpen, showSearch, placement]);

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
      // The panel is portaled to document.body, so it's a DOM sibling of
      // containerRef, not a descendant — checking only containerRef here
      // meant every click on an option registered as "outside" and closed
      // the panel on mousedown, before the option's own onClick could ever
      // fire. Selecting anything silently did nothing.
      const insideTrigger = containerRef.current?.contains(e.target) ?? false;
      const insidePanel = panelRef.current?.contains(e.target) ?? false;
      if (!insideTrigger && !insidePanel) setIsOpen(false);
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
        title={disabled ? disabledReason : undefined}
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
            ref={panelRef}
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
            {showSearch && (
              <div className="sticky -top-1.5 z-10 mb-1 -mx-1.5 -mt-1.5 flex items-center gap-1.5 border-b bg-[var(--popover)] px-3 py-2" style={{ borderColor: "var(--border)" }}>
                <Search size={13} className="shrink-0 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Type to search..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            )}
            {visibleOptions.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No matches</p>
            )}
            {visibleOptions.map((option) => {
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
            {addAction && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  addAction.onClick();
                }}
                className="sticky -bottom-1.5 mt-1 flex w-full items-center gap-1.5 whitespace-nowrap rounded-lg border-t bg-[var(--popover)] px-3 py-2 text-left text-sm font-bold text-primary hover:bg-primary-light"
              >
                <Plus size={14} className="shrink-0" />
                {addAction.label}
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
