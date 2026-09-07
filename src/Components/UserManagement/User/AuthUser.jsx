import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { usersApi } from "@/Services/Users/users.api";
import { nameOf, userId } from "./UserForm";

// Authorize-user confirmation — split out of the old shared ConfirmDialog
// instance in UsersPage.jsx. Shows the checker exactly what the maker is
// asking to change (via /user/pending) so authorization isn't blind.
export function AuthUser({ user, pending, onClose, onConfirm }) {
  const open = !!user;
  const { data, isLoading, error } = usePendingChanges(usersApi.pending, open ? userId(user) : null, open);
  return (
    <ConfirmDialog
      open={open}
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
    >
      <PendingChangesDiff data={data} isLoading={isLoading} error={error} />
    </ConfirmDialog>
  );
}
