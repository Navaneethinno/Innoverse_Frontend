import { AlertTriangle } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";

// Generic confirm-action dialog built on the shared Modal shell (gradient
// bar, circular close, tinted footer) — used for auth/deauth/delete
// confirmations across Institutions/Users/Profiles instead of each page
// hand-rolling its own flat box. `children` can hold a remark/narration
// textarea when the action requires one.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  pending = false,
  confirmDisabled = false,
  destructive = false,
  onConfirm,
  onClose,
  children,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={<AlertTriangle size={15} />}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={pending || confirmDisabled}
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${
              destructive ? "bg-red-600" : "bg-blue-600"
            }`}
          >
            {pending ? "Working..." : confirmLabel}
          </button>
        </>
      }
    >
      {description && <p className="text-sm text-slate-600">{description}</p>}
      {children}
    </Modal>
  );
}
