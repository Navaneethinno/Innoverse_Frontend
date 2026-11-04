import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useVisiblePoll } from "@/Hooks/useVisiblePoll";
import { keyCustodyApi } from "@/Services/Auth/keyCustody.api";

const KeyCustodyContext = createContext({ status: null, refresh: () => {} });

// Whether the signed-in user is a key custodian (the status call answers
// is_custodian) and the keys' state, read at sign-in and then every minute
// for custodians only. `status` is null for non-custodians.
export function KeyCustodyProvider({ children }) {
  const [status, setStatus] = useState(null);
  const [notCustodian, setNotCustodian] = useState(false);
  const refresh = useCallback(
    () =>
      keyCustodyApi
        .status()
        .then((r) => {
          const data = (Array.isArray(r?.data) ? r.data[0] : r?.data) ?? null;
          setNotCustodian(data?.is_custodian === false);
          setStatus(data?.is_custodian === false ? null : data);
        })
        .catch(() => setStatus(null)),
    [],
  );
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useVisiblePoll(refresh, 60000, !notCustodian);
  return (
    <KeyCustodyContext.Provider value={{ status, refresh }}>{children}</KeyCustodyContext.Provider>
  );
}

export const useKeyCustody = () => useContext(KeyCustodyContext);

// Across the portal, for custodians: the keys are locked.
export function KeysLockedBanner() {
  const { t } = useTranslation("keyCustody");
  const { status } = useKeyCustody();
  if (!status?.keys?.locked) return null;
  return (
    <Link
      to="/key-custody"
      className="mb-3 flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
    >
      <ShieldAlert size={16} /> {t("lockedBanner")}
    </Link>
  );
}
