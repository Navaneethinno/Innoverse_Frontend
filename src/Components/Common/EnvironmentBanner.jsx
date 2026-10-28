import { useTranslation } from "react-i18next";
import { useEnvironment } from "@/Utils/Lib/environment";

// A diagonal ribbon across the top-right corner of every screen, login
// included, while the API says it is the UAT (test) environment. It cannot
// be dismissed and clicks pass through it. It takes the theme's brand
// colour: the institution's once signed in, InnoVerse's default on the
// login page.
export function EnvironmentBanner() {
  const { t } = useTranslation("common");
  if (useEnvironment() !== "UAT") return null;
  return (
    <div role="status" aria-label={t("uatBanner")} title={t("uatBanner")} className="pointer-events-none fixed right-0 top-0 z-[9999] h-24 w-24 overflow-hidden">
      <div
        className="absolute right-[-38px] top-[18px] w-[150px] rotate-45 py-1 text-center text-[11px] font-black uppercase tracking-[0.25em] shadow-md"
        style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
      >
        UAT
      </div>
    </div>
  );
}
