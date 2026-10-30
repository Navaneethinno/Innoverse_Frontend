import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { profilesApi } from "@/Services/UserManagement/profiles.api";
import { profileId } from "./ProfileForm";
import { RequestedPermissions } from "./RequestedPermissions";
import { PermissionChanges, withoutPermissionRows } from "./PermissionChanges";

// Authorize-profile confirmation — split out of the old shared ConfirmDialog
// instance in ProfilesPage.jsx. Shows the checker exactly what the maker
// asked to change (via /user/profile/pending) before they authorize it.
export function AuthProfile({ profile, pending, onClose, onConfirm }) {
  const { t } = useTranslation("profiles");
  const open = !!profile;
  const { data, isLoading, error } = usePendingChanges(
    ({ id }) => profilesApi.pending({ profile_id: id }),
    open ? profileId(profile) : null,
    open,
  );
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={t("confirmProfileAction")}
      description={
        profile && (
          <>
            {t("authProfileConfirm")} <strong>{profile?.profile_name}</strong>?
          </>
        )
      }
      pending={pending}
      onConfirm={onConfirm}
    >
      <PendingChangesDiff data={withoutPermissionRows(data)} isLoading={isLoading} error={error} />
      {data?.pending_action === "EDIT" && <PermissionChanges changes={data.permission_changes} />}
      <RequestedPermissions profileId={open ? profileId(profile) : null} open={open} />
    </ConfirmDialog>
  );
}
