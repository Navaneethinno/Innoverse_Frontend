import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";

// Delete-institution confirmation — split out of the old shared inline
// confirm dialogs in InstitutionListPage.jsx / InstitutionDetailPage.jsx.
export function DeleteInstitutionProfile({ institution, pending, onClose, onConfirm }) {
  return (
    <ConfirmDialog
      open={!!institution}
      onClose={onClose}
      title="Confirm institution action"
      description={
        institution && (
          <>
            delete institution <strong>{institution?.name ?? institution?.code}</strong>?
          </>
        )
      }
      pending={pending}
      destructive
      onConfirm={onConfirm}
    />
  );
}
