import { useCallback, useEffect, useState } from "react";
import { menusApi } from "@/Services/Menus/menus.api";
const MENUS_CHANGED_EVENT = "menus:data-changed";
function notifyMenuChange() {
  window.dispatchEvent(new Event(MENUS_CHANGED_EVENT));
}
function useMenuAsyncQuery(queryFn, enabled) {
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
    const onMenuChange = () => void refetch();
    window.addEventListener(MENUS_CHANGED_EVENT, onMenuChange);
    return () => window.removeEventListener(MENUS_CHANGED_EVENT, onMenuChange);
  }, [refetch]);
  return { data, error, isLoading, refetch };
}
function useMenuMutation(mutationFn) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);
  const mutateAsync = useCallback(
    async (args) => {
      setIsPending(true);
      setError(null);
      try {
        const result = await mutationFn(args);
        notifyMenuChange();
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
export function useModulesQuery(enabled = true) {
  return useMenuAsyncQuery(
    useCallback(() => menusApi.modules(), []),
    enabled,
  );
}
export function useMenusQuery(enabled = true) {
  return useMenuAsyncQuery(
    useCallback(() => menusApi.menus(), []),
    enabled,
  );
}
export function useMenuActionsQuery(enabled = true) {
  return useMenuAsyncQuery(
    useCallback(() => menusApi.menuActions(), []),
    enabled,
  );
}
export function usePendingMenuQuery(entity, enabled = true) {
  return useMenuAsyncQuery(
    useCallback(() => menusApi.pending(entity), [entity]),
    enabled,
  );
}
export function useMenuAuditQuery(entity, id, enabled = true) {
  return useMenuAsyncQuery(
    useCallback(() => menusApi.audit(entity, id), [entity, id]),
    enabled && id !== undefined,
  );
}
export function useMenuCreateMutation() {
  return useMenuMutation(
    useCallback(({ entity, payload }) => {
      if (entity === "modules") return menusApi.createModule(payload);
      if (entity === "menus") return menusApi.createMenu(payload);
      return menusApi.createMenuAction(payload);
    }, []),
  );
}
export function useMenuUpdateMutation() {
  return useMenuMutation(
    useCallback(({ entity, id, payload }) => {
      if (entity === "modules") return menusApi.updateModule(id, payload);
      if (entity === "menus") return menusApi.updateMenu(id, payload);
      return menusApi.updateMenuAction(id, payload);
    }, []),
  );
}
export function useMenuLifecycleMutation() {
  return useMenuMutation(
    useCallback(({ entity, id, action, payload }) => {
      if (action === "delete") {
        if (entity === "modules") return menusApi.deleteModule(id, payload);
        if (entity === "menus") return menusApi.deleteMenu(id, payload);
        return menusApi.deleteMenuAction(id, payload);
      }
      if (action === "activate") {
        if (entity === "modules") return menusApi.activateModule(id, payload);
        if (entity === "menus") return menusApi.activateMenu(id, payload);
        return menusApi.activateMenuAction(id, payload);
      }
      if (entity === "modules") return menusApi.deactivateModule(id, payload);
      if (entity === "menus") return menusApi.deactivateMenu(id, payload);
      return menusApi.deactivateMenuAction(id, payload);
    }, []),
  );
}
export function useMenuDecisionMutation() {
  return useMenuMutation(
    useCallback(
      ({ requestId, decision, payload }) =>
        decision === "approve"
          ? menusApi.approve(requestId, payload)
          : menusApi.reject(requestId, payload),
      [],
    ),
  );
}
export function useMenuContinueRejectedMutation() {
  return useMenuMutation(
    useCallback(
      ({ entity, requestId, payload, mode }) =>
        menusApi.continueRejectedAdd(entity, requestId, payload, mode),
      [],
    ),
  );
}
