import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { institutionsApi } from "@/Services/Institutions/institutions.api";
import { institutionId } from "./InstitutionProfileForm";

// Authorize-institution confirmation — split out of the old shared inline
// confirm dialogs in InstitutionListPage.jsx / InstitutionDetailPage.jsx.
// Shows the checker exactly what the maker asked to change (via
// /institution/profile/pending) before they authorize it. narration is
// optional per the confirmed spec (unlike deauth, where it's required).
export function AuthInstitutionProfile({ institution, narration, setNarration, pending, onClose, onConfirm }) {
  const { t } = useTranslation("institutions");
  const open = !!institution;
  const { data, isLoading, error } = usePendingChanges(
    institutionsApi.pending,
    open ? institutionId(institution) : null,
    open,
  );
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={t("confirmInstitutionActionTitle")}
      description={
        institution && (
          <>
            {t("authConfirmDescription")} <strong>{institution?.name ?? institution?.code}</strong>?
          </>
        )
      }
      pending={pending}
      onConfirm={onConfirm}
    >
      <PendingChangesDiff data={data} isLoading={isLoading} error={error} />
      <textarea
        value={narration}
        onChange={(e) => setNarration(e.target.value)}
        placeholder={t("narrationOptionalPlaceholder")}
        className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
      />
    </ConfirmDialog>
  );
}
