import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { institutionsApi } from "@/Services/Institutions/institutions.api";

// Real permission source: the user's own menu_array (from login), NOT a
// fabricated `user.institution.type` field — nothing in the auth flow ever
// sets that field, so any `=== "PLATFORM_OWNER"` check against it is always
// false. Module 14 is Institution; if any menu item under it carries the
// named action, the user is permitted. Same actions[] data the sidebar
// itself already uses (DynamicSidebar.jsx, Phase 24C).
export function useHasInstitutionAction(actionName) {
  const menuArray = useSelector((store) => store.menu.menuArray);
  return useMemo(
    () =>
      (menuArray || []).some(
        (item) =>
          /institution\s*profile/i.test(String(item?.menu_name ?? "")) &&
          (item?.actions || []).some((a) => {
            const grantedAction = String(a?.action_name ?? a?.name ?? "").trim().toLowerCase();
            const requestedAction = String(actionName).trim().toLowerCase();
            return grantedAction === requestedAction ||
              (requestedAction === "add" && grantedAction === "create") ||
              (requestedAction === "authorize" && grantedAction === "authorise");
          }),
      ),
    [menuArray, actionName],
  );
}

const INSTITUTIONS_CHANGED_EVENT = "institutions:data-changed";
function notifyInstitutionChange() {
  window.dispatchEvent(new Event(INSTITUTIONS_CHANGED_EVENT));
}

function useInstitutionAsyncQuery(queryFn) {
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
    async (payload) => {
      setIsPending(true);
      setError(null);
      try {
        const result = await mutationFn(payload);
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

// Confirmed live against a real /institution/profile/audit response:
// { api, code, data: [...], message, pagination: {...}, remark, status } —
// `data` is a plain array and `pagination` sits at the TOP level of the
// payload, not nested inside `data`. /institution/profile/list is assumed
// (not yet independently confirmed) to share this same envelope shape.
function mapInstitutionListResponse(payload) {
  const data = payload?.data;
  const records =
    (Array.isArray(data) && data) ||
    data?.inst_profile_array ||
    data?.institution_profile_array ||
    data?.list ||
    data?.data ||
    [];
  return {
    institutions: Array.isArray(records) ? records : [],
    pagination: payload?.pagination ??
      data?.pagination ?? {
        totalRecords: Array.isArray(records) ? records.length : 0,
        totalPages: 1,
        currentPage: 1,
        limit: 10,
      },
  };
}

// page/limit are read out as primitives (not the `params` object itself) so
// the fetch's useCallback/useEffect dependencies are stable across renders
// even when a caller passes a fresh object literal on every render (e.g.
// `useInstitutionsQuery({ page: 1, limit: 100 })` written inline in a
// component body). Depending on the object reference directly caused an
// infinite fetch loop: new object -> new callback -> effect re-fires ->
// state update -> re-render -> new object literal again, repeating forever.
// Also tolerates callers passing something other than an object (a stray
// boolean, undefined) by falling back to the defaults via optional chaining
// rather than destructuring the argument directly.
export function useInstitutionsQuery(params) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 100;
  const query = useInstitutionAsyncQuery(
    useCallback(() => institutionsApi.list({ page, limit }), [page, limit]),
  );
  const mapped = mapInstitutionListResponse(query.data);
  return { ...query, data: mapped.institutions, pagination: mapped.pagination };
}

// A read call, deliberately NOT built on useInstitutionMutation: that
// wrapper calls notifyInstitutionChange() after every successful call so
// list views refetch after a real data-changing action. Audit is read-only
// (POST /institution/profile/audit, {id, page, limit}) — routing it through
// the mutation wrapper made every audit-modal open also re-trigger every
// open list query on the page, which is what caused the request storm seen
// in the network tab (list -> audit -> list -> audit ...). Modeled as a
// query instead, keyed on id, matching useInstitutionAsyncQuery's own
// fetch-on-mount/id-change behavior with no change-broadcast side effect.
export function useInstitutionAuditQuery(id) {
  const query = useInstitutionAsyncQuery(
    useCallback(
      () => (id != null ? institutionsApi.audit({ id, page: 1, limit: 10 }) : Promise.resolve(null)),
      [id],
    ),
  );
  const mapped = mapInstitutionListResponse(query.data);
  return { ...query, data: mapped.institutions };
}

export function useActiveInstitutionsQuery() {
  const query = useInstitutionAsyncQuery(useCallback(() => institutionsApi.getActive(), []));
  const mapped = mapInstitutionListResponse(query.data);
  return { ...query, data: mapped.institutions };
}

export function useInstitutionCreateMutation() {
  return useInstitutionMutation(useCallback((payload) => institutionsApi.add(payload), []));
}
export function useInstitutionUpdateMutation() {
  return useInstitutionMutation(useCallback((payload) => institutionsApi.edit(payload), []));
}
export function useInstitutionAuthMutation() {
  return useInstitutionMutation(useCallback((payload) => institutionsApi.auth(payload), []));
}
export function useInstitutionDeauthMutation() {
  return useInstitutionMutation(useCallback((payload) => institutionsApi.deauth(payload), []));
}
export function useInstitutionDeleteMutation() {
  return useInstitutionMutation(useCallback((payload) => institutionsApi.delete(payload), []));
}
export function useInstitutionDeleteAuthMutation() {
  return useInstitutionMutation(useCallback((payload) => institutionsApi.deleteAuth(payload), []));
}
