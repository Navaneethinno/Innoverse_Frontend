import { useCallback, useEffect, useState } from "react";
import { usersApi } from "@/Services/Users/users.api";
import { normalizePasswordPolicyList, pickDefaultPolicy } from "@/Utils/Lib/passwordPolicy";

const USERS_CHANGED_EVENT = "users:data-changed";
function notifyUserChange() {
  window.dispatchEvent(new Event(USERS_CHANGED_EVENT));
}

function useUserAsyncQuery(queryFn) {
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
    const onUserChange = () => void refetch();
    window.addEventListener(USERS_CHANGED_EVENT, onUserChange);
    return () => window.removeEventListener(USERS_CHANGED_EVENT, onUserChange);
  }, [refetch]);
  return { data, error, isLoading, refetch };
}

function useUserMutation(mutationFn) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);
  const mutateAsync = useCallback(
    async (payload) => {
      setIsPending(true);
      setError(null);
      try {
        const result = await mutationFn(payload);
        notifyUserChange();
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

function mapUserListResponse(payload) {
  const data = payload?.data;
  const users =
    (Array.isArray(data) && data) ||
    data?.user_array ||
    data?.user_data ||
    data?.list ||
    [];
  return {
    users: Array.isArray(users) ? users : [],
    pagination: payload?.pagination ?? data?.pagination ?? {
      totalRecords: Array.isArray(users) ? users.length : 0,
      totalPages: 1,
      currentPage: 1,
      limit: 10,
    },
  };
}

export function useUsersQuery(params) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  const search = params?.search ?? "";
  const status = params?.status ?? 0;
  const query = useUserAsyncQuery(
    useCallback(() => usersApi.list({ page, limit, search, status }), [page, limit, search, status]),
  );
  const mapped = mapUserListResponse(query.data);
  return { ...query, data: mapped.users, pagination: mapped.pagination };
}
function lookupOptions(payload, keys) {
  if (Array.isArray(payload?.data)) return payload.data;
  for (const key of keys) {
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }
  return [];
}
export function useUserLookupsQuery() {
  const query = useUserAsyncQuery(
    useCallback(async () => {
      const [institutions, profiles, passwordPolicies] = await Promise.all([
        usersApi.getActiveInstitutions(),
        usersApi.getAllProfiles(),
        usersApi.getPasswordPolicies(),
      ]);
      return {
        institutions: lookupOptions(institutions, [
          "inst_profile_array",
          "institution_profile_array",
        ]),
        profiles: lookupOptions(profiles, ["profile_array"]),
        passwordPolicies: normalizePasswordPolicyList(passwordPolicies),
      };
    }, []),
  );
  return {
    ...query,
    institutions: query.data?.institutions ?? [],
    profiles: query.data?.profiles ?? [],
    passwordPolicies: query.data?.passwordPolicies ?? [],
  };
}

// Standalone fetch for screens outside the Users list (e.g. Change
// Password) that just need the applicable policy to validate against,
// without the institutions/profiles lookups above.
export function usePasswordPolicyQuery() {
  const query = useUserAsyncQuery(
    useCallback(async () => normalizePasswordPolicyList(await usersApi.getPasswordPolicies()), []),
  );
  const policies = query.data ?? [];
  return { ...query, policies, policy: pickDefaultPolicy(policies) };
}
export function useUserAuditMutation() {
  return useUserMutation(useCallback((payload) => usersApi.audit(payload), []));
}
export function useUserCreateMutation() {
  return useUserMutation(useCallback((payload) => usersApi.add(payload), []));
}
export function useUserUpdateMutation() {
  return useUserMutation(useCallback((payload) => usersApi.edit(payload), []));
}
export function useUserAuthMutation() {
  return useUserMutation(useCallback((payload) => usersApi.auth(payload), []));
}
export function useUserDeauthMutation() {
  return useUserMutation(useCallback((payload) => usersApi.deauth(payload), []));
}
export function useUserDeleteMutation() {
  return useUserMutation(useCallback((payload) => usersApi.delete(payload), []));
}
export function useUserDeleteAuthMutation() {
  return useUserMutation(useCallback((payload) => usersApi.deleteAuth(payload), []));
}
