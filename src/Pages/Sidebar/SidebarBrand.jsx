import { useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { House } from "lucide-react";
import { useBrandTheme } from "@/Hooks/Providers/BrandThemeProvider";

// A logo this much wider than tall is a wordmark: it gets the full width of
// the card instead of a small square tile.
const WIDE_RATIO = 1.6;

// The signed-in institution's logo and display name (login branding), at the
// top of the sidebar while it is open. Nothing shows until the branding has
// either; with the sidebar collapsed they show in the top bar instead.
//
// The card follows the logo's shape: a square mark sits in a tile beside the
// name, a wide wordmark spans the card with the name as a caption under it.
// The whole card is the way home: it opens the main dashboard.
export function SidebarBrand({ isCollapsed }) {
  const { t } = useTranslation("layout");
  const navigate = useNavigate();
  const { logoUrl, displayName } = useBrandTheme();
  const [ratio, setRatio] = useState(null);
  if (isCollapsed || (!logoUrl && !displayName)) return null;

  const wide = logoUrl && ratio != null && ratio >= WIDE_RATIO;
  const caption = t("adminPortal");
  const onLoad = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    if (w && h) setRatio(w / h);
  };

  return (
    <motion.button
      type="button"
      onClick={() => navigate("/dashboard")}
      title={t("backToDashboard")}
      aria-label={t("backToDashboard")}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group relative w-full overflow-hidden rounded-2xl border border-[var(--primary-light)] px-3 py-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--primary)_45%,transparent)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 14%, var(--card)) 0%, var(--card) 72%)" }}
    >
      {/* A soft brand glow in the corner, and the home hint on hover. */}
      <span className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full opacity-60 blur-2xl transition-opacity group-hover:opacity-90" style={{ background: "color-mix(in srgb, var(--primary) 35%, transparent)" }} aria-hidden="true" />
      <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-lg bg-card/80 text-muted-foreground opacity-0 shadow-sm ring-1 ring-black/5 transition-all duration-200 group-hover:opacity-100 group-hover:text-primary" aria-hidden="true">
        <House size={12} />
      </span>
      {wide ? (
        <div className="flex flex-col gap-2">
          <div className="flex h-12 items-center rounded-xl bg-white px-3 shadow-sm ring-1 ring-black/5">
            <img src={logoUrl} alt={displayName ?? ""} onLoad={onLoad} className="max-h-9 w-full object-contain object-left" />
          </div>
          {displayName && (
            <p className="truncate px-0.5 text-xs font-bold text-foreground" title={displayName}>
              {displayName}
              <span className="ml-1.5 font-semibold text-muted-foreground">· {caption}</span>
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-105">
              <img src={logoUrl} alt={displayName ?? ""} onLoad={onLoad} className="h-full w-full object-contain" />
            </span>
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-black text-primary-foreground shadow-sm">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            {displayName && (
              <p className="truncate text-sm font-extrabold leading-tight text-foreground" title={displayName}>
                {displayName}
              </p>
            )}
            <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-primary" style={{ background: "color-mix(in srgb, var(--primary) 14%, transparent)" }}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span className="truncate">{caption}</span>
            </span>
          </div>
        </div>
      )}
    </motion.button>
  );
}
