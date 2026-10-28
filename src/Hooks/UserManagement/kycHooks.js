import { useMenuPermission } from "@/Hooks/usePermission";
import { useCallback, useEffect, useState, useRef } from "react";
import { usersApi } from "@/Services/UserManagement/users.api";
import { masterApi } from "@/Services/Master/master.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";

const KYC_CHANGED = "user-kyc:data-changed";
const notify = () => window.dispatchEvent(new Event(KYC_CHANGED));

// Delegates to the one permission source (exact menu, fail-closed).
export function useHasKycAction(actionName) {
  return useMenuPermission("User KYC")(actionName);
}

function useQuery(queryFn) {
  const seq = useRef(0);
  const [data, setData] = useState();
  const [error, setError] = useState(null);
  const [isLoading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    // Only the newest call's reply counts (a search typed quickly).
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try { const next = await queryFn(); if (id === seq.current) setData(next); }
    catch (nextError) { if (id === seq.current) setError(nextError instanceof Error ? nextError : new Error("Request failed")); }
    finally { if (id === seq.current) setLoading(false); }
  }, [queryFn]);
  useEffect(() => {
    void refetch();
    window.addEventListener(KYC_CHANGED, refetch);
    return () => window.removeEventListener(KYC_CHANGED, refetch);
  }, [refetch]);
  return { data, error, isLoading, refetch, setData };
}

function activeUserRows(payload) {
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  return data?.user_array ?? data?.users ?? data?.list ?? [];
}

// KYC belongs to an existing login account. The backend provides the compact
// picker data through /user/get_active with { view: "dropdown" }.
// The users the Add form may pick: active users of the chosen institution
// (a System or service-provider user picks it first) with no KYC record,
// matching what was typed (the server searches; the first 20 matches show).
export const searchUsersWithoutKyc = (institution, term) =>
  usersApi.list({ page: 1, limit: 20, status: 1, without_kyc: true, search: term, ...(institution ? { inst_profile_id: Number(institution) } : {}) }).then(activeUserRows);

// A staff user's gender: one fixed list (/master/gender, MALE / FEMALE /
// OTHER), not the institution's customer gender masters. The code is sent.
export function useGenderOptionsQuery() {
  const query = useQuery(useCallback(() => masterApi.genderList(), []));
  return { ...query, genders: Array.isArray(query.data) ? query.data : [] };
}

export function useKycMutation(method, success = "KYC action completed") {
  return { mutateAsync: async (payload) => {
    try {
      const result = await usersApi[method](payload);
      notifications.success(apiMessage(result, success));
      notify();
      return result;
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "KYC action failed");
      throw error;
    }
  } };
}
