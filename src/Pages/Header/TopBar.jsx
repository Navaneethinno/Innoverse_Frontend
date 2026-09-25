import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Command, KeyRound, LogOut, Menu, Moon, Sun, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Logo } from "@/Components/Common/Logo";
import { LanguageDropdown } from "@/Components/Common/LanguageDropdown";
import { useSidebar } from "../../Components/Layout/SidebarContext";
import { SIDEBAR_WIDTHS } from "@/Pages/Sidebar/DynamicSidebar";
import { useAuth } from "@/Hooks/useAuth";
import { useColorMode } from "@/Hooks/Providers/ColorModeProvider";
import { useIsMobile } from "@/Hooks/useIsMobile";
import { UiTooltip } from "@/Components/Common/UiTooltip";
export function TopBar() {
  const { t } = useTranslation(["common", "layout"]);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const { collapsed, hovering, toggleMobile } = useSidebar();
  const { mode, toggleMode } = useColorMode();
  const logout = useAuth((s) => s.logout);
  const user = useAuth((s) => s.user);
  const isMobile = useIsMobile();
  // Was keyed off `collapsed` alone, so it never reacted while the sidebar
  // was only hover-expanded (not pinned open) — the header stayed put at
  // the collapsed offset while the sidebar rail grew past it underneath,
  // visually colliding with it. Same isExpanded fix as AppLayout.jsx.
  const isExpanded = !collapsed || hovering;
  const sidebarW = isExpanded ? SIDEBAR_WIDTHS.expanded : SIDEBAR_WIDTHS.collapsed;
  // On mobile the sidebar is an off-canvas drawer, not a rail beside the
  // content (see AppLayout.jsx), so the header sits at a small fixed
  // offset instead of tracking the rail's width.
  const leftOffset = isMobile ? 12 : sidebarW + 12 + 8;
  if (pathname === "/login" || pathname === "/setup") return null;
  return (
    <motion.header
      animate={{ left: leftOffset }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-3 right-3 z-40 pointer-events-none"
    >
      <div
        className="flex items-center gap-3 h-12 px-3 rounded-2xl pointer-events-auto"
        style={{
          // Layered backgrounds: the brand-color gradient sits on top,
          // tinting the frosted blur underneath instead of a flat
          // translucent panel — same "glass with color bleeding through
          // it" treatment as the sidebar.
          background: "var(--glass-gradient), var(--glass-bg)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--glass-shadow)",
        }}
      >
        {/* Sidebar drawer toggle — mobile only, the sidebar has no other
            entry point there since it's off-canvas by default. */}
        <button
          type="button"
          onClick={toggleMobile}
          aria-label={t("layout:openMenu", "Open menu")}
          className="flex md:hidden items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary-light transition-colors shrink-0"
        >
          <Menu size={17} strokeWidth={1.8} />
        </button>

        {/* Brand */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-primary-light transition-colors shrink-0 group"
        >
          <Logo size="sm" />
          <span className="hidden sm:block text-xs font-bold text-transparent bg-clip-text bg-brand-gradient leading-none tracking-tight">
            Innoverse
          </span>
        </button>

        <div className="w-px h-4 bg-border shrink-0" />

        <span className="hidden sm:block truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {t("layout:adminPortal")}
        </span>

        <div className="flex-1 min-w-0" />

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <UiTooltip label={t("layout:keyboardShortcutsHint")}>
          <button
            type="button"
            aria-label={t("layout:keyboardShortcuts")}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-[10px] font-mono font-semibold"
          >
            <Command size={12} strokeWidth={1.8} />
            <span>K</span>
          </button>
          </UiTooltip>

          <LanguageDropdown className="hidden sm:block" />

          <UiTooltip label={mode === "dark" ? t("layout:switchToLightMode") : t("layout:switchToDarkMode")}>
          <button
            type="button"
            onClick={toggleMode}
            aria-label={mode === "dark" ? t("layout:switchToLightMode") : t("layout:switchToDarkMode")}
            className="relative p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary-light transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {mode === "dark" ? (
              <Sun size={15} strokeWidth={1.8} />
            ) : (
              <Moon size={15} strokeWidth={1.8} />
            )}
          </button>
          </UiTooltip>

          <UiTooltip label="Notifications">
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            aria-label="Notifications"
            className="relative p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary-light transition-colors"
          >
            <Bell size={15} strokeWidth={1.8} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-gradient" />
          </button>
          </UiTooltip>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-xl hover:bg-muted transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-brand-gradient text-white flex items-center justify-center text-[11px] font-bold shadow-sm">
                {user?.username?.charAt(0).toUpperCase() ?? t("layout:admin").charAt(0)}
              </div>
              <span className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-xs font-semibold text-foreground">
                  {user?.username ?? t("layout:admin")}
                </span>
                {/* user_details (raw login payload) names this field
                    inst_profile_name, not institution.name — the dropdown
                    below read the wrong path and always fell back to
                    "Platform"; same field used here. */}
                {user?.inst_profile_name && (
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {user.inst_profile_name}
                  </span>
                )}
              </span>
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-44 rounded-2xl overflow-hidden"
                  style={{
                    background: "var(--popover)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid var(--glass-border)",
                    boxShadow: "var(--glass-shadow)",
                  }}
                >
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-xs font-bold text-foreground">{user?.username ?? t("layout:admin")}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {user?.inst_profile_name ?? t("layout:platform")}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/my-profile");
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-foreground hover:bg-primary-light transition-colors"
                  >
                    <UserRound size={13} /> {t("layout:myProfile")}
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/change-password");
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-foreground hover:bg-primary-light transition-colors"
                  >
                    <KeyRound size={13} /> {t("layout:changePassword")}
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-destructive hover:bg-[var(--destructive-soft)] transition-colors border-t border-border"
                  >
                    <LogOut size={13} /> {t("common:signOut")}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
