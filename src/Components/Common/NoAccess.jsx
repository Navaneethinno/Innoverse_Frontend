import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

// Shown instead of a screen the user's profile doesn't grant View on.
export function NoAccess() {
  const { t } = useTranslation("common");
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card px-6 py-16 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary">
        <Lock size={18} />
      </span>
      <p className="text-sm font-bold text-slate-800">{t("noAccessTitle")}</p>
      <p className="text-xs text-muted-foreground">{t("noAccessHint")}</p>
    </div>
  );
}
