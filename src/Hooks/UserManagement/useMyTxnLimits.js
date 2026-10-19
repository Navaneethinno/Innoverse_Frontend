import { useEffect, useState } from "react";
import { txnLimitApi } from "@/Services/UserManagement/txnLimit.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";

// The signed-in user's own limits in force (/config/user/txn_limit/mine):
// { restricted, currencies[] }, or null until known. Read afresh each time
// a money form opens; the server still checks every call.
export function useMyTxnLimits() {
  const [mine, setMine] = useState(null);
  useEffect(() => {
    let current = true;
    txnLimitApi
      .mine()
      .then((r) => current && setMine(rowsOf(r)[0] ?? null))
      .catch(() => {});
    return () => {
      current = false;
    };
  }, []);
  return mine;
}
