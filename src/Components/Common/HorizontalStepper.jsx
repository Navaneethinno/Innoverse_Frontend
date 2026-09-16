import { Check } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// Generalized out of AddInstitutionProfile.jsx's inline create-flow stepper
// (same circle/connector/label visual language, same primary/border/muted
// tokens) so any multi-step flow can reuse it instead of hand-rolling the
// markup again. Unlike that stepper, steps here are independently clickable
// (onStepClick) rather than forward-only, since callers like
// DigitalProductWorkflow use this purely for navigation between already-
// existing pages, not a linear wizard with its own submit gate.
//
// Wrapped in its own overflow-x-auto with a min-w-max inner row so a long
// step list (Digital Product's 9 steps) scrolls horizontally on narrow
// screens instead of squeezing labels unreadably thin or wrapping to a
// second row.
export function HorizontalStepper({ steps, activeIndex, onStepClick, className }) {
  const clickable = typeof onStepClick === "function";
  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="flex min-w-max items-start px-1">
        {steps.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isCurrent = index === activeIndex;
          const Icon = step.icon;
          return (
            <div
              key={step.id ?? step.label}
              className={cn("flex items-center", index < steps.length - 1 && "min-w-[92px] flex-1")}
            >
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick(index, step)}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-2 rounded-lg outline-none",
                  clickable && "cursor-pointer",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 bg-card transition-colors",
                    isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCurrent
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground",
                  )}
                  style={isCurrent ? { background: "var(--primary-light)" } : undefined}
                >
                  {isCompleted ? (
                    <Check size={18} />
                  ) : Icon ? (
                    <Icon size={17} />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>
                <p
                  className={cn(
                    "w-20 text-center text-[11px] font-semibold leading-tight transition-colors",
                    isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </p>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 min-w-[24px] flex-1 rounded-full transition-colors duration-300",
                    index < activeIndex ? "bg-primary" : "bg-border",
                  )}
                  style={{ marginTop: "1.25rem" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
