import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/Components/UI/tooltip";
import { cn } from "@/Utils/Lib/utils";

// The app's button. Pick a look with `variant` and a size with `size`;
// `icon` goes before the label and `loading` swaps it for a spinner and
// disables the button. Press/hover motion comes from theme.css (every
// button), the primary lift from here. `disabledReason`: why it is blocked,
// shown on hover or focus while it is disabled.
const VARIANTS = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:bg-[var(--primary-hover)] hover:shadow-md hover:-translate-y-px",
  outline: "border border-[var(--primary-light)] bg-card text-primary hover:bg-[var(--primary-light)]",
  secondary: "border border-border bg-card text-muted-foreground hover:text-primary hover:border-[var(--primary-light)]",
  ghost: "text-muted-foreground hover:bg-[var(--primary-light)] hover:text-primary",
  danger: "bg-[var(--destructive)] text-white shadow-sm hover:opacity-90 hover:shadow-md",
  // "+ Add a row" under a list of rows.
  dashed: "border border-dashed border-primary/50 text-primary hover:bg-[var(--primary-light)]",
};
const SIZES = {
  xs: "gap-1.5 rounded-lg px-3 py-1.5 text-xs",
  sm: "gap-1.5 rounded-xl px-3 py-2 text-xs",
  md: "gap-1.5 rounded-xl px-4 py-2 text-sm",
  icon: "h-8 w-8 rounded-lg",
};

export const Button = forwardRef(function Button(
  { variant = "primary", size = "md", icon: Icon, loading = false, disabled, disabledReason, className, children, type = "button", ...props },
  ref,
) {
  const iconSize = size === "md" ? 15 : 14;
  const button = (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 size={iconSize} className="animate-spin" /> : Icon && <Icon size={iconSize} />}
      {children}
    </button>
  );
  if (!disabled || loading || !disabledReason) return button;
  // A disabled button gets no pointer events, so the wrapper holds the tooltip.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex cursor-not-allowed rounded-xl">
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent>{disabledReason}</TooltipContent>
    </Tooltip>
  );
});
