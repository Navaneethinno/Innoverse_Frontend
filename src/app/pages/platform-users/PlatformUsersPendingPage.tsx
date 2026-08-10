import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, X, AlertCircle, ClipboardCheck, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { apiService } from "../../features/api.service";
import { useAuthStore } from "../../features/auth/auth.store";
import { notifications } from "../../lib/notifications";
import type { PlatformUser } from "../../features/platform-users/platformUser.types";
import { Skeleton } from "../../components/ui/skeleton";

const glass = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "0 4px 24px rgba(108,127,255,0.08), 0 1px 3px rgba(108,127,255,0.04)",
};

export function PlatformUsersPendingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canAuthorize = user?.permissions.includes("AUTHORIZE") ?? false;

  const [pending, setPending] = useState<PlatformUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setPending(await apiService.getPendingPlatformUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pending approvals");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleApprove = async (id: string) => {
    setActing(id);
    try {
      await apiService.approvePlatformUser(id);
      notifications.success("Platform user approved");
      setPending((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (id: string) => {
    setActing(id);
    try {
      await apiService.rejectPlatformUser(id);
      notifications.success("Platform user rejected");
      setPending((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setActing(null);
    }
  };

  if (!canAuthorize) {
    return (
      <div className="pt-4 flex flex-col items-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle size={22} className="text-red-400" />
        </div>
        <p className="text-sm font-bold text-slate-700">No permission</p>
        <p className="text-xs text-slate-400 mt-1">You do not have AUTHORIZE permission</p>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Maker-Checker</p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Pending Approvals</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">{pending.length} awaiting review</p>
        </div>
        <button
          onClick={() => navigate("/platform-users")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100/80 transition-colors border border-slate-200/60"
        >
          <ArrowLeft size={14} /> Back to List
        </button>
      </motion.div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
          <AlertCircle size={14} /> {error}
          <button onClick={load} className="ml-auto text-xs font-bold underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl overflow-hidden" style={glass}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100/80">
              {["Code", "Name", "Legal Name", "Email", "Owner", "Created By", "Reviewed By", "Created At", "Actions"].map((h) => (
                <th key={h} className="text-center px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-5 py-3.5"><Skeleton className="h-4 w-20" /></td>
                  ))}
                </tr>
              ))
            ) : pending.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                      <ClipboardCheck size={20} className="text-emerald-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-600">All caught up</p>
                    <p className="text-xs text-slate-400">No pending approvals</p>
                  </div>
                </td>
              </tr>
            ) : (
              pending.map((u, i) => (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className="border-b border-slate-50 hover:bg-white/60 transition-colors"
                >
                  <td className="px-5 py-3.5 text-xs font-bold text-slate-700 font-mono text-center">{u.code}</td>
                  <td className="px-5 py-3.5 text-xs font-semibold text-slate-800 text-center">{u.name}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 text-center">{u.legal_name}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 text-center">{u.email}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-400 text-center">{u.owner?.name ?? "-"}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-400 text-center">{u.created_by?.name ?? "-"}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-400 text-center">{u.approved_by?.name ?? "-"}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-400 text-center">{u.created_at}</td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        disabled={acting === u.id}
                        onClick={() => handleReject(u.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-red-500 border border-red-200/60 hover:bg-red-50/60 transition-colors disabled:opacity-50"
                      >
                        <X size={11} /> Reject
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        disabled={acting === u.id}
                        onClick={() => handleApprove(u.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white shadow-md shadow-emerald-200/50 disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #6EDFC4 0%, #3BBFA0 100%)" }}
                      >
                        <Check size={11} /> Approve
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
