import { useCallback, useEffect, useState } from "react";
import { makerCheckerApi } from "@/Services/MakerChecker/makerChecker.api";
const MAKER_CHECKER_CHANGED_EVENT = "maker-checker:data-changed";
function notifyMakerCheckerChange() {
  window.dispatchEvent(new Event(MAKER_CHECKER_CHANGED_EVENT));
}
function useMakerCheckerAsyncQuery(queryFn, enabled) {
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
    const onMakerCheckerChange = () => void refetch();
    window.addEventListener(MAKER_CHECKER_CHANGED_EVENT, onMakerCheckerChange);
    return () => window.removeEventListener(MAKER_CHECKER_CHANGED_EVENT, onMakerCheckerChange);
  }, [refetch]);
  return { data, error, isLoading, refetch };
}
function useMakerCheckerMutation(mutationFn) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);
  const mutateAsync = useCallback(
    async (args) => {
      setIsPending(true);
      setError(null);
      try {
        const result = await mutationFn(args);
        notifyMakerCheckerChange();
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
export function usePendingRequestsQuery(entity) {
  return useMakerCheckerAsyncQuery(
    useCallback(
      () => (entity ? makerCheckerApi.getPendingByEntity(entity) : makerCheckerApi.getAllPending()),
      [entity],
    ),
    true,
  );
}
export function useAuditHistoryQuery(entity, id, enabled = true) {
  return useMakerCheckerAsyncQuery(
    useCallback(() => makerCheckerApi.getEntityHistory(entity, id), [entity, id]),
    enabled,
  );
}
export function useApprovalMutation() {
  return useMakerCheckerMutation(
    useCallback(({ requestId, payload }) => makerCheckerApi.approveRequest(requestId, payload), []),
  );
}
export function useRejectionMutation() {
  return useMakerCheckerMutation(
    useCallback(({ requestId, payload }) => makerCheckerApi.rejectRequest(requestId, payload), []),
  );
}
