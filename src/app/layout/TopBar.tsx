import { useMemo, useState, useRef, useEffect } from "react";
import { Bell, ChevronRight, Command, LogOut, Settings, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../lib/utils";
import { useSidebar } from "./SidebarContext";
import { useAuthStore } from "../features/auth/auth.store";

export function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const crumbs = useMemo(() => {
    if (pathname.startsWith("/institutions/")) return ["Institutions", "Detail"];
    if (pathname.startsWith("/institutions")) return ["Institutions"];
    if (pathname.startsWith("/users")) return ["Users"];
    if (pathname.startsWith("/profiles")) return ["Profiles"];
    if (pathname.startsWith("/applications")) return ["Applications"];
    return ["Dashboard"];
  }, [pathname]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const { collapsed } = useSidebar();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const leftOffset = collapsed ? 56 + 12 + 8 : 200 + 12 + 8;

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
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.90)",
          boxShadow: "0 8px 32px rgba(108,127,255,0.10), 0 1px 3px rgba(108,127,255,0.06)",
        }}
      >
        {/* Brand */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-indigo-50/80 transition-colors shrink-0 group"
        >
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#6C7FFF] to-[#B39DFA] flex items-center justify-center shadow-sm shadow-indigo-200/60">
            <Sparkles size={11} className="text-white" />
          </div>
          <span className="hidden sm:block text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 leading-none tracking-tight">
            Innoverse
          </span>
        </button>

        <div className="w-px h-4 bg-slate-200/80 shrink-0" />

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 flex-1 min-w-0" aria-label="Breadcrumb">
          {crumbs.map((crumb, i) => (
            <span key={crumb} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight size={11} className="text-slate-300 shrink-0" />}
              <span
                className={cn(
                  "text-xs truncate font-medium",
                  i === crumbs.length - 1 ? "text-slate-700" : "text-slate-400"
                )}
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 transition-colors text-xs font-mono">
            <Command size={11} />
            <span className="text-[10px]">⌘K</span>
          </button>

          <button
            onClick={() => navigate("/institutions")}
            className="relative p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/80 transition-colors"
          >
            <Bell size={15} strokeWidth={1.8} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#6C7FFF] to-[#B39DFA]" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100/80 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6C7FFF] to-[#B39DFA] text-white flex items-center justify-center text-[11px] font-bold shadow-sm shadow-indigo-200/50">
                {user?.username?.charAt(0).toUpperCase() ?? "A"}
              </div>
              <span className="hidden sm:block text-xs font-semibold text-slate-600">{user?.username ?? "Admin"}</span>
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
                    background: "rgba(255,255,255,0.92)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.95)",
                    boxShadow: "0 16px 48px rgba(108,127,255,0.14), 0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  <div className="px-4 py-3 border-b border-slate-100/80">
                    <p className="text-xs font-bold text-slate-800">{user?.username ?? "Admin"}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{user?.institution?.name ?? "Platform"}</p>
                  </div>
                  <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-indigo-50/60 transition-colors">
                    <Settings size={13} /> Settings
                  </button>
                  <button
                    onClick={() => { logout(); navigate("/login"); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50/60 transition-colors border-t border-slate-100/60"
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
