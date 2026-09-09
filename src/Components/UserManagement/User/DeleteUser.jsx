import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { nameOf } from "./UserForm";

// Delete-user confirmation (requires narration) — split out of the old
// shared ConfirmDialog instance in UsersPage.jsx.
export function DeleteUser({ user, narration, setNarration, pending, onClose, onConfirm }) {
  const { t } = useTranslation("users");
  return (
    <ConfirmDialog
      open={!!user}
      onClose={onClose}
      title={t("confirmUserAction")}
      description={
        user && (
          <>
            {t("deleteUserConfirm")} <strong>{nameOf(user)}</strong>?
          </>
        )
      }
      pending={pending}
      confirmDisabled={!narration.trim()}
      destructive
      onConfirm={onConfirm}
    >
      <textarea
        value={narration}
        onChange={(event) => setNarration(event.target.value)}
        placeholder={t("narration")}
        className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
      />
    </ConfirmDialog>
  );
}
