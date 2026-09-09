import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { usersApi } from "@/Services/Users/users.api";
import { nameOf, userId } from "./UserForm";

// Deauthorize-user confirmation (requires narration) — split out of the old
// shared ConfirmDialog instance in UsersPage.jsx. Shows the checker exactly
// what the maker asked to change (via /user/pending) before they reject it.
export function DeauthUser({ user, narration, setNarration, pending, onClose, onConfirm }) {
  const { t } = useTranslation("users");
  const open = !!user;
  const { data, isLoading, error } = usePendingChanges(usersApi.pending, open ? userId(user) : null, open);
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={t("confirmUserAction")}
      description={
        user && (
          <>
            {t("deauthUserConfirm")} <strong>{nameOf(user)}</strong>?
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
        onChange={(event) => setNarration(event.target.value)}
        placeholder={t("narration")}
        className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
      />
    </ConfirmDialog>
  );
}
