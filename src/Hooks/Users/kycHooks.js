import { useCallback, useEffect, useState } from "react";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { usersApi } from "@/Services/Users/users.api";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";

const KYC_CHANGED = "user-kyc:data-changed";
const notify = () => window.dispatchEvent(new Event(KYC_CHANGED));

export function useHasKycAction(actionName) {
  const menuArray = useSelector((store) => store.menu.menuArray);
  return useMemo(() => (menuArray ?? []).some((item) =>
    /kyc/i.test(String(item?.menu_name ?? "")) && (item.actions ?? []).some((action) => {
      const granted = String(action?.action_name ?? action?.name ?? "").toLowerCase();
      const requested = String(actionName).toLowerCase();
      return granted === requested || (requested === "authorize" && granted === "authorise") ||
        (requested === "add" && granted === "create");
    }),
  ), [menuArray, actionName]);
}

function useQuery(queryFn) {
  const [data, setData] = useState();
  const [error, setError] = useState(null);
  const [isLoading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setData(await queryFn()); }
    catch (nextError) { setError(nextError instanceof Error ? nextError : new Error("Request failed")); }
    finally { setLoading(false); }
  }, [queryFn]);
  useEffect(() => {
    void refetch();
    window.addEventListener(KYC_CHANGED, refetch);
    return () => window.removeEventListener(KYC_CHANGED, refetch);
  }, [refetch]);
  return { data, error, isLoading, refetch };
}

export function useKycQuery(params = {}) {
  const query = useQuery(useCallback(() => usersApi.kycList({ page: params.page ?? 1, limit: params.limit ?? 10 }), [params.page, params.limit]));
  useLiveChannel(API_ENDPOINTS.USER_MANAGEMENT.KYC.LIST, notify);
  const rows = Array.isArray(query.data?.data) ? query.data.data : [];
  return { ...query, data: rows, pagination: query.data?.pagination };
}

export function useKycMutation(method, success = "KYC action completed") {
  return { mutateAsync: async (payload) => {
    try {
      const result = await usersApi[method](payload);
      notifications.success(apiMessage(result, success));
      notify();
      return result;
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "KYC action failed");
      throw error;
    }
  } };
}
