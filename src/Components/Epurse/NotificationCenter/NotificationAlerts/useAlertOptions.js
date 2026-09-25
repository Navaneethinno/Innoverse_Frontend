import { useEffect, useState } from "react";
import { notificationAlertApi } from "@/Services/Epurse/notification.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";

const EMPTY = { menus: [], placeholders: [], groups: [] };

// POST /config/notification/alert/options for an institution (omitted = the
// user's own): trigger menus/actions the user may pick, the placeholders a
// subject or message may use, and the institution's active groups.
export function useAlertOptions(instProfileId) {
  const [options, setOptions] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    notificationAlertApi
      .options(instProfileId ? { inst_profile_id: instProfileId } : {})
      .then((response) => !cancelled && setOptions({ ...EMPTY, ...(rowsOf(response)[0] ?? {}) }))
      .catch((error) => !cancelled && notifications.error(error.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [instProfileId]);
  return { options, loading };
}

export const triggerKey = (menuId, actionId) => `${menuId}:${actionId}`;

// "Province · Edit" for a stored {menu_id, action_id}, from the options.
export function describeTrigger(options, trigger) {
  const menu = options.menus.find((m) => m.menu_id === trigger.menu_id);
  const action = menu?.actions?.find((a) => a.action_id === trigger.action_id);
  return `${menu?.menu_name ?? `#${trigger.menu_id}`} · ${action?.action_name ?? `#${trigger.action_id}`}`;
}
