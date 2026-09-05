import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// A styled dropdown to replace bare native <select> filters, which render
// with the browser's own unstyled popup (plain white background, default
// blue highlight) regardless of any className applied to the <select>
// itself — no CSS reaches that native list. This renders the options as a
// themed floating panel instead, matching ModuleDropdown's popover style.
export function FilterSelect({ value, onChange, options, className, panelClassName }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) return undefined;
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
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

      {isOpen && (
        <div
          className={cn(
            "absolute right-0 z-50 mt-1.5 min-w-full overflow-hidden rounded-xl border p-1.5",
            panelClassName,
          )}
          style={{
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
        </div>
      )}
    </div>
  );
}
