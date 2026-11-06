import { useCallback, useState } from "react";
import { i18n } from "@/Utils/I18n/i18n";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";

// Calls api[method](payload) with a pending flag and the result as a toast:
// the server's message, or a plain "done" when it sends none.
export function useApiMutation(api, method) {
  const [state, setState] = useState({ isPending: false, error: null });
  const mutateAsync = useCallback(
    async (payload) => {
      setState({ isPending: true, error: null });
      try {
        const result = await api[method](payload);
        setState({ isPending: false, error: null });
        notifications.success(apiMessage(result, i18n.t("common:actionCompleted")));
        return result;
      } catch (error) {
        setState({ isPending: false, error });
        notifications.error(error instanceof Error ? error.message : i18n.t("common:actionFailed"));
        throw error;
      }
    },
    [api, method],
  );
  return { ...state, mutateAsync };
}
