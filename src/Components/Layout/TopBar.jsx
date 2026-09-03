import { useMemo, useState, useRef, useEffect } from "react";
import { Bell, ChevronRight, Command, LogOut, Moon, Settings, Sparkles, Sun } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/Utils/Lib/utils";
import { useSidebar } from "./SidebarContext";
import { SIDEBAR_WIDTHS } from "./Sidebar/DynamicSidebar";
import { useAuth } from "@/Hooks/useAuth";
import { useColorMode } from "@/Hooks/Providers/ColorModeProvider";
import { getRouteMetadata } from "@/Utils/Config/routeConfig";
export function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const crumbs = useMemo(() => getRouteMetadata(pathname)?.breadcrumb ?? ["Dashboard"], [pathname]);
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const { collapsed } = useSidebar();
  const { mode, toggleMode } = useColorMode();
  const logout = useAuth((s) => s.logout);
  const user = useAuth((s) => s.user);
  const sidebarW = collapsed ? SIDEBAR_WIDTHS.collapsed : SIDEBAR_WIDTHS.expanded;
  const leftOffset = sidebarW + 12 + 8;
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
          background: "var(--glass-bg)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--glass-shadow)",
        }}
      >
        {/* Brand */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-primary-light/80 transition-colors shrink-0 group"
        >
          <div className="w-6 h-6 rounded-lg bg-brand-gradient flex items-center justify-center shadow-sm shadow-primary/20">
            <Sparkles size={11} className="text-white" />
          </div>
          <span className="hidden sm:block text-xs font-bold text-transparent bg-clip-text bg-brand-gradient leading-none tracking-tight">
            Innoverse
          </span>
        </button>

        <div className="w-px h-4 bg-border shrink-0" />

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 flex-1 min-w-0" aria-label="Breadcrumb">
          {crumbs.map((crumb, i) => (
            <span key={crumb} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight size={11} className="text-muted-foreground/60 shrink-0" />}
              <span
                className={cn(
                  "text-xs truncate font-medium",
                  i === crumbs.length - 1 ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            title="Keyboard shortcuts (Ctrl/Cmd + K)"
            aria-label="Keyboard shortcuts"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors text-[10px] font-mono font-semibold"
          >
            <Command size={12} strokeWidth={1.8} />
            <span>K</span>
          </button>

          <button
            type="button"
            onClick={toggleMode}
            title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="relative p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary-light/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {mode === "dark" ? (
              <Sun size={15} strokeWidth={1.8} />
            ) : (
              <Moon size={15} strokeWidth={1.8} />
            )}
          </button>

          <button
            onClick={() => navigate("/institutions")}
            className="relative p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary-light/80 transition-colors"
          >
            <Bell size={15} strokeWidth={1.8} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-gradient" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-xl hover:bg-muted/80 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-brand-gradient text-white flex items-center justify-center text-[11px] font-bold shadow-sm shadow-primary/20">
                {user?.username?.charAt(0).toUpperCase() ?? "A"}
              </div>
              <span className="hidden sm:block text-xs font-semibold text-foreground/80">
                {user?.username ?? "Admin"}
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
                    <p className="text-xs font-bold text-foreground">{user?.username ?? "Admin"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {user?.institution?.name ?? "Platform"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/change-password");
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-foreground/80 hover:bg-primary-light/60 transition-colors"
                  >
                    <Settings size={13} /> Settings
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors border-t border-border"
                  >
                    <LogOut size={13} /> Sign out
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
