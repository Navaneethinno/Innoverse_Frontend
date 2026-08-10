import { Outlet, useLocation, useNavigate } from "react-router";
import { LayoutDashboard, Building2, PanelLeftClose, PanelLeftOpen, Users, Layers, AppWindow } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TopBar } from "./TopBar";
import { WorkspaceContainer } from "./WorkspaceContainer";
import { SidebarStateProvider, useSidebar } from "./SidebarContext";
import { cn } from "../lib/utils";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Institutions", path: "/institutions", icon: Building2 },
  { label: "Users", path: "/users", icon: Users },
  { label: "Profiles", path: "/profiles", icon: Layers },
  { label: "Applications", path: "/applications", icon: AppWindow },
];

const SIDEBAR_EXPANDED_W = 200;
const SIDEBAR_COLLAPSED_W = 56;

function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { collapsed, toggle } = useSidebar();

  return (
    <motion.aside
      animate={{ width: collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-3 top-3 bottom-3 z-30 flex flex-col py-3 rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.90)",
        boxShadow: "0 8px 32px rgba(108,127,255,0.10), 0 1px 3px rgba(108,127,255,0.06)",
      }}
    >
      {/* Nav items */}
      <nav className="flex flex-col gap-1 px-2 flex-1 justify-center">
        {navItems.map(({ label, path, icon: Icon }) => {
          const active = pathname.startsWith(path);
          return (
            <motion.button
              key={path}
              onClick={() => navigate(path)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              aria-label={label}
              className={cn(
                "relative flex items-center gap-2.5 rounded-xl transition-colors duration-150 group h-10",
                collapsed ? "justify-center px-0 w-10 mx-auto" : "px-3 w-full",
                active
                  ? "bg-gradient-to-r from-[#6C7FFF] to-[#B39DFA] text-white shadow-md shadow-indigo-200/50"
                  : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/80"
              )}
            >
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />

              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs font-bold whitespace-nowrap overflow-hidden"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Tooltip — only when collapsed */}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-slate-800/90 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg">
                  {label}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 mt-2">
        <div className="h-px bg-gradient-to-r from-transparent via-indigo-100 to-transparent mb-3" />
        <motion.button
          onClick={toggle}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center gap-2.5 rounded-xl h-9 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/80 transition-colors",
            collapsed ? "justify-center w-10 mx-auto px-0" : "px-3 w-full"
          )}
        >
          {collapsed
            ? <PanelLeftOpen size={15} strokeWidth={1.8} />
            : <PanelLeftClose size={15} strokeWidth={1.8} />
          }
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-xs font-semibold whitespace-nowrap overflow-hidden"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.aside>
  );
}

function Layout() {
  const { collapsed } = useSidebar();
  const sidebarW = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W;

  return (
    <div className="min-h-screen flex w-full">
      <Sidebar />
      <motion.div
        animate={{ paddingLeft: sidebarW + 16 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col flex-1 min-w-0 pr-3"
      >
        <TopBar />
        <WorkspaceContainer>
          <Outlet />
        </WorkspaceContainer>
      </motion.div>
    </div>
  );
}

export function AppLayout() {
  return (
    <SidebarStateProvider>
      <Layout />
    </SidebarStateProvider>
  );
}
