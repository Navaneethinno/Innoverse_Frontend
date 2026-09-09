import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";

// Delete-profile confirmation (requires narration) — split out of the old
// shared ConfirmDialog instance in ProfilesPage.jsx.
export function DeleteProfile({ profile, narration, setNarration, pending, onClose, onConfirm }) {
  const { t } = useTranslation("profiles");
  return (
    <ConfirmDialog
      open={!!profile}
      onClose={onClose}
      title={t("confirmProfileAction")}
      description={
        profile && (
          <>
            {t("deleteProfileConfirm")} <strong>{profile?.profile_name}</strong>?
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
        onChange={(e) => setNarration(e.target.value)}
        placeholder={t("reasonRequired")}
        className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
      />
    </ConfirmDialog>
  );
}
