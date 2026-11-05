import { cn } from "@/Utils/Lib/utils";

// "Back" above a detail view or form.
export function BackButton({ className, children, type = "button", ...props }) {
  return (
    <button type={type} className={cn("mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary", className)} {...props}>
      {children}
    </button>
  );
}

// A button that reads as a link: a record's code or name in a list. `mono` for codes.
export function LinkButton({ mono = false, className, children, type = "button", ...props }) {
  return (
    <button type={type} className={cn("text-xs font-bold text-primary hover:underline", mono && "font-mono", className)} {...props}>
      {children}
    </button>
  );
}
