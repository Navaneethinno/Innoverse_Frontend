import { useTranslation } from "react-i18next";
import { Compass } from "lucide-react";
import { useTour } from "./TourProvider";

// "Take a tour" in the top bar: the app's primary button (the institution's
// brand colour), starting the open page's tour from step 1.
export function TourButton() {
  const { t } = useTranslation("tour");
  const { start, running } = useTour();
  return (
    <button
      type="button"
      onClick={start}
      aria-label={t("takeTour")}
      disabled={running}
      className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
    >
      <Compass size={14} /> <span className="hidden md:inline">{t("takeTour")}</span>
    </button>
  );
}
