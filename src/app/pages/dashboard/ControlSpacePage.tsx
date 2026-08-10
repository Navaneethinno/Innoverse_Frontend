import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Building2, CheckCircle, Clock, Plus, Shield, TrendingUp, Zap } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { useInstitutionStore } from "../../features/institution/institution.store";
import { useAuthStore } from "../../features/auth/auth.store";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/ErrorState";

const tile = "rounded-2xl p-5 border overflow-hidden relative";
const glass = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "0 4px 24px rgba(108,127,255,0.08), 0 1px 3px rgba(108,127,255,0.04)",
};

function StatCard({
  label, value, sub, gradient, icon: Icon, delay = 0,
}: {
  label: string; value: number | string; sub?: string;
  gradient: string; icon: React.ElementType; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(tile, "flex flex-col gap-4")}
      style={glass}
    >
      {/* Top row: icon + label */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md shrink-0", gradient)}>
          <Icon size={15} strokeWidth={2} />
        </div>
      </div>
      {/* Bottom row: value + sub */}
      <div>
        <p className="text-4xl font-black text-slate-800 tracking-tight leading-none">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-1.5 font-medium">{sub}</p>}
      </div>
    </motion.div>
  );
}

export function ControlSpacePage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const isPlatformOwner = currentUser?.institution?.type === "PLATFORM_OWNER";
  const { institutions, isLoading: iL, error: iE, fetchInstitutions, pendingInstitutions, fetchPendingInstitutions } = useInstitutionStore();

  useEffect(() => {
    void fetchInstitutions();
    if (isPlatformOwner) void fetchPendingInstitutions();
  }, [fetchInstitutions, fetchPendingInstitutions, isPlatformOwner]);

  const stats = useMemo(() => ({
    total: institutions.length,
    active: institutions.filter((i) => i.status === "active").length,
    pending: institutions.filter((i) => i.status === "pending" || i.status === "draft").length,
    reviews: pendingInstitutions.length,
  }), [institutions, pendingInstitutions]);

  const feed = [
    { event: "Institution approved", entity: "First National Bank", time: "2m ago", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
    { event: "Change request submitted", entity: "Pacific Savings & Trust", time: "18m ago", icon: Plus, color: "text-indigo-500", bg: "bg-indigo-50" },
    { event: "Review pending", entity: "Metro Credit Union", time: "1h ago", icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
  ];

  if (iL) return <div className="pt-6"><LoadingState lines={4} /></div>;
  if (iE) return <div className="pt-6"><ErrorState title="Dashboard unavailable" description={iE} onRetry={() => { void fetchInstitutions(); void fetchPendingInstitutions(); }} /></div>;

  return (
    <div className="pt-4 pb-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-end justify-between mb-6"
      >
        <div>
          <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Control Space</p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Good morning, {currentUser?.username ?? "Admin"}</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">Here's what's happening across your workspace.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/institutions")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-200/50 transition-shadow hover:shadow-xl hover:shadow-indigo-200/60"
          style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
        >
          <Zap size={14} />
          Pending Approvals
        </motion.button>
      </motion.div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-4">

        {/* Stat cards — row 1 */}
        <div className="col-span-6 sm:col-span-3">
          <StatCard label="Institutions" value={stats.total} sub="Total registered" gradient="bg-gradient-to-br from-[#6C7FFF] to-[#B39DFA]" icon={Building2} delay={0.05} />
        </div>
        <div className="col-span-6 sm:col-span-3">
          <StatCard label="Active" value={stats.active} sub="Fully operational" gradient="bg-gradient-to-br from-[#6EDFC4] to-[#3BBFA0]" icon={CheckCircle} delay={0.10} />
        </div>
        <div className="col-span-6 sm:col-span-3">
          <StatCard label="Pending" value={stats.pending} sub="Awaiting action" gradient="bg-gradient-to-br from-[#FFB3A0] to-[#FF8C6B]" icon={Clock} delay={0.15} />
        </div>
        <div className="col-span-6 sm:col-span-3">
          <StatCard label="Pending Approvals" value={stats.reviews} sub="Needs approval" gradient="bg-gradient-to-br from-[#FFCB6B] to-[#F59E0B]" icon={TrendingUp} delay={0.20} />
        </div>

        {/* Activity feed — large tile */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={cn(tile, "col-span-12 lg:col-span-8")}
          style={glass}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">Recent Activity</h2>
            <button
              onClick={() => navigate("/institutions")}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              All institutions <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {feed.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.event}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/60 transition-colors cursor-default"
                >
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", item.bg)}>
                    <Icon size={15} className={item.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{item.event}</p>
                    <p className="text-[11px] text-slate-400 truncate">{item.entity}</p>
                  </div>
                  <span className="text-[10px] font-medium text-slate-300 shrink-0">{item.time}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Platform status tile */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.30, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={cn(tile, "col-span-12 lg:col-span-4 flex flex-col justify-between")}
          style={{
            ...glass,
            background: "linear-gradient(135deg, rgba(108,127,255,0.10) 0%, rgba(179,157,250,0.12) 50%, rgba(110,223,196,0.10) 100%)",
          }}
        >
          {/* Decorative orb */}
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(108,127,255,0.18), transparent 70%)" }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6C7FFF] to-[#B39DFA] flex items-center justify-center shadow-md shadow-indigo-200/50">
                <Shield size={14} className="text-white" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Platform Status</h2>
            </div>
            <div className="space-y-2.5">
              {[
                { label: "Maker-checker approvals", status: "Active" },
                { label: "API pipeline", status: "Healthy" },
                { label: "Auth protection", status: "Enabled" },
              ].map(({ label, status }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">{label}</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => navigate("/institutions/create")}
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-indigo-600 border border-indigo-200/60 hover:bg-white/60 transition-colors"
          >
            <Plus size={13} /> New Institution
          </button>
        </motion.div>
      </div>
    </div>
  );
}
