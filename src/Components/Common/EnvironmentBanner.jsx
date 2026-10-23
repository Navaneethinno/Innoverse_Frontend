import { useTranslation } from "react-i18next";
import { useEnvironment } from "@/Utils/Lib/environment";

// A strip across the top of every screen, login included, while the API
// says it is the UAT (test) environment. It cannot be dismissed.
export function EnvironmentBanner() {
  const { t } = useTranslation("common");
  if (useEnvironment() !== "UAT") return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-0 z-[9999] bg-amber-400 py-0.5 text-center text-[11px] font-black uppercase tracking-wider text-amber-950 shadow-sm">
      {t("uatBanner")}
    </div>
  );
}
