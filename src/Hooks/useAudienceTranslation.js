import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMenuContext } from "@/Pages/Sidebar/menuContext";

// The onboarding screens are shared by EPURSE (customers) and MMS
// (merchants). On an MMS page every text is looked up with the "merchant"
// i18next context first (`<key>_merchant`), falling back to the plain,
// customer-worded key.
export function useAudienceTranslation(ns) {
  const translation = useTranslation(ns);
  const merchant = String(useMenuContext()?.module ?? "").toUpperCase() === "MMS";
  const { t } = translation;
  const audienceT = useCallback((key, options) => (merchant ? t(key, { ...options, context: "merchant" }) : t(key, options)), [t, merchant]);
  return { ...translation, t: audienceT, merchant };
}
