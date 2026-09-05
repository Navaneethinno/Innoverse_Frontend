import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

const TOAST_VARIANTS = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-success bg-[var(--success-soft)]",
  },
  error: {
    icon: XCircle,
    iconClass: "text-destructive bg-[var(--destructive-soft)]",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-warning bg-[var(--warning-soft)]",
  },
  info: {
    icon: Info,
    iconClass: "text-primary bg-primary-light",
  },
};

export function Toast({ type = "info", title, message }) {
  const variant = TOAST_VARIANTS[type] ?? TOAST_VARIANTS.info;
  const Icon = variant.icon;
  return (
    <div className="flex items-start gap-3 pr-4">
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          variant.iconClass,
        )}
      >
        <Icon size={16} strokeWidth={2} />
      </span>
      <div className="min-w-0 pt-0.5">
        {title && <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>}
        <p className="text-sm font-medium text-foreground leading-snug">{message}</p>
      </div>
    </div>
  );
}
