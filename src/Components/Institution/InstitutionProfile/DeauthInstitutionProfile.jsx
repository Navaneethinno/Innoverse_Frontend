import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { institutionsApi } from "@/Services/Institutions/institutions.api";
import { institutionId } from "./InstitutionProfileForm";

// Deauthorize-institution confirmation (requires narration — a rejection
// must always record a reason, per the confirmed spec) — split out of the
// old shared inline confirm dialogs in InstitutionListPage.jsx /
// InstitutionDetailPage.jsx. Shows the checker exactly what the maker asked
// to change (via /institution/profile/pending) before they reject it.
export function DeauthInstitutionProfile({ institution, narration, setNarration, pending, onClose, onConfirm }) {
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
      confirmDisabled={!narration.trim()}
      onConfirm={onConfirm}
    >
      <PendingChangesDiff data={data} isLoading={isLoading} error={error} />
      <textarea
        value={narration}
        onChange={(e) => setNarration(e.target.value)}
        placeholder="Narration (required)"
        className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
      />
    </ConfirmDialog>
  );
}
