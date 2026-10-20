import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { amlFlagApi } from "@/Services/InnoAML/aml.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";

// Counts shown beside a menu in the sidebar, by menu name.
export const MenuBadgeContext = createContext({});
export const useMenuBadge = (menuName) => useContext(MenuBadgeContext)[menuName] ?? 0;

// The badges the sidebar shows. Each is asked for only when the user has
// that menu: Flags shows the customers with an open flag (one raise or
// dismiss settles all of a customer's flags), refreshed by the flag channel.
export function useMenuBadges(menus) {
  const hasFlags = (menus ?? []).some((m) => m?.menu_name === "Flags" && m?.status === 1);
  const [flags, setFlags] = useState(0);
  const refresh = useCallback(() => {
    if (!hasFlags) return;
    amlFlagApi
      .count()
      .then((r) => setFlags(Number(rowsOf(r)[0]?.open_customers ?? 0)))
      .catch(() => {});
  }, [hasFlags]);
  useEffect(() => {
    if (hasFlags) refresh();
    else setFlags(0);
  }, [hasFlags, refresh]);
  useLiveChannel(amlFlagApi.listPath, refresh, { enabled: hasFlags });
  return { Flags: flags };
}
