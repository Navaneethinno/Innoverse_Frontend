import { useCallback, useEffect, useState } from "react";
import { applicationsApi } from "@/Services/Applications/applications.api";
const APPLICATIONS_CHANGED_EVENT = "applications:data-changed";
function notifyApplicationChange() {
  window.dispatchEvent(new Event(APPLICATIONS_CHANGED_EVENT));
}
function useApplicationAsyncQuery(queryFn, enabled) {
  const [data, setData] = useState();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const refetch = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      setData(await queryFn());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("Request failed"));
    } finally {
      setIsLoading(false);
    }
  }, [enabled, queryFn]);
  useEffect(() => {
    void refetch();
    const onApplicationChange = () => void refetch();
    window.addEventListener(APPLICATIONS_CHANGED_EVENT, onApplicationChange);
    return () => window.removeEventListener(APPLICATIONS_CHANGED_EVENT, onApplicationChange);
  }, [refetch]);
  return { data, error, isLoading, refetch };
}
function useApplicationMutation(mutationFn) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);
  const mutateAsync = useCallback(
    async (args) => {
      setIsPending(true);
      setError(null);
      try {
        const result = await mutationFn(args);
        notifyApplicationChange();
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
export function useApplicationsQuery(enabled = true) {
  return useApplicationAsyncQuery(
    useCallback(() => applicationsApi.list(), []),
    enabled,
  );
}
export function usePendingApplicationsQuery(enabled = true) {
  return useApplicationAsyncQuery(
    useCallback(() => applicationsApi.pending(), []),
    enabled,
  );
}
export function useAssignmentPendingApplicationsQuery(enabled = true) {
  return useApplicationAsyncQuery(
    useCallback(() => applicationsApi.assignmentPending(), []),
    enabled,
  );
}
export function useApplicationCreateMutation() {
  return useApplicationMutation(useCallback((payload) => applicationsApi.create(payload), []));
}
export function useApplicationAssignmentMutation() {
  return useApplicationMutation(
    useCallback(
      ({ institutionId, applicationId }) =>
        applicationsApi.assign(institutionId, applicationId, null),
      [],
    ),
  );
}
export function useApplicationLifecycleMutation() {
  return useApplicationMutation(
    useCallback(({ id, action, payload }) => {
      if (action === "delete") return applicationsApi.delete(id, payload);
      if (action === "activate") return applicationsApi.activate(id, payload);
      return applicationsApi.deactivate(id, payload);
    }, []),
  );
}
export function useApplicationUpdateMutation() {
  return useApplicationMutation(
    useCallback(({ id, payload }) => applicationsApi.update(id, payload), []),
  );
}
export function useApplicationDecisionMutation() {
  return useApplicationMutation(
    useCallback(
      ({ requestId, decision }) =>
        decision === "approve"
          ? applicationsApi.approve(requestId)
          : applicationsApi.reject(requestId),
      [],
    ),
  );
}
export function useContinueRejectedApplicationMutation() {
  return useApplicationMutation(
    useCallback(
      ({ requestId, payload, mode }) =>
        applicationsApi.continueRejectedAdd(requestId, payload, mode),
      [],
    ),
  );
}
