import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { profilesApi } from "@/Services/Profiles/profiles.api";
import { profileId } from "./ProfileForm";

// Authorize-profile confirmation — split out of the old shared ConfirmDialog
// instance in ProfilesPage.jsx. Shows the checker exactly what the maker
// asked to change (via /user/profile/pending) before they authorize it.
export function AuthProfile({ profile, pending, onClose, onConfirm }) {
  const open = !!profile;
  const { data, isLoading, error } = usePendingChanges(profilesApi.pending, open ? profileId(profile) : null, open);
  return (
    <ConfirmDialog
      open={open}
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
    >
      <PendingChangesDiff data={data} isLoading={isLoading} error={error} />
    </ConfirmDialog>
  );
}
