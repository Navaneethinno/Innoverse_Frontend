import { useNavigate } from "react-router-dom";
import { Building2, CheckCircle, Clock, FileText, Shield } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../Utils/Lib/utils";
import { useAuth } from "../../Hooks/useAuth";
const tile = "rounded-2xl p-5 border overflow-hidden relative";
const glass = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--glass-shadow)",
};
const BREAKDOWN_GROUPS = ["Institutions", "Users", "Profiles"];
function StatCard({ label, value, sub, gradient, icon: Icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(tile, "flex flex-col gap-4")}
      style={glass}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <div
          className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md shrink-0",
            gradient,
          )}
        >
          <Icon size={15} strokeWidth={2} />
        </div>
      </div>
      <div>
        <p className="text-4xl font-black text-slate-800 tracking-tight leading-none">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-1.5 font-medium">{sub}</p>}
      </div>
    </motion.div>
  );
}
// TEMPORARY: this dashboard is intentionally static/dummy data, not wired to
// any live endpoint. It was briefly wired to the real institution/profile
// list + a pending-approvals endpoint, but the pending-approvals API isn't
// confirmed to exist yet (there is no maker-checker "list all pending across
// entities" endpoint in the official Postman collection at all — the real
// mechanism is per-entity auth_status filtering, already implemented on
// InstitutionListPage/ProfilesPage/UsersPage's own status tabs), and that
// live dependency turned a page that used to render instantly into one that
// could get stuck on a loading skeleton whenever a request was slow or
// unavailable. Restored to static zeros per explicit instruction; the
// "Pending Approvals" / "Recent Pending Requests" UI that depended on the
// fictional aggregator endpoint has been removed rather than left pointing
// at a route that no longer exists.
export function ControlSpacePage() {
  const navigate = useNavigate();
  const currentUser = useAuth((s) => s.user);
  const stats = { total: 0, active: 0, pendingRequests: 0, myRequests: 0 };
  return (
    <div className="pt-4 pb-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-6"
      >
        <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-1">
          Control Space
        </p>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
          Good morning, {currentUser?.username ?? "Admin"}
        </h1>
        <p className="text-sm text-slate-400 mt-1.5 font-medium">
          Here's what's happening across your workspace.
        </p>
      </motion.div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6 sm:col-span-3">
          <StatCard
            label="Total Institutions"
            value={stats.total}
            sub="Registered on platform"
            gradient="bg-[#2266EE]"
            icon={Building2}
            delay={0.05}
          />
        </div>
        <div className="col-span-6 sm:col-span-3">
          <StatCard
            label="Active Institutions"
            value={stats.active}
            sub="Fully operational"
            gradient="bg-gradient-to-br from-[#6EDFC4] to-[#3BBFA0]"
            icon={CheckCircle}
            delay={0.1}
          />
        </div>
        <div className="col-span-6 sm:col-span-3">
          <StatCard
            label="Pending Requests"
            value={stats.pendingRequests}
            sub="Awaiting authorization"
            gradient="bg-gradient-to-br from-[#FFB3A0] to-[#FF8C6B]"
            icon={Clock}
            delay={0.15}
          />
        </div>
        <div className="col-span-6 sm:col-span-3">
          <StatCard
            label="My Requests"
            value={stats.myRequests}
            sub="Requests you submitted"
            gradient="bg-gradient-to-br from-[#FFCB6B] to-[#F59E0B]"
            icon={FileText}
            delay={0.2}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={cn(tile, "col-span-12 lg:col-span-8 flex flex-col items-center py-8 gap-2")}
          style={glass}
        >
          <CheckCircle size={24} className="text-emerald-400" />
          <p className="text-sm font-bold text-slate-500">All caught up</p>
          <p className="text-xs text-slate-400">No pending requests</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={cn(tile, "col-span-12 lg:col-span-4 flex flex-col justify-between")}
          style={glass}
        >
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#2266EE] flex items-center justify-center shadow-md shadow-blue-200/50">
                <Shield size={14} className="text-white" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Request Breakdown</h2>
            </div>
            <div className="space-y-2">
              {BREAKDOWN_GROUPS.map((label) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">{label}</span>
                  <span className="text-xs font-bold text-slate-300">0</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => navigate("/institutions/create")}
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-blue-600 border border-blue-200/60 hover:bg-white/60 transition-colors"
          >
            + New Institution
          </button>
        </motion.div>
      </div>
    </div>
  );
}
