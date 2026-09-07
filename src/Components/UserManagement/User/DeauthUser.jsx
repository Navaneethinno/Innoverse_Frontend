import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { nameOf } from "./UserForm";

// Deauthorize-user confirmation (requires narration) — split out of the old
// shared ConfirmDialog instance in UsersPage.jsx.
export function DeauthUser({ user, narration, setNarration, pending, onClose, onConfirm }) {
  return (
    <ConfirmDialog
      open={!!user}
      onClose={onClose}
      title="Confirm user action"
      description={
        user && (
          <>
            deauth user <strong>{nameOf(user)}</strong>?
          </>
        )
      }
      pending={pending}
      confirmDisabled={!narration.trim()}
      onConfirm={onConfirm}
    >
      <textarea
        value={narration}
        onChange={(event) => setNarration(event.target.value)}
        placeholder="Narration"
        className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
      />
    </ConfirmDialog>
  );
}
