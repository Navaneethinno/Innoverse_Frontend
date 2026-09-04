import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { profilesApi } from "@/Services/Profiles/profiles.api";

// Real permission source: the user's own menu_array (from login), following
// useHasInstitutionAction's exact pattern (src/Hooks/Institutions/institutionHooks.js).
// Users and Profiles are BOTH under module_id 16 ("User Management"), so
// module_id alone can't tell them apart the way it does for Institution
// (module_id 14, one menu item). Distinguished by menu_name instead —
// tolerant-matched against /profile/i so it still works if the backend's
// exact casing/wording ("Profiles", "Profile", "PROFILE") differs, mirroring
// the tolerant-alias approach already used for auth_status in
// InstitutionListPage.jsx's TAB_STATUS_ALIASES.
const USER_MANAGEMENT_MODULE_ID = 16;
export function useHasProfileAction(actionName) {
  const menuArray = useSelector((store) => store.menu.menuArray);
  return useMemo(
    () =>
      (menuArray || []).some(
        (item) =>
          Number(item?.module_id) === USER_MANAGEMENT_MODULE_ID &&
          /profile/i.test(String(item?.menu_name ?? "")) &&
          (item?.actions || []).some((a) => a?.action_name === actionName),
      ),
    [menuArray, actionName],
  );
}

// The current user's own "Profiles" menu item — used as the checker context
// (menu_id) for profile/auth and profile/deauth calls, per payse's
// AuthProfile.jsx (see profiles.api.js's `auth`/`deauth` comments).
export function useProfileMenuItem() {
  const menuArray = useSelector((store) => store.menu.menuArray);
  return useMemo(
    () =>
      (menuArray || []).find(
        (item) =>
          Number(item?.module_id) === USER_MANAGEMENT_MODULE_ID &&
          /profile/i.test(String(item?.menu_name ?? "")),
      ) ?? null,
    [menuArray],
  );
}

const PROFILES_CHANGED_EVENT = "profiles:data-changed";
function notifyProfileChange() {
  window.dispatchEvent(new Event(PROFILES_CHANGED_EVENT));
}

function useProfileAsyncQuery(queryFn) {
  const [data, setData] = useState();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await queryFn());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("Request failed"));
    } finally {
      setIsLoading(false);
    }
  }, [queryFn]);
  useEffect(() => {
    void refetch();
    const onProfileChange = () => void refetch();
    window.addEventListener(PROFILES_CHANGED_EVENT, onProfileChange);
    return () => window.removeEventListener(PROFILES_CHANGED_EVENT, onProfileChange);
  }, [refetch]);
  return { data, error, isLoading, refetch };
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
function mapProfileListResponse(payload) {
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

export function useProfilesQuery(params) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 100;
  const query = useProfileAsyncQuery(
    useCallback(() => profilesApi.list({ page, limit }), [page, limit]),
  );
  const mapped = mapProfileListResponse(query.data);
  return { ...query, data: mapped.profiles, pagination: mapped.pagination };
}

export function useAllProfilesQuery() {
  const query = useProfileAsyncQuery(useCallback(() => profilesApi.getAll(), []));
  const mapped = mapProfileListResponse(query.data);
  return { ...query, data: mapped.profiles };
}

// Read-only, deliberately NOT built on useProfileMutation — see
// useInstitutionAuditQuery's comment in institutionHooks.js for why: routing
// a read through the change-broadcasting mutation wrapper caused a
// list<->audit refetch storm there.
export function useProfileAuditQuery(profileId) {
  const query = useProfileAsyncQuery(
    useCallback(
      () =>
        profileId != null
          ? profilesApi.audit({ profile_id: profileId, page: 1, limit: 10 })
          : Promise.resolve(null),
      [profileId],
    ),
  );
  const mapped = mapProfileListResponse(query.data);
  return { ...query, data: mapped.profiles };
}

export function useProfileGetQuery(profileId) {
  const query = useProfileAsyncQuery(
    useCallback(
      () => (profileId != null ? profilesApi.get({ profile_id: profileId }) : Promise.resolve(null)),
      [profileId],
    ),
  );
  return { ...query, data: query.data?.data ?? null };
}

export function useProfileCreateMutation() {
  return useProfileMutation(useCallback((payload) => profilesApi.add(payload), []));
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
