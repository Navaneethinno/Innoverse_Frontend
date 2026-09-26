import { Eye, Pencil, History, Send, ShieldCheck, ShieldOff, Trash2, PowerOff, Power } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { actionButtonClass } from "@/Components/Common/actionStyles";
import { usePagePermission } from "@/Hooks/usePermission";

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
  // Lets a caller repurpose the Submit button's tooltip when its
  // buttons.submitDraft state means something else in that flow (e.g.
  // "start a new version" on an Active row, which has no submitDraft
  // state of its own) — same button, same icon/color, only the label
  // changes, instead of a one-off button outside this set.
  submitLabel,
  onAuthorize,
  onDeauthorize,
  onDeactivate,
  onReactivate,
  onDelete,
  // The menu permissions to enforce. Defaults to the current page's menu;
  // pass useMenuPermission(...) when the rows belong to another menu.
  permission,
}) {
  const { t } = useTranslation("common");
  const pageCan = usePagePermission();
  const can = permission ?? pageCan;
  // Second gate on top of `buttons`: whatever a page computed, a button only
  // shows when the user's profile grants that action on this menu.
  const allow = can.menu
    ? {
        view: can("View"),
        edit: can("Edit"),
        submit: can("Add") || can("Edit"),
        authorize: can("Authorize"),
        changeStatus: can("Change Status"),
        delete: can("Delete"),
      }
    : { view: true, edit: true, submit: true, authorize: true, changeStatus: true, delete: true };
  return (
    <div data-tour="row-actions" className="flex items-center justify-center gap-1">
      {buttons.view !== false && allow.view && onView && (
        <UiTooltip label={t("view")}>
          <button type="button" className={actionButtonClass("view")} data-tour="action-view" onClick={onView}>
            <Eye size={14} />
          </button>
        </UiTooltip>
      )}
      {buttons.edit && allow.edit && onEdit && (
        <UiTooltip label={t("edit")}>
          <button type="button" className={actionButtonClass("edit")} data-tour="action-edit" onClick={onEdit}>
            <Pencil size={14} />
          </button>
        </UiTooltip>
      )}
      {buttons.audit && allow.view && onAudit && (
        <UiTooltip label={t("audit")}>
          <button type="button" className={actionButtonClass("audit")} data-tour="action-audit" onClick={onAudit}>
            <History size={14} />
          </button>
        </UiTooltip>
      )}
      {buttons.submitDraft && allow.submit && onSubmit && (
        <UiTooltip label={submitLabel ?? t("submit")}>
          <button type="button" className={actionButtonClass("submit")} data-tour="action-submit" onClick={onSubmit}>
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
      {buttons.authorize && allow.authorize && onAuthorize && (
        <UiTooltip label={t("authorize")}>
          <button type="button" className={actionButtonClass("auth")} data-tour="action-authorize" onClick={onAuthorize}>
            <ShieldCheck size={14} />
          </button>
        </UiTooltip>
      )}
      {buttons.deauthorize && allow.authorize && onDeauthorize && (
        <UiTooltip label={t("deauthorize")}>
          <button type="button" className={actionButtonClass("deauth")} data-tour="action-reject" onClick={onDeauthorize}>
            <ShieldOff size={14} />
          </button>
        </UiTooltip>
      )}
      {buttons.deactivate && allow.changeStatus && onDeactivate && (
        <UiTooltip label={t("deactivate")}>
          <button type="button" className={actionButtonClass("deauth")} data-tour="action-deactivate" onClick={onDeactivate}>
            <PowerOff size={14} />
          </button>
        </UiTooltip>
      )}
      {buttons.activate && allow.changeStatus && onReactivate && (
        <UiTooltip label={t("reactivate")}>
          <button type="button" className={actionButtonClass("auth")} data-tour="action-reactivate" onClick={onReactivate}>
            <Power size={14} />
          </button>
        </UiTooltip>
      )}
      {buttons.delete && allow.delete && onDelete && (
        <UiTooltip label={t("delete")}>
          <button type="button" className={actionButtonClass("delete")} data-tour="action-delete" onClick={onDelete}>
            <Trash2 size={14} />
          </button>
        </UiTooltip>
      )}
    </div>
  );
}
