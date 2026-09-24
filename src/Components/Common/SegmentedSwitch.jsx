import { useLayoutEffect, useRef, useState } from "react";

// Pill-style segmented control with a thumb that slides (and stretches to
// the new label's width) between options, instead of the active colour
// just jumping. Used by the Individual | Corporate hubs
// (OnboardingConfigurationHub, CustomerOnboardingHub). Colours come from
// the theme tokens (--primary/--border/--card) only.
export function SegmentedSwitch({ options, value, onChange, className = "" }) {
  const buttonRefs = useRef({});
  const [thumb, setThumb] = useState(null);
  // Callers usually rebuild `options` every render — depend on the labels
  // (which change width with the language), not the array identity.
  const labelsKey = options.map((o) => `${o.value}:${o.label}`).join("|");

  useLayoutEffect(() => {
    const measure = () => {
      const el = buttonRefs.current[value];
      if (el) setThumb((prev) => (prev && prev.left === el.offsetLeft && prev.width === el.offsetWidth ? prev : { left: el.offsetLeft, width: el.offsetWidth }));
    };
    measure();
    // Labels change width with the language — re-measure on resize/fonts.
    window.addEventListener("resize", measure);
    document.fonts?.ready?.then(measure).catch(() => {});
    return () => window.removeEventListener("resize", measure);
  }, [value, labelsKey]);

  return (
    <div
      role="tablist"
      className={"relative inline-flex rounded-full border p-1 " + className}
      style={{ borderColor: "var(--border)", background: "var(--card)" }}
    >
      {thumb && (
        <span
          aria-hidden
          className="segmented-thumb absolute top-1 bottom-1 rounded-full bg-primary shadow-sm"
          style={{ left: 0, width: thumb.width, transform: `translateX(${thumb.left}px)` }}
        />
      )}
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current[option.value] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => !active && onChange(option.value)}
            className={
              "relative z-10 rounded-full px-4 py-1.5 text-xs font-bold transition-colors duration-300 " +
              (active ? "text-white" : "text-muted-foreground hover:text-primary")
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
