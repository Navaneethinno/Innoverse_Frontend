import { Eye, Pencil, History, Send, ShieldCheck, ShieldOff, Trash2, PowerOff, Power } from "lucide-react";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { actionButtonClass } from "@/Components/Common/actionStyles";

// The one reusable Actions-column renderer for every maker-checker list
// page (Account/KYC/Digital Product/Master Config/Institution/User...).
// Takes the already-computed getMakerCheckerButtons() result plus a
// handful of callbacks — no page hand-rolls its own button JSX anymore.
// That copy-pasting is exactly how the Deactivate/Reactivate button
// quietly went missing on some pages (one copy dropped the block, or
// wired the wrong permission into it) — fixing it here now fixes every
// page that uses this component at once, and any future lifecycle button
// only needs adding in this one file.
//
// A callback prop being omitted hides that button even if `buttons` says
// it's allowed — lets a page opt out of an action it genuinely doesn't
// support (e.g. no Delete on a page with no delete flow) without a
// dangling onClick that does nothing.
export function RowActions({
  buttons,
  onView,
  onEdit,
  onAudit,
  onSubmit,
  onAuthorize,
  onDeauthorize,
  onDeactivate,
  onReactivate,
  onDelete,
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      {onView && (
        <UiTooltip label="View">
          <button type="button" className={actionButtonClass("view")} onClick={onView}>
            <Eye size={14} />
          </button>
        </UiTooltip>
      )}
      {buttons.edit && onEdit && (
        <UiTooltip label="Edit">
          <button type="button" className={actionButtonClass("edit")} onClick={onEdit}>
            <Pencil size={14} />
          </button>
        </UiTooltip>
      )}
      {buttons.audit && onAudit && (
        <UiTooltip label="Audit">
          <button type="button" className={actionButtonClass("audit")} onClick={onAudit}>
            <History size={14} />
          </button>
        </UiTooltip>
      )}
      {buttons.submitDraft && onSubmit && (
        <UiTooltip label="Submit">
          <button type="button" className={actionButtonClass("submit")} onClick={onSubmit}>
            <Send size={14} />
          </button>
        </UiTooltip>
      )}
      {/* A pending row (PENDING ADD/EDIT/DELETE/...) grants BOTH authorize
          and deauthorize at once — approve or reject are both valid next
          steps on the same row — so these render independently rather
          than as an if/else chain. deactivate/activate are mutually
          exclusive with those and with each other (a record is either
          pending, active, or inactive — never more than one at once). */}
      {buttons.authorize && onAuthorize && (
        <UiTooltip label="Authorize">
          <button type="button" className={actionButtonClass("auth")} onClick={onAuthorize}>
            <ShieldCheck size={14} />
          </button>
        </UiTooltip>
      )}
      {buttons.deauthorize && onDeauthorize && (
        <UiTooltip label="Deauthorize">
          <button type="button" className={actionButtonClass("deauth")} onClick={onDeauthorize}>
            <ShieldOff size={14} />
          </button>
        </UiTooltip>
      )}
      {buttons.deactivate && onDeactivate && (
        <UiTooltip label="Deactivate">
          <button type="button" className={actionButtonClass("deauth")} onClick={onDeactivate}>
            <PowerOff size={14} />
          </button>
        </UiTooltip>
      )}
      {buttons.activate && onReactivate && (
        <UiTooltip label="Reactivate">
          <button type="button" className={actionButtonClass("auth")} onClick={onReactivate}>
            <Power size={14} />
          </button>
        </UiTooltip>
      )}
      {buttons.delete && onDelete && (
        <UiTooltip label="Delete">
          <button type="button" className={actionButtonClass("delete")} onClick={onDelete}>
            <Trash2 size={14} />
          </button>
        </UiTooltip>
      )}
    </div>
  );
}
