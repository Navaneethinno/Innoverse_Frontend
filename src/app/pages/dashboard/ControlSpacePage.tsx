import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Building2, CheckCircle, Clock, Shield, TrendingUp, Zap } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { useInstitutionStore } from "../../features/institution/institution.store";
import { useAuthStore } from "../../features/auth/auth.store";
import { apiService } from "../../features/api.service";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/ErrorState";
import type { PendingRequestOut } from "../../features/maker-checker.types";

const tile = "rounded-2xl p-5 border overflow-hidden relative";
const glass = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "0 4px 24px rgba(108,127,255,0.08), 0 1px 3px rgba(108,127,255,0.04)",
};

function StatCard({ label, value, sub, gradient, icon: Icon, delay = 0 }: {
  label: string; value: number | string; sub?: string;
  gradient: string; icon: React.ElementType; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(tile, "flex flex-col gap-4")} style={glass}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md shrink-0", gradient)}>
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

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  ADD:    { bg: "bg-emerald-50", text: "text-emerald-700" },
  EDIT:   { bg: "bg-blue-50",    text: "text-blue-700" },
  DELETE: { bg: "bg-red-50",     text: "text-red-700" },
};

export function ControlSpacePage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const isPlatformOwner = currentUser?.institution?.type === "PLATFORM_OWNER";
  const { institutions, isLoading: iL, error: iE, fetchInstitutions } = useInstitutionStore();
  const [allPending, setAllPending] = useState<PendingRequestOut[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  useEffect(() => {
    void fetchInstitutions();
    setPendingLoading(true);
    apiService.getAllPending()
      .then(setAllPending)
      .catch(() => setAllPending([]))
      .finally(() => setPendingLoading(false));
  }, [fetchInstitutions]);

  const stats = useMemo(() => ({
    total: institutions.length,
    active: institutions.filter((i) => i.auth_status === "ACTIVE").length,
    pending: institutions.filter((i) => ["ADD_AUTH", "EDIT_AUTH", "DEL_AUTH"].includes(i.auth_status ?? "")).length,
    reviews: allPending.length,
  }), [institutions, allPending]);

  const recentPending = allPending.slice(0, 5);

  if (iL) return <div className="pt-6"><LoadingState lines={4} /></div>;
  if (iE) return <div className="pt-6"><ErrorState title="Dashboard unavailable" description={iE} onRetry={() => { void fetchInstitutions(); }} /></div>;

  return (
    <div className="pt-4 pb-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="flex items-end justify-between mb-6"
      >
        <div>
          <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Control Space</p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Good morning, {currentUser?.username ?? "Admin"}</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">Here's what's happening across your workspace.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/pending")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-200/50"
          style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
        >
          <Zap size={14} />
          Pending Approvals
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6 sm:col-span-3">
          <StatCard label="Institutions" value={stats.total} sub="Total registered" gradient="bg-gradient-to-br from-[#6C7FFF] to-[#B39DFA]" icon={Building2} delay={0.05} />
        </div>
        <div className="col-span-6 sm:col-span-3">
          <StatCard label="Active" value={stats.active} sub="Fully operational" gradient="bg-gradient-to-br from-[#6EDFC4] to-[#3BBFA0]" icon={CheckCircle} delay={0.10} />
        </div>
        <div className="col-span-6 sm:col-span-3">
          <StatCard label="Pending Auth" value={stats.pending} sub="Awaiting approval" gradient="bg-gradient-to-br from-[#FFB3A0] to-[#FF8C6B]" icon={Clock} delay={0.15} />
        </div>
        <div className="col-span-6 sm:col-span-3">
          <StatCard label="My Pending" value={stats.reviews} sub="Needs your action" gradient="bg-gradient-to-br from-[#FFCB6B] to-[#F59E0B]" icon={TrendingUp} delay={0.20} />
        </div>

        {/* Recent pending requests */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={cn(tile, "col-span-12 lg:col-span-8")} style={glass}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">Recent Pending Requests</h2>
            <button onClick={() => navigate("/pending")}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors">
              View all <ArrowRight size={12} />
            </button>
          </div>
          {pendingLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 rounded-xl animate-pulse bg-slate-100" />)}</div>
          ) : recentPending.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <CheckCircle size={24} className="text-emerald-400" />
              <p className="text-sm font-bold text-slate-500">All caught up</p>
              <p className="text-xs text-slate-400">No pending requests</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPending.map((req, i) => {
                const after = (req.after_data ?? {}) as Record<string, unknown>;
                const name = String(after.name ?? after.username ?? after.code ?? req.entity_id);
                const colors = ACTION_COLORS[req.action] ?? { bg: "bg-slate-50", text: "text-slate-600" };
                return (
                  <motion.div key={req.request_id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/60 transition-colors cursor-pointer"
                    onClick={() => navigate("/pending")}
                  >
                    <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0", colors.bg, colors.text)}>
                      {req.action}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{name}</p>
                      <p className="text-[11px] text-slate-400">{req.entity_type} · by {req.maker?.name ?? "—"}</p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-600 shrink-0">{req.approval_count}/{req.required_checker_count}</span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Platform status tile */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.30, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={cn(tile, "col-span-12 lg:col-span-4 flex flex-col justify-between")}
          style={{ ...glass, background: "linear-gradient(135deg, rgba(108,127,255,0.10) 0%, rgba(179,157,250,0.12) 50%, rgba(110,223,196,0.10) 100%)" }}
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(108,127,255,0.18), transparent 70%)" }} />
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
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />{status}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => navigate("/institutions/create")}
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-indigo-600 border border-indigo-200/60 hover:bg-white/60 transition-colors">
            + New Institution
          </button>
        </motion.div>
      </div>
    </div>
  );
}
