import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AuditModal } from "@/Components/Common/AuditModal";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { Modal } from "@/Components/Common/Modal";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { RowActions } from "@/Components/Common/RowActions";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { useHasInstitutionAction } from "@/Hooks/Institution/institutionHooks";
import { useApiMutation } from "@/Hooks/useApiMutation";

const REVIEW = ["auth", "deauth", "deleteAuth"];

// A row's actions on an institution section (legal, branding, channels,
// currencies, modules): the maker-checker buttons, the confirm with narration
// and pending changes, the record's details and its audit. `what` names the
// record in titles; `facts` are the [label, value] pairs the details show.
export function InstitutionRowActions({ row, api, what, facts, auditTitle, auditFields, onEdit, onRefresh, detailsSize = "md" }) {
  const { t } = useTranslation("common");
  const canAdd = useHasInstitutionAction("Add");
  const canEdit = useHasInstitutionAction("Edit");
  const canAuthorize = useHasInstitutionAction("Authorize");
  const canDelete = useHasInstitutionAction("Delete");
  const canChangeStatus = useHasInstitutionAction("Change Status");
  const [action, setAction] = useState(null);
  const [details, setDetails] = useState(false);
  const [audit, setAudit] = useState(false);
  const [narration, setNarration] = useState("");
  const mutation = useApiMutation(api, action ?? "submit");
  const pendingInfo = usePendingChanges(api.pending, row.id, REVIEW.includes(action));
  const buttons = getMakerCheckerButtons(row, { canAdd, canEdit, canAuthorize, canChangeStatus, canDelete });
  const execute = async () => {
    try {
      await mutation.mutateAsync({ id: row.id, narration: narration.trim() });
      await onRefresh();
      setAction(null);
      setNarration("");
    } catch {
      /* useApiMutation already shows the error */
    }
  };
  const label = action ? t(`action_${action}`) : "";
  return (
    <>
      <RowActions
        buttons={buttons}
        onView={() => setDetails(true)}
        onEdit={onEdit}
        onAudit={() => setAudit(true)}
        onSubmit={() => setAction("submit")}
        onAuthorize={() => setAction(buttons.isPendingDelete ? "deleteAuth" : "auth")}
        onDeauthorize={() => setAction("deauth")}
        onDeactivate={() => setAction("deactivate")}
        onReactivate={() => setAction("reactivate")}
        onDelete={() => setAction("delete")}
      />
      <ConfirmDialog
        open={Boolean(action)}
        title={t("actionTitle", { action: label, what })}
        confirmLabel={label}
        destructive={["deauth", "delete", "deleteAuth"].includes(action)}
        pending={mutation.isPending}
        confirmDisabled={action === "deauth" && !narration.trim()}
        onClose={() => setAction(null)}
        onConfirm={() => void execute()}
      >
        {REVIEW.includes(action) && <PendingChangesDiff {...pendingInfo} />}
        <textarea
          value={narration}
          onChange={(e) => setNarration(e.target.value)}
          placeholder={t("narration")}
          aria-label={t("narration")}
          className="mt-3 min-h-20 w-full rounded-xl border border-border p-3 text-sm"
        />
      </ConfirmDialog>
      <Modal open={details} onClose={() => setDetails(false)} title={t("viewTitle", { what })} size={detailsSize}>
        <div className="grid gap-3 sm:grid-cols-2">
          {facts.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs font-semibold text-muted-foreground">{label}</p>
              <div className="mt-1 text-sm font-semibold text-foreground">{value ?? "—"}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <StatusBadge status={String(row.status_name ?? row.auth_status ?? row.status ?? "")} />
        </div>
      </Modal>
      {audit && (
        <AuditModal
          title={auditTitle}
          fields={auditFields}
          onClose={() => setAudit(false)}
          fetchAudit={(page, limit) =>
            api.audit({ id: row.id, page, limit }).then((r) => ({
              entries: Array.isArray(r?.data) ? r.data : [],
              totalPages: r?.pagination?.totalPages ?? 1,
            }))
          }
        />
      )}
    </>
  );
}
