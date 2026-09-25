import { useMenuPermission } from "@/Hooks/usePermission";
import { useCallback, useEffect, useState } from "react";
import { usersApi } from "@/Services/UserManagement/users.api";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";

const CHANGED = "user-password-policy:data-changed";
const notify = () => window.dispatchEvent(new Event(CHANGED));

// Delegates to the one permission source (exact menu, fail-closed).
export function useHasPasswordPolicyAction(actionName) {
  return useMenuPermission("Password Policy")(actionName);
}

export function usePasswordPoliciesQuery(params = {}) {
  const [state, setState] = useState({ data: [], pagination: null, error: null, isLoading: true });
  const refetch = useCallback(async () => {
    setState((old) => ({ ...old, isLoading: true, error: null }));
    try { const result = await usersApi.passwordPolicyList({ page: params.page ?? 1, limit: params.limit ?? 10, ...(params?.filter ? { filter: params.filter } : {}), ...(params?.sort_by ? { sort_by: params.sort_by } : {}) }); setState({ data: Array.isArray(result?.data) ? result.data : [], pagination: result?.pagination, error: null, isLoading: false }); }
    catch (error) { setState((old) => ({ ...old, error: error instanceof Error ? error : new Error("Request failed"), isLoading: false })); }
  }, [params.page, params.limit, params.filter, params.sort_by]);
  useEffect(() => { void refetch(); window.addEventListener(CHANGED, refetch); return () => window.removeEventListener(CHANGED, refetch); }, [refetch]);
  // Refetch on every live push — the in-place reconcile this replaced
  // (insertNew: false) silently dropped brand-new records pushed by
  // another user/tab entirely. See userHooks.js's identical fix.
  useLiveChannel(API_ENDPOINTS.USER_MANAGEMENT.PASSWORD_POLICY.LIST, () => void refetch());
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
