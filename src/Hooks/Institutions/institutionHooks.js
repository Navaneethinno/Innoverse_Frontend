import { useCallback, useEffect, useState } from "react";
import { institutionsApi } from "@/Services/Institutions/institutions.api";
const INSTITUTIONS_CHANGED_EVENT = "institutions:data-changed";
function notifyInstitutionChange() {
  window.dispatchEvent(new Event(INSTITUTIONS_CHANGED_EVENT));
}
function useInstitutionAsyncQuery(queryFn, enabled) {
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
    const onInstitutionChange = () => void refetch();
    window.addEventListener(INSTITUTIONS_CHANGED_EVENT, onInstitutionChange);
    return () => window.removeEventListener(INSTITUTIONS_CHANGED_EVENT, onInstitutionChange);
  }, [refetch]);
  return { data, error, isLoading, refetch };
}
function useInstitutionMutation(mutationFn) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);
  const mutateAsync = useCallback(
    async (args) => {
      setIsPending(true);
      setError(null);
      try {
        const result = await mutationFn(args);
        notifyInstitutionChange();
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
export function useInstitutionsQuery(enabled = true) {
  return useInstitutionAsyncQuery(
    useCallback(() => institutionsApi.list(), []),
    enabled,
  );
}
export function usePendingInstitutionsQuery(enabled) {
  return useInstitutionAsyncQuery(
    useCallback(() => institutionsApi.listPending(), []),
    enabled,
  );
}
export function useInstitutionQuery(id) {
  return useInstitutionAsyncQuery(
    useCallback(() => institutionsApi.getById(id ?? ""), [id]),
    Boolean(id),
  );
}
export function useInstitutionHistoryQuery(id) {
  return useInstitutionAsyncQuery(
    useCallback(() => institutionsApi.getHistory(id ?? ""), [id]),
    Boolean(id),
  );
}
export function useCreateInstitutionMutation() {
  return useInstitutionMutation(useCallback((payload) => institutionsApi.create(payload), []));
}
export function useUpdateInstitutionMutation() {
  return useInstitutionMutation(
    useCallback(({ id, payload }) => institutionsApi.update(id, payload), []),
  );
}
export function useInstitutionLifecycleMutation() {
  return useInstitutionMutation(
    useCallback(({ action, id, payload }) => {
      if (action === "delete") return institutionsApi.delete(id, payload);
      if (action === "activate") return institutionsApi.activate(id, payload);
      return institutionsApi.deactivate(id, payload);
    }, []),
  );
}
export function useContinueRejectedInstitutionMutation() {
  return useInstitutionMutation(
    useCallback(
      ({ requestId, payload, mode }) =>
        institutionsApi.continueRejectedAdd(requestId, payload, mode),
      [],
    ),
  );
}
export function useInstitutionApprovalMutation() {
  return useInstitutionMutation(
    useCallback(
      ({ requestId, decision }) =>
        decision === "approve"
          ? institutionsApi.approve(requestId)
          : institutionsApi.reject(requestId),
      [],
    ),
  );
}
