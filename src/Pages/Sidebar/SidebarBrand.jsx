import { motion } from "motion/react";
import { useBrandTheme } from "@/Hooks/Providers/BrandThemeProvider";

// The signed-in institution's logo and display name (login branding), at the
// top of the sidebar while it is open. Nothing shows until the branding has
// either; with the sidebar collapsed they show in the top bar instead.
export function SidebarBrand({ isCollapsed }) {
  const { logoUrl, displayName } = useBrandTheme();
  if (isCollapsed || (!logoUrl && !displayName)) return null;

  const mark = logoUrl ? (
    <img src={logoUrl} alt={displayName ?? ""} className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-1 shadow-sm" />
  ) : (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-base font-black text-primary-foreground shadow-sm">
      {displayName.charAt(0).toUpperCase()}
    </span>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-3 py-2.5"
    >
      {mark}
      {displayName && <span className="min-w-0 truncate text-sm font-bold text-foreground" title={displayName}>{displayName}</span>}
    </motion.div>
  );
}
