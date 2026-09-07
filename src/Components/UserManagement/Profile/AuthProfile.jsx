import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";

// Authorize-profile confirmation — split out of the old shared ConfirmDialog
// instance in ProfilesPage.jsx.
export function AuthProfile({ profile, pending, onClose, onConfirm }) {
  return (
    <ConfirmDialog
      open={!!profile}
      onClose={onClose}
      title="Confirm profile action"
      description={
        profile && (
          <>
            auth profile <strong>{profile?.profile_name}</strong>?
          </>
        )
      }
      pending={pending}
      onConfirm={onConfirm}
    />
  );
}
