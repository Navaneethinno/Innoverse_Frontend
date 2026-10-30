import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import { profilesApi } from "@/Services/UserManagement/profiles.api";
import { ProfilePermissionTree } from "./ProfilePermissionTree";

// The menu permissions a pending profile asks for, so the checker sees them
// before deciding. /user/profile/pending lists only the profile's own fields
// (name, institution), never its permissions; `get` carries the requested
// set in `menu_actions_edited` (an edit) or `menu_actions` (a new profile).
export function RequestedPermissions({ profileId, open }) {
  const { t } = useTranslation("profiles");
  const [grants, setGrants] = useState(null);
  useEffect(() => {
    if (!open || profileId == null) return undefined;
    let cancelled = false;
    profilesApi
      .get({ profile_id: profileId })
      .then((r) => {
        const p = Array.isArray(r?.data) ? r.data[0] : r?.data;
        const edited = p?.menu_actions_edited;
        if (!cancelled) setGrants(edited?.length ? edited : (p?.menu_actions ?? []));
      })
      .catch(() => !cancelled && setGrants([]));
    return () => {
      cancelled = true;
    };
  }, [open, profileId]);
  if (!grants?.length) return null;
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border">
      <p className="flex items-center gap-2 border-b border-border bg-muted px-3 py-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
        <ShieldCheck size={13} /> {t("requestedPermissions")}
      </p>
      <p className="px-3 pt-2 text-[11px] text-muted-foreground">{t("requestedPermissionsHint")}</p>
      <div className="max-h-72 overflow-y-auto p-2">
        <ProfilePermissionTree selected={grants} onChange={() => {}} readOnly />
      </div>
    </div>
  );
}
