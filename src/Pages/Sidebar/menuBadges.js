import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { tellerApi } from "@/Services/Accounting/accounting.api";
import { amlFlagApi } from "@/Services/InnoAML/aml.api";
import { matchesAction } from "@/Utils/Lib/actionAliases";
import { rowsOf } from "@/Services/Epurse/onboarding.api";

const TELLER_EVERY = 45000;

// Counts shown beside a menu in the sidebar, by menu name.
export const MenuBadgeContext = createContext({});
export const useMenuBadge = (menuName) => useContext(MenuBadgeContext)[menuName] ?? 0;

// The badges the sidebar shows. Each is asked for only when the user has
// that menu: Flags shows the customers with an open flag (one raise or
// dismiss settles all of a customer's flags), refreshed by the flag channel.
// Teller shows the cash transfers waiting for this user (a custodian's
// requisitions and returns, cash sent to their till); it isn't pushed, so
// it is read every 45 seconds.
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

  const worksTill = (menus ?? []).some(
    (m) => m?.menu_name === "Teller" && m?.status === 1 && (m.actions ?? []).some((a) => matchesAction(a?.action_name ?? a?.name, "Self")),
  );
  const [waiting, setWaiting] = useState(0);
  useEffect(() => {
    if (!worksTill) {
      setWaiting(0);
      return undefined;
    }
    const read = () =>
      tellerApi
        .transfers({ awaits_me: true })
        .then((r) => setWaiting(rowsOf(r).length))
        .catch(() => {});
    read();
    const timer = window.setInterval(read, TELLER_EVERY);
    return () => window.clearInterval(timer);
  }, [worksTill]);
  return { Flags: flags, Teller: waiting };
}
