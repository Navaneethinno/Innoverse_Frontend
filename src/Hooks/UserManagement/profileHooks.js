import { findMenuByName, useMenuPermission } from "@/Hooks/usePermission";
import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { profilesApi } from "@/Services/UserManagement/profiles.api";

// Delegates to the one permission source (exact menu, fail-closed).
export function useHasProfileAction(actionName) {
  return useMenuPermission("Profiles")(actionName);
}

// The current user's own "Profiles" menu item — used as the checker context
// (menu_id) for profile/auth and profile/deauth calls, per payse's
// AuthProfile.jsx (see profiles.api.js's `auth`/`deauth` comments).
export function useProfileMenuItem() {
  const menuArray = useSelector((store) => store.menu.menuArray);
  return useMemo(
    () =>
      // Exact "Profile" — a loose /profile/i hit "Institution Profile" first.
      findMenuByName(menuArray, "Profiles"),
    [menuArray],
  );
}

const PROFILES_CHANGED_EVENT = "profiles:data-changed";
function notifyProfileChange() {
  window.dispatchEvent(new Event(PROFILES_CHANGED_EVENT));
}

function useProfileMutation(mutationFn) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);
  const mutateAsync = useCallback(
    async (payload) => {
      setIsPending(true);
      setError(null);
      try {
        const result = await mutationFn(payload);
        notifyProfileChange();
        return result;
      } catch (nextError) {
        const normalized = nextError instanceof Error ? nextError : new Error("Request failed");
        setError(normalized);
        throw normalized;
      } finally {
        setIsPending(false);
      }
    },
    [mutationFn],
  );
  return { mutateAsync, isPending, error };
}

// Envelope shape assumed identical to every other confirmed-live endpoint in
// this codebase: { data, pagination, ... } with pagination at the TOP level
// (see institutionHooks.js's mapInstitutionListResponse comment) — NOT
// independently verified live for /profile/list specifically (network calls
// blocked in this sandbox), so this tolerates several plausible array keys
// the same way institutions' mapper does.
export function mapProfileListResponse(payload) {
  const data = payload?.data;
  const records =
    (Array.isArray(data) && data) ||
    data?.profile_array ||
    data?.profile_data ||
    data?.list ||
    data?.data ||
    [];
  return {
    profiles: Array.isArray(records) ? records : [],
    pagination: payload?.pagination ??
      data?.pagination ?? {
        totalRecords: Array.isArray(records) ? records.length : 0,
        totalPages: 1,
        currentPage: 1,
        limit: 10,
      },
  };
}

export function useProfileCreateMutation() {
  return useProfileMutation(useCallback((payload) => profilesApi.add(payload), []));
}
export function useProfileSubmitMutation() {
  return useProfileMutation(useCallback((payload) => profilesApi.submit(payload), []));
}
export function useProfileUpdateMutation() {
  return useProfileMutation(useCallback((payload) => profilesApi.edit(payload), []));
}
export function useProfileAuthMutation() {
  return useProfileMutation(useCallback((payload) => profilesApi.auth(payload), []));
}
export function useProfileDeauthMutation() {
  return useProfileMutation(useCallback((payload) => profilesApi.deauth(payload), []));
}
export function useProfileDeleteMutation() {
  return useProfileMutation(useCallback((payload) => profilesApi.delete(payload), []));
}
export function useProfileDeleteAuthMutation() {
  return useProfileMutation(useCallback((payload) => profilesApi.deleteAuth(payload), []));
}
