import { useIsTenant } from "@/Hooks/useInstitutionScope";
import { useMenuPermission } from "@/Hooks/usePermission";
import { usersApi } from "@/Services/UserManagement/users.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";

const CHANGED = "user-password-policy:data-changed";
const notify = () => window.dispatchEvent(new Event(CHANGED));

// Delegates to the one permission source (exact menu, fail-closed).
// Password policies apply to every institution: a tenant only reads them
// (the server refuses its changes).
export function useHasPasswordPolicyAction(actionName) {
  const can = useMenuPermission("Password Policy");
  const tenant = useIsTenant();
  return can(actionName) && !(tenant && !["View", "Audit"].includes(actionName));
}

function usePasswordPolicyMutation(method) {
  return { mutateAsync: async (payload) => { try { const result = await usersApi[method](payload); notifications.success(apiMessage(result, "Password policy action completed")); notify(); return result; } catch (error) { notifications.error(error instanceof Error ? error.message : "Password policy action failed"); throw error; } } };
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
