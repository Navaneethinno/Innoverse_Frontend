import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { profilesApi } from "@/Services/Profiles/profiles.api";
import { profileId } from "./ProfileForm";

// Deauthorize-profile confirmation (requires narration) — split out of the
// old shared ConfirmDialog instance in ProfilesPage.jsx. Shows the checker
// exactly what the maker asked to change (via /user/profile/pending)
// before they reject it.
export function DeauthProfile({ profile, narration, setNarration, pending, onClose, onConfirm }) {
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
            deauth profile <strong>{profile?.profile_name}</strong>?
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
        placeholder="Reason (required)"
        className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
      />
    </ConfirmDialog>
  );
}
