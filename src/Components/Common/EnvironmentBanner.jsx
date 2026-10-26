import { useTranslation } from "react-i18next";
import { useEnvironment } from "@/Utils/Lib/environment";

// A strip across the top of every screen, login included, while the API
// says it is the UAT (test) environment. It cannot be dismissed. It takes
// the theme's brand colour: the institution's once signed in, InnoVerse's
// default on the login page.
export function EnvironmentBanner() {
  const { t } = useTranslation("common");
  if (useEnvironment() !== "UAT") return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] flex items-center justify-center gap-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] shadow-sm"
      style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      {t("uatBanner")}
    </div>
  );
}
