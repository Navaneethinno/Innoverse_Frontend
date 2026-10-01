import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// The app's button. Pick a look with `variant` and a size with `size`;
// `icon` goes before the label and `loading` swaps it for a spinner and
// disables the button. Press/hover motion comes from theme.css (every
// button), the primary lift from here.
const VARIANTS = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:bg-[var(--primary-hover)] hover:shadow-md hover:-translate-y-px",
  outline: "border border-[var(--primary-light)] bg-card text-primary hover:bg-[var(--primary-light)]",
  secondary: "border border-border bg-card text-muted-foreground hover:text-primary hover:border-[var(--primary-light)]",
  ghost: "text-muted-foreground hover:bg-[var(--primary-light)] hover:text-primary",
  danger: "bg-[var(--destructive)] text-white shadow-sm hover:opacity-90 hover:shadow-md",
};
const SIZES = {
  sm: "gap-1.5 rounded-xl px-3 py-2 text-xs",
  md: "gap-1.5 rounded-xl px-4 py-2 text-sm",
  icon: "h-8 w-8 rounded-lg",
};

export const Button = forwardRef(function Button(
  { variant = "primary", size = "md", icon: Icon, loading = false, disabled, className, children, type = "button", ...props },
  ref,
) {
  const iconSize = size === "md" ? 15 : 14;
  return (
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
});
