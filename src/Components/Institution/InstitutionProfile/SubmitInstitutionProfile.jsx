import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";

// Maker submits their own Draft (Draft -> Pending Add) or Draft Edit
// (Draft -> Pending Edit) for checker review. Only the draft's own maker
// may call this — the backend itself enforces that; this dialog just
// collects the optional narration.
export function SubmitInstitutionProfile({ institution, narration, setNarration, pending, onClose, onConfirm }) {
  return (
    <ConfirmDialog
      open={!!institution}
      onClose={onClose}
      title="Confirm institution action"
      description={
        institution && (
          <>
            submit <strong>{institution?.name ?? institution?.code}</strong> for checker review?
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
