import { useAuth } from "@/Hooks/useAuth";
import { canChooseInstitution } from "@/Utils/Lib/institutionScope";

// Whether this user picks an institution (service provider) or is always in
// its own (bank, fintech): institution pickers, filters, columns and fields
// render only when it's true.
export function useCanChooseInstitution() {
  return canChooseInstitution(useAuth((state) => state.user?.scope));
}

// A tenant institution (scope.tier "TENANT"): platform-wide settings such
// as Password Policy and Scheduled Jobs are read-only for it.
export function useIsTenant() {
  return useAuth((state) => state.user?.scope?.tier) === "TENANT";
}

// The signed-in user's own id and institution id. The server refuses
// changes to either (own account: My Profile / Change Password).
export function useOwnIds() {
  const user = useAuth((state) => state.user);
  return { userId: String(user?.session_user_id ?? user?.user_id ?? user?.id ?? ""), institutionId: String(user?.scope?.institution_id ?? "") };
}
