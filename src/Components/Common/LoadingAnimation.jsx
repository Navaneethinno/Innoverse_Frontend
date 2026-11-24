import { useTranslation } from "react-i18next";

// Loading: three dots pulsing in turn, in the institution's colour. Plain SVG
// and CSS (index.css: .la-dot), no animation player, so it works under the
// admin portal's strict Content-Security-Policy (no WebAssembly). The box
// keeps the 4:1 shape the call sites were sized for.
export function LoadingAnimation({ className = "h-16 w-64" }) {
  const { t } = useTranslation();
  return (
    <div className={className} role="status" aria-label={t("common:loading")}>
      <svg viewBox="0 0 200 50" className="h-full w-full" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <circle key={i} className="la-dot" cx={70 + i * 30} cy="25" r="9" fill="var(--primary)" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </svg>
    </div>
  );
}
