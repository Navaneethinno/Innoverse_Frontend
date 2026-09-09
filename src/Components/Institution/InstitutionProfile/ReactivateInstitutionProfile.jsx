import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";

// Maker requests reactivation of an Inactive record — creates a pending
// reactivate, approved/rejected via the same Auth/Deauth actions as
// add/edit. narration is optional per the confirmed spec.
export function ReactivateInstitutionProfile({ institution, narration, setNarration, pending, onClose, onConfirm }) {
  const { t } = useTranslation("institutions");
  return (
    <ConfirmDialog
      open={!!institution}
      onClose={onClose}
      title={t("confirmInstitutionActionTitle")}
      description={
        institution && (
          <>
            {t("reactivateConfirmDescription")} <strong>{institution?.name ?? institution?.code}</strong>?
          </>
        )
      }
      pending={pending}
      onConfirm={onConfirm}
    >
      <textarea
        value={narration}
        onChange={(e) => setNarration(e.target.value)}
        placeholder={t("narrationOptionalPlaceholder")}
        className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
      />
    </ConfirmDialog>
  );
}
