import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";

// Maker submits their own Draft (Draft -> Pending Add) or Draft Edit
// (Draft -> Pending Edit) for checker review. Only the draft's own maker
// may call this — the backend itself enforces that; this dialog just
// collects the optional narration.
export function SubmitInstitutionProfile({ institution, narration, setNarration, pending, onClose, onConfirm }) {
  const { t } = useTranslation("institutions");
  return (
    <ConfirmDialog
      open={!!institution}
      onClose={onClose}
      title={t("confirmInstitutionActionTitle")}
      description={
        institution && (
          <>
            {t("submitConfirmDescriptionPrefix")} <strong>{institution?.name ?? institution?.code}</strong> {t("submitConfirmDescriptionSuffix")}
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
