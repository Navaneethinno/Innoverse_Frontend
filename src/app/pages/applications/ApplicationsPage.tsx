import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { AlertCircle, AppWindow } from "lucide-react";
import { useAuthStore } from "../../features/auth/auth.store";
import { useInstitutionStore } from "../../features/institution/institution.store";
import { apiService } from "../../features/api.service";
import { Skeleton } from "../../components/ui/skeleton";
import { notifications } from "../../lib/notifications";
import type { Application } from "../../features/applications/application.types";

const glass = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "0 4px 24px rgba(108,127,255,0.08), 0 1px 3px rgba(108,127,255,0.04)",
};

export function ApplicationsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isPlatformOwner = currentUser?.institution?.type === "PLATFORM_OWNER";

  const { institutions, fetchInstitutions } = useInstitutionStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInst, setSelectedInst] = useState("");
  const [selectedApp, setSelectedApp] = useState("");
  const [assigning, setAssigning] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setApplications(await apiService.getApplications());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load applications");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    if (isPlatformOwner) void fetchInstitutions();
  }, [fetchInstitutions, isPlatformOwner]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst || !selectedApp) {
      notifications.error("Select both institution and application");
      return;
    }
    setAssigning(true);
    try {
      await apiService.assignApplication(selectedInst, selectedApp);
      notifications.success("Application assigned to institution");
      setSelectedInst("");
      setSelectedApp("");
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to assign application");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="pt-4 pb-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Management</p>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Applications</h1>
        <p className="text-sm text-slate-400 mt-1.5 font-medium">{applications.length} available</p>
      </motion.div>

      {isPlatformOwner && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 mb-6" style={glass}>
          <h2 className="text-sm font-bold text-slate-800 mb-4">Assign to Institution</h2>
          <form onSubmit={handleAssign} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Institution</label>
              <select
                value={selectedInst}
                onChange={(e) => setSelectedInst(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(108,127,255,0.15)" }}
              >
                <option value="">Select institution…</option>
                {institutions.map((i) => (
                  <option key={i.id} value={String(i.id)}>{i.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Application</label>
              <select
                value={selectedApp}
                onChange={(e) => setSelectedApp(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(108,127,255,0.15)" }}
              >
                <option value="">Select application…</option>
                {applications.map((a) => (
                  <option key={a.id} value={String(a.id)}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <motion.button
                type="submit" disabled={assigning}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-200/50 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
              >
                {assigning ? "Assigning…" : "Assign"}
              </motion.button>
            </div>
          </form>
        </motion.div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
          <AlertCircle size={14} /> {error}
          <button onClick={load} className="ml-auto text-xs font-bold underline">Retry</button>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl overflow-hidden" style={glass}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100/80">
              {["Name", "Description", "Status"].map((h) => (
                <th key={h} className="text-center px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <td key={j} className="px-5 py-3.5"><Skeleton className="h-4 w-24 mx-auto" /></td>
                  ))}
                </tr>
              ))
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                      <AppWindow size={20} className="text-indigo-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-600">No applications found</p>
                  </div>
                </td>
              </tr>
            ) : (
              applications.map((a, i) => (
                <motion.tr
                  key={a.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  className="border-b border-slate-50 hover:bg-white/60 transition-colors"
                >
                  <td className="px-5 py-3.5 text-xs font-bold text-slate-700 text-center">{a.name}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 text-center">{a.description ?? "-"}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 text-center">{a.status ?? "-"}</td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
