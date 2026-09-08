import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";

// Maker requests reactivation of an Inactive record — creates a pending
// reactivate, approved/rejected via the same Auth/Deauth actions as
// add/edit. narration is optional per the confirmed spec.
export function ReactivateInstitutionProfile({ institution, narration, setNarration, pending, onClose, onConfirm }) {
  return (
    <ConfirmDialog
      open={!!institution}
      onClose={onClose}
      title="Confirm institution action"
      description={
        institution && (
          <>
            reactivate institution <strong>{institution?.name ?? institution?.code}</strong>?
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
