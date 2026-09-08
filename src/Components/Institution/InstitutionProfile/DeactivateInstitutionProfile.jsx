import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";

// Maker requests deactivation of an Active record — creates a pending
// deactivate, approved/rejected via the same Auth/Deauth actions as
// add/edit. narration is optional per the confirmed spec.
export function DeactivateInstitutionProfile({ institution, narration, setNarration, pending, onClose, onConfirm }) {
  return (
    <ConfirmDialog
      open={!!institution}
      onClose={onClose}
      title="Confirm institution action"
      description={
        institution && (
          <>
            deactivate institution <strong>{institution?.name ?? institution?.code}</strong>?
          </>
        )
      }
      pending={pending}
      onConfirm={onConfirm}
    >
      <textarea
        value={narration}
        onChange={(e) => setNarration(e.target.value)}
        placeholder="Narration (optional)"
        className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
      />
    </ConfirmDialog>
  );
}
