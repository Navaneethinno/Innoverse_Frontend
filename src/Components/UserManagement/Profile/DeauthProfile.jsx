import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";

// Deauthorize-profile confirmation (requires narration) — split out of the
// old shared ConfirmDialog instance in ProfilesPage.jsx.
export function DeauthProfile({ profile, narration, setNarration, pending, onClose, onConfirm }) {
  return (
    <ConfirmDialog
      open={!!profile}
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
      <textarea
        value={narration}
        onChange={(e) => setNarration(e.target.value)}
        placeholder="Reason (required)"
        className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
      />
    </ConfirmDialog>
  );
}
