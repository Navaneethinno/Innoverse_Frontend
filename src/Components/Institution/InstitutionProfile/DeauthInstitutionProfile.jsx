import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { institutionsApi } from "@/Services/Institutions/institutions.api";
import { institutionId } from "./InstitutionProfileForm";

// Deauthorize-institution confirmation (requires remark) — split out of the
// old shared inline confirm dialogs in InstitutionListPage.jsx /
// InstitutionDetailPage.jsx. Shows the checker exactly what the maker asked
// to change (via /institution/profile/pending) before they reject it.
export function DeauthInstitutionProfile({ institution, description, setDescription, pending, onClose, onConfirm }) {
  const open = !!institution;
  const { data, isLoading, error } = usePendingChanges(
    institutionsApi.pending,
    open ? institutionId(institution) : null,
    open,
  );
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title="Confirm institution action"
      description={
        institution && (
          <>
            deauth institution <strong>{institution?.name ?? institution?.code}</strong>?
          </>
        )
      }
      pending={pending}
      confirmDisabled={!description.trim()}
      onConfirm={onConfirm}
    >
      <PendingChangesDiff data={data} isLoading={isLoading} error={error} />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Remark (required)"
        className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
      />
    </ConfirmDialog>
  );
}
