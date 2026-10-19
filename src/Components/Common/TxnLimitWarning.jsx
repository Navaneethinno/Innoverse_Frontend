import { useTranslation } from "react-i18next";
import { useMyTxnLimits } from "@/Hooks/UserManagement/useMyTxnLimits";
import { formatNumber } from "@/Utils/Lib/numberFormat";

// Warns before submit when the amount is above the signed-in user's own
// limit to make in this currency, or they have limits but none in it.
export function TxnLimitWarning({ currencyCode, amount }) {
  const { t } = useTranslation("users");
  const mine = useMyTxnLimits();
  if (!mine?.restricted || !currencyCode) return null;
  const limit = (mine.currencies ?? []).find((c) => c.currency_code === currencyCode);
  let message = null;
  if (!limit) message = t("noLimitInX", { currency: currencyCode });
  else if (limit.max_initiate !== "" && Number(amount) > Number(limit.max_initiate)) message = t("aboveLimitX", { value: `${formatNumber(limit.max_initiate, { min: 0, max: 4 })} ${currencyCode}` });
  if (!message) return null;
  return <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{message}</p>;
}
