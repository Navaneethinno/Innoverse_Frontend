import { useEffect, useState } from "react";
import { getHealth } from "@/Services/Health/health.api";
const MAX_RETRIES = 2;
function retryDelay(attempt) {
  return Math.min(1000 * 2 ** attempt, 4000);
}
export function useBackendHealth() {
  const [isPending, setIsPending] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [requestVersion, setRequestVersion] = useState(0);
  useEffect(() => {
    let disposed = false;
    let retryTimer;
    setIsPending(true);
    setIsSuccess(false);
    setError(null);
    const run = async (attempt) => {
      try {
        await getHealth();
        if (disposed) return;
        setIsPending(false);
        setIsSuccess(true);
      } catch (requestError) {
        if (disposed) return;
        if (attempt < MAX_RETRIES) {
          retryTimer = setTimeout(() => void run(attempt + 1), retryDelay(attempt));
          return;
        }
        setIsPending(false);
        setError(requestError instanceof Error ? requestError : new Error("Backend unavailable"));
      }
    };
    void run(0);
    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [requestVersion]);
  return {
    isPending,
    isSuccess,
    isError: !isPending && !isSuccess,
    error,
    refetch: () => setRequestVersion((version) => version + 1),
  };
}
