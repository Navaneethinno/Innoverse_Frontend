import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { nameOf } from "./UserForm";

// Authorize-user confirmation — split out of the old shared ConfirmDialog
// instance in UsersPage.jsx.
export function AuthUser({ user, pending, onClose, onConfirm }) {
  return (
    <ConfirmDialog
      open={!!user}
      onClose={onClose}
      title="Confirm user action"
      description={
        user && (
          <>
            auth user <strong>{nameOf(user)}</strong>?
          </>
        )
      }
      pending={pending}
      onConfirm={onConfirm}
    />
  );
}
