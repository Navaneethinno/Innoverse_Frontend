import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { createPortal } from "react-dom";
import { X, AlertTriangle } from "lucide-react";
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
  // Opt-in only — every existing Modal caller keeps auto-sizing to its
  // content (a short confirm dialog shouldn't grow to 85vh just because
  // one caller elsewhere needs a stable height). AddDigitalProductWizard
  // passes this so its outer size stays identical across all 9 steps
  // instead of growing/shrinking with each step's field count — only the
  // content area (already flex-1 + overflow-y-auto below) scrolls.
  fixedHeight = false,
}) {
  // No modal in this codebase locked background scroll before — added here
  // once, in the shared shell, rather than each caller (or the Digital
  // Product wizard specifically) rolling its own competing lock.
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Pressing Enter inside a form field should submit that form the SAME
  // way clicking its real submit button would — but the browser's native
  // "implicit submission" rule picks whichever `type="submit"` control is
  // FIRST in the form's `elements` list, which on pages whose footer
  // renders "Save as draft" before "Save changes"/"Add X" silently
  // submitted as a draft on Enter instead of the real save (confirmed
  // across several pages). Intercepting Enter here — the one shared Modal
  // shell nearly every Add/Edit form in the app renders through — fixes
  // every one of those pages at once: it finds the form's own non-draft
  // submit button via `form.elements` (which includes footer buttons
  // associated only via a `form="..."` attribute, not just DOM
  // descendants), asks for confirmation, then clicks that exact button so
  // the page's own onSubmit/submitter-detection logic runs unchanged.
  const [pendingSubmit, setPendingSubmit] = useState(null);
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    if (pendingSubmit) confirmButtonRef.current?.focus();
  }, [pendingSubmit]);

  useEffect(() => {
    if (!open) setPendingSubmit(null);
  }, [open]);

  function handleKeyDown(event) {
    if (event.key !== "Enter" || pendingSubmit) return;
    const target = event.target;
    const tag = target.tagName;
    if (tag === "TEXTAREA" || tag === "BUTTON") return;
    const formEl = target.form ?? (target.closest ? target.closest("form") : null);
    if (!formEl) return;
    const submitButtons = Array.from(formEl.elements).filter(
      (el) => el.tagName === "BUTTON" && el.type === "submit" && !el.disabled,
    );
    if (submitButtons.length === 0) return;
    const primary = submitButtons.find((btn) => btn.dataset.mode !== "draft") ?? submitButtons[0];
    event.preventDefault();
    setPendingSubmit(primary);
  }

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
          "relative flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl",
          fixedHeight ? "h-[85vh] max-h-[85vh]" : "max-h-[85vh]",
          SIZES[size] ?? SIZES.md,
        )}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="h-1 shrink-0 bg-brand-gradient" />

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-light)] text-[var(--primary)]">
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

        {pendingSubmit && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 backdrop-blur-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-6 flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                <AlertTriangle size={16} />
              </span>
              <p className="text-sm font-bold text-slate-800">Are you sure you want to submit?</p>
              <div className="flex w-full gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingSubmit(null)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  ref={confirmButtonRef}
                  type="button"
                  onClick={() => {
                    const button = pendingSubmit;
                    setPendingSubmit(null);
                    button.click();
                  }}
                  className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
    ),
    document.body,
  );
}
