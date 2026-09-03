import { useCallback, useEffect, useState } from "react";
import { usersApi } from "@/Services/Users/users.api";

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
  return {
    users: payload?.data?.user_array ?? [],
    pagination: payload?.data?.pagination ?? {
      totalRecords: 0,
      totalPages: 0,
      currentPage: 1,
      limit: 10,
    },
  };
}

export function useUsersQuery(params) {
  const query = useUserAsyncQuery(useCallback(() => usersApi.list(params), [params]));
  const mapped = mapUserListResponse(query.data);
  return { ...query, data: mapped.users, pagination: mapped.pagination };
}
function lookupOptions(payload, keys) {
  for (const key of keys) {
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }
  return [];
}
export function useUserLookupsQuery() {
  const query = useUserAsyncQuery(
    useCallback(async () => {
      const [institutions, profiles] = await Promise.all([
        usersApi.getActiveInstitutions(),
        usersApi.getAllProfiles(),
      ]);
      return {
        institutions: lookupOptions(institutions, [
          "inst_profile_array",
          "institution_profile_array",
        ]),
        profiles: lookupOptions(profiles, ["profile_array"]),
      };
    }, []),
  );
  return {
    ...query,
    institutions: query.data?.institutions ?? [],
    profiles: query.data?.profiles ?? [],
  };
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
