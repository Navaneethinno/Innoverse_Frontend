import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";

// Delete-institution confirmation — split out of the old shared inline
// confirm dialogs in InstitutionListPage.jsx / InstitutionDetailPage.jsx.
// narration is optional per the confirmed spec (unlike deauth, where it's
// required) but still accepted, so it's offered here rather than dropped.
export function DeleteInstitutionProfile({ institution, narration, setNarration, pending, onClose, onConfirm }) {
  const { t } = useTranslation("institutions");
  return (
    <ConfirmDialog
      open={!!institution}
      onClose={onClose}
      title={t("confirmInstitutionActionTitle")}
      description={
        institution && (
          <>
            {t("deleteConfirmDescription")} <strong>{institution?.name ?? institution?.code}</strong>?
          </>
        )
      }
      pending={pending}
      destructive
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
