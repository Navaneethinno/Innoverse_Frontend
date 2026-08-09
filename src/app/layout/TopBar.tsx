import { useMemo, useState } from "react";
import { Bell, ChevronRight, Command, LogOut, Settings, Shield } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../lib/utils";

export function TopBar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const crumbs = useMemo(() => {
    if (pathname.startsWith("/institutions/")) return ["Control Space", "Institutions", "Detail"];
    if (pathname.startsWith("/institutions")) return ["Control Space", "Institutions"];
    if (pathname.startsWith("/review/")) return ["Control Space", "Review Center", "Compare"];
    if (pathname.startsWith("/review")) return ["Control Space", "Review Center"];
    if (pathname.startsWith("/setup")) return [];
    if (pathname.startsWith("/login")) return [];
    return ["Control Space"];
  }, [pathname]);
  if (pathname === "/login" || pathname === "/setup") return null;
  return (
    <header className="fixed top-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-6xl">
      <div className="flex items-center gap-2 sm:gap-3 h-12 px-3 rounded-2xl border shadow-lg" style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "rgba(124,140,255,0.18)" }}>
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-indigo-50 transition-colors shrink-0">
          <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center"><Shield size={11} className="text-white" /></div>
          <span className="hidden sm:block text-xs font-semibold text-indigo-700 leading-none">Platform Owner</span>
        </button>
        <span className="text-slate-200 text-sm hidden sm:block">|</span>
        <nav className="flex items-center gap-1 flex-1 min-w-0" aria-label="Breadcrumb">
          {crumbs.map((crumb, i) => <span key={crumb} className="flex items-center gap-1 min-w-0"><ChevronRight size={12} className={cn("shrink-0", i===0 && "hidden")} /><span className={cn("text-sm truncate", i===crumbs.length-1 ? "text-slate-700 font-medium" : "text-slate-400")}>{crumb}</span></span>)}
        </nav>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setOpen(true)} className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors text-xs"><Command size={12} /><span className="font-mono text-[11px]">⌘K</span></button>
          <button onClick={() => navigate("/review")} className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"><Bell size={15} /></button>
          <div className="relative">
            <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"><div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-300 to-purple-400 text-white flex items-center justify-center text-xs font-semibold">A</div><span className="hidden sm:block text-xs font-medium text-slate-600">Admin</span></button>
            <AnimatePresence>{open && <motion.div initial={{opacity:0,y:6,scale:.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0}} className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden">
              <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"><Settings size={14}/> Settings</button>
              <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-slate-50"><LogOut size={14}/> Sign out</button>
            </motion.div>}</AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
