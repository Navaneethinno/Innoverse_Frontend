import { useCallback, useEffect, useState } from "react";
import { profilesApi } from "@/Services/Profiles/profiles.api";
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
    async (args) => {
      setIsPending(true);
      setError(null);
      try {
        const result = await mutationFn(args);
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
export function useProfilesQuery() {
  return useProfileAsyncQuery(useCallback(() => profilesApi.list(), []));
}
export function useProfileCreateMutation() {
  return useProfileMutation(useCallback((payload) => profilesApi.create(payload), []));
}
export function useProfilePermissionsMutation() {
  return useProfileMutation(
    useCallback(({ id, payload }) => profilesApi.permissions(id, payload), []),
  );
}
export function useProfileUpdateMutation() {
  return useProfileMutation(useCallback(({ id, payload }) => profilesApi.update(id, payload), []));
}
export function useProfileLifecycleMutation() {
  return useProfileMutation(
    useCallback(({ id, action, payload }) => {
      if (action === "delete") return profilesApi.delete(id, payload);
      if (action === "activate") return profilesApi.activate(id, payload);
      return profilesApi.deactivate(id, payload);
    }, []),
  );
}
export function useContinueRejectedProfileMutation() {
  return useProfileMutation(
    useCallback(
      ({ requestId, payload, mode }) => profilesApi.continueRejectedAdd(requestId, payload, mode),
      [],
    ),
  );
}
