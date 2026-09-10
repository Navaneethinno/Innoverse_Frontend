import { motion } from "motion/react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

const SIZES = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  full: "max-w-[95vw]",
};

// The one reusable modal shell — a thin brand-gradient accent bar, a
// circular close button, and a tinted footer bar — so every dialog in the
// app (audit history, confirm-action, add/edit forms, "view all" tables)
// shares the same chrome instead of each hand-rolling a flat white box.
// Entrance animation matches the fade+scale already used by
// InstitutionAuditModal/ProfileAuditModal (motion/react's initial/animate).
export function Modal({
  open,
  onClose,
  title,
  icon,
  subtitle,
  size = "md",
  footer,
  children,
  bodyClassName,
  onBodyScroll,
}) {
  if (!open) return null;
  return createPortal(
    (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.16 }}
        className={cn(
          "flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl",
          SIZES[size] ?? SIZES.md,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-1 shrink-0 bg-brand-gradient" />

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-800">{title}</h2>
              {subtitle && <p className="truncate text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={15} />
          </button>
        </div>

        <div
          className={cn("thin-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4", bodyClassName)}
          onScroll={onBodyScroll}
        >
          {children}
        </div>

        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
    ),
    document.body,
  );
}
