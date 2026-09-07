import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";

// Deauthorize-institution confirmation (requires remark) — split out of the
// old shared inline confirm dialogs in InstitutionListPage.jsx /
// InstitutionDetailPage.jsx.
export function DeauthInstitutionProfile({ institution, description, setDescription, pending, onClose, onConfirm }) {
  return (
    <ConfirmDialog
      open={!!institution}
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
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Remark (required)"
        className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
      />
    </ConfirmDialog>
  );
}
