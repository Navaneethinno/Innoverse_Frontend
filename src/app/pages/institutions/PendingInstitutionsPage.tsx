import { useEffect } from "react";
import { motion } from "motion/react";
import { Check, X, AlertCircle, ClipboardCheck, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { useInstitutionStore } from "../../features/institution/institution.store";
import { useAuthStore } from "../../features/auth/auth.store";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "sonner";

const glass = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "0 4px 24px rgba(108,127,255,0.08), 0 1px 3px rgba(108,127,255,0.04)",
};

export function PendingInstitutionsPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const isPlatformOwner = currentUser?.institution?.type === "PLATFORM_OWNER";

  const { pendingInstitutions, isLoading, error, fetchPendingInstitutions, approveInstitution, rejectInstitution } = useInstitutionStore();

  useEffect(() => {
    void fetchPendingInstitutions();
  }, [fetchPendingInstitutions]);

  const handleApprove = async (id: string | number) => {
    const ok = await approveInstitution(id);
    if (ok) toast.success("Institution approved");
    else toast.error(useInstitutionStore.getState().error ?? "Failed to approve");
  };

  const handleReject = async (id: string | number) => {
    const ok = await rejectInstitution(id);
    if (ok) toast.success("Institution rejected");
    else toast.error(useInstitutionStore.getState().error ?? "Failed to reject");
  };

  if (!isPlatformOwner) {
    return (
      <div className="pt-4 flex flex-col items-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle size={22} className="text-red-400" />
        </div>
        <p className="text-sm font-bold text-slate-700">No permission</p>
        <p className="text-xs text-slate-400 mt-1">Only Platform Owners can access this page</p>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Maker-Checker</p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Pending Institutions</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">{pendingInstitutions.length} awaiting review</p>
        </div>
        <button
          onClick={() => navigate("/institutions")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100/80 transition-colors border border-slate-200/60"
        >
          <ArrowLeft size={14} /> Back to List
        </button>
      </motion.div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
          <AlertCircle size={14} /> {error}
          <button onClick={() => void fetchPendingInstitutions()} className="ml-auto text-xs font-bold underline">Retry</button>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl overflow-hidden" style={glass}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100/80">
              {["Code", "Name", "Type", "Email", "Created By", "Actions"].map((h) => (
                <th key={h} className="text-center px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-5 py-3.5"><Skeleton className="h-4 w-20 mx-auto" /></td>
                  ))}
                </tr>
              ))
            ) : pendingInstitutions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                      <ClipboardCheck size={20} className="text-emerald-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-600">All caught up</p>
                    <p className="text-xs text-slate-400">No pending institutions</p>
                  </div>
                </td>
              </tr>
            ) : (
              pendingInstitutions.map((inst, i) => (
                <motion.tr
                  key={inst.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className="border-b border-slate-50 hover:bg-white/60 transition-colors"
                >
                  <td className="px-5 py-3.5 text-xs font-bold text-slate-700 font-mono text-center">{inst.code}</td>
                  <td className="px-5 py-3.5 text-xs font-semibold text-slate-800 text-center">{inst.name}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 text-center">{inst.type}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 text-center">{inst.email ?? "-"}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-400 text-center">{inst.created_by?.name ?? "-"}</td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => void handleReject(inst.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-red-500 border border-red-200/60 hover:bg-red-50/60 transition-colors"
                      >
                        <X size={11} /> Reject
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => void handleApprove(inst.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white shadow-md shadow-emerald-200/50"
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
