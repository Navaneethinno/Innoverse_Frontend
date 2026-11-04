import { Inbox } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// "Nothing here yet" inside a page or a section: one look everywhere.
export function EmptyNote({ children, className }) {
  return (
    <div className={cn("flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 px-4 py-8 text-center", className)}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox size={18} />
      </span>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
