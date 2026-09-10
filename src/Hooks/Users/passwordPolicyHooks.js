import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { usersApi } from "@/Services/Users/users.api";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";

const CHANGED = "user-password-policy:data-changed";
const notify = () => window.dispatchEvent(new Event(CHANGED));

export function useHasPasswordPolicyAction(actionName) {
  const menuArray = useSelector((store) => store.menu.menuArray);
  return useMemo(() => (menuArray ?? []).some((item) =>
    /password.?policy/i.test(String(item?.menu_name ?? "")) && (item.actions ?? []).some((action) => {
      const granted = String(action?.action_name ?? action?.name ?? "").toLowerCase();
      const requested = String(actionName).toLowerCase();
      return granted === requested || (requested === "authorize" && granted === "authorise") || (requested === "add" && granted === "create");
    }),
  ), [menuArray, actionName]);
}

export function usePasswordPoliciesQuery(params = {}) {
  const [state, setState] = useState({ data: [], pagination: null, error: null, isLoading: true });
  const refetch = useCallback(async () => {
    setState((old) => ({ ...old, isLoading: true, error: null }));
    try { const result = await usersApi.passwordPolicyList({ page: params.page ?? 1, limit: params.limit ?? 10 }); setState({ data: Array.isArray(result?.data) ? result.data : [], pagination: result?.pagination, error: null, isLoading: false }); }
    catch (error) { setState((old) => ({ ...old, error: error instanceof Error ? error : new Error("Request failed"), isLoading: false })); }
  }, [params.page, params.limit]);
  useEffect(() => { void refetch(); window.addEventListener(CHANGED, refetch); return () => window.removeEventListener(CHANGED, refetch); }, [refetch]);
  useLiveChannel(API_ENDPOINTS.USER_MANAGEMENT.PASSWORD_POLICY.LIST, notify);
  return { ...state, refetch };
}

export function usePasswordPolicyMutation(method) {
  return { mutateAsync: async (payload) => { try { const result = await usersApi[method](payload); notifications.success(apiMessage(result, "Password policy action completed")); notify(); return result; } catch (error) { notifications.error(error instanceof Error ? error.message : "Password policy action failed"); throw error; } } };
}

export function usePasswordPolicyRead(method, payload) {
  const [state, setState] = useState({ data: null, error: null, isLoading: false });
  const run = useCallback(async () => {
    setState((old) => ({ ...old, isLoading: true, error: null }));
    try {
      const result = await usersApi[method](payload);
      setState({ data: result, error: null, isLoading: false });
      return result;
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error("Request failed");
      setState({ data: null, error: normalized, isLoading: false });
      throw normalized;
    }
  }, [method, payload]);
  return { ...state, run };
}

export function usePasswordPolicyActions() {
  return {
    passwordPolicyAdd: usePasswordPolicyMutation("passwordPolicyAdd"), passwordPolicyEdit: usePasswordPolicyMutation("passwordPolicyEdit"),
    passwordPolicySubmit: usePasswordPolicyMutation("passwordPolicySubmit"), passwordPolicyAuth: usePasswordPolicyMutation("passwordPolicyAuth"),
    passwordPolicyDeauth: usePasswordPolicyMutation("passwordPolicyDeauth"), passwordPolicyDelete: usePasswordPolicyMutation("passwordPolicyDelete"),
    passwordPolicyDeleteAuth: usePasswordPolicyMutation("passwordPolicyDeleteAuth"), passwordPolicyDeactivate: usePasswordPolicyMutation("passwordPolicyDeactivate"),
    passwordPolicyReactivate: usePasswordPolicyMutation("passwordPolicyReactivate"), passwordPolicyAudit: usePasswordPolicyMutation("passwordPolicyAudit"),
    passwordPolicyPending: usePasswordPolicyMutation("passwordPolicyPending"),
  };
}
