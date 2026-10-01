import { Eye, Pencil, History, Send, ShieldCheck, ShieldOff, Trash2, PowerOff, Power } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
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
        <ActionIconButton label={t("view")} intent="view" data-tour="action-view" icon={Eye} onClick={onView} />
      )}
      {buttons.edit && allow.edit && onEdit && (
        <ActionIconButton label={t("edit")} intent="edit" data-tour="action-edit" icon={Pencil} onClick={onEdit} />
      )}
      {buttons.audit && allow.view && onAudit && (
        <ActionIconButton label={t("audit")} intent="audit" data-tour="action-audit" icon={History} onClick={onAudit} />
      )}
      {buttons.submitDraft && allow.submit && onSubmit && (
        <ActionIconButton label={submitLabel ?? t("submit")} intent="submit" data-tour="action-submit" icon={Send} onClick={onSubmit} />
      )}
      {/* A pending row (PENDING ADD/EDIT/DELETE/...) grants BOTH authorize
          and deauthorize at once — approve or reject are both valid next
          steps on the same row — so these render independently rather
          than as an if/else chain. deactivate/activate are mutually
          exclusive with those and with each other (a record is either
          pending, active, or inactive — never more than one at once). */}
      {buttons.authorize && allow.authorize && onAuthorize && (
        <ActionIconButton label={t("authorize")} intent="auth" data-tour="action-authorize" icon={ShieldCheck} onClick={onAuthorize} />
      )}
      {buttons.deauthorize && allow.authorize && onDeauthorize && (
        <ActionIconButton label={t("deauthorize")} intent="deauth" data-tour="action-reject" icon={ShieldOff} onClick={onDeauthorize} />
      )}
      {buttons.deactivate && allow.changeStatus && onDeactivate && (
        <ActionIconButton label={t("deactivate")} intent="deauth" data-tour="action-deactivate" icon={PowerOff} onClick={onDeactivate} />
      )}
      {buttons.activate && allow.changeStatus && onReactivate && (
        <ActionIconButton label={t("reactivate")} intent="auth" data-tour="action-reactivate" icon={Power} onClick={onReactivate} />
      )}
      {buttons.delete && allow.delete && onDelete && (
        <ActionIconButton label={t("delete")} intent="delete" data-tour="action-delete" icon={Trash2} onClick={onDelete} />
      )}
    </div>
  );
}
