import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFeatures } from "@/Hooks/useFeatures";
import { useMenuContext } from "@/Components/Layout/Menu/menuContext";

// On AML Setup and Risk Assessment: the institution has the feature but has
// not set it up, so onboardings are not screened / scored yet (sign-in
// `features.not_set_up`). Clears on the next refresh after the setup is
// authorised. `feature`: "aml" or "risk" (customer or merchant by module).
export function NotSetUpNotice({ feature }) {
  const { t } = useTranslation("common");
  const { not_set_up: waiting } = useFeatures();
  const module = useMenuContext()?.module;
  const key = feature === "aml" ? "aml" : module === "InnoMMS" ? "merchant_risk" : "customer_risk";
  if (!waiting.includes(key)) return null;
  return (
    <p className="mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
      <AlertTriangle size={15} className="shrink-0" /> {t(feature === "aml" ? "notSetUpAml" : "notSetUpRisk")}
    </p>
  );
}
