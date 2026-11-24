import { useTranslation } from "react-i18next";

// Nothing to show: an empty tray floating gently, in the institution's colour.
// Plain SVG and CSS (index.css: .mh-float), no animation player, so it works
// under the admin portal's strict Content-Security-Policy. 4:3 like before.
export function NoDataAnimation({ className = "h-24 w-32" }) {
  const { t } = useTranslation();
  return (
    <div className={className} role="img" aria-label={t("common:noData")}>
      <svg viewBox="0 0 120 90" className="mh-float h-full w-full" aria-hidden="true">
        <rect x="38" y="10" width="44" height="34" rx="4" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
        <rect x="46" y="19" width="22" height="3.5" rx="1.75" fill="var(--border)" />
        <rect x="46" y="28" width="15" height="3.5" rx="1.75" fill="var(--border)" />
        <path d="M14 46 L28 34 H92 L106 46 V74 a6 6 0 0 1 -6 6 H20 a6 6 0 0 1 -6 -6z" fill="color-mix(in srgb, var(--primary) 20%, var(--card))" />
        <path d="M14 46 H40 a20 10 0 0 0 40 0 H106" fill="none" stroke="var(--primary)" strokeWidth="2.5" opacity="0.7" />
      </svg>
    </div>
  );
}
