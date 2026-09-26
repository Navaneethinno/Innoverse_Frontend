import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

// Joyride's tooltip, drawn with the app's own tokens (bg-card, bg-primary,
// border, radius, font) so it follows the institution's branding and dark
// mode instead of Joyride's fixed colours. Step counter + progress dots.
export function TourTooltip({ index, size, step, isLastStep, backProps, primaryProps, skipProps, closeProps, tooltipProps }) {
  const { t } = useTranslation("tour");
  return (
    <div {...tooltipProps} className="w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border bg-[var(--card)] p-4 text-[var(--card-foreground)] shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary">{t("stepOf", { step: index + 1, total: size })}</p>
        <button {...closeProps} aria-label={t("close")} className="-m-1 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X size={14} />
        </button>
      </div>
      {step.title && <h3 className="mt-1 text-sm font-black">{step.title}</h3>}
      <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.content}</div>

      <div className="mt-3 flex justify-center gap-1" aria-hidden>
        {Array.from({ length: size }, (_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-primary" : i < index ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted"}`} />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {!isLastStep && (
          <button {...skipProps} className="px-1 text-xs font-bold text-muted-foreground hover:text-foreground">
            {t("skip")}
          </button>
        )}
        <div className="ml-auto flex gap-2">
          {index > 0 && !step.hideBackButton && (
            <button {...backProps} className="rounded-xl border px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-muted">
              {t("back")}
            </button>
          )}
          <button {...primaryProps} className="rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-[var(--primary-hover)]">
            {isLastStep ? t("done") : step.data?.click ? t("nextOpens") : t("next")}
          </button>
        </div>
      </div>
    </div>
  );
}
