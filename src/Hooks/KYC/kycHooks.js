import { useCallback, useEffect, useState } from "react";
import { kycApi } from "@/Services/KYC/kyc.api";
function useKycAsyncQuery(queryFn, enabled) {
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
  }, [refetch]);
  return { data, error, isLoading, refetch };
}
export function useInstitutionKycQuery(id, enabled = true) {
  return useKycAsyncQuery(
    useCallback(() => kycApi.institution(id), [id]),
    enabled && id !== undefined,
  );
}
export function useUserKycQuery(id, enabled = true) {
  return useKycAsyncQuery(
    useCallback(() => kycApi.user(id), [id]),
    enabled && id !== undefined,
  );
}
