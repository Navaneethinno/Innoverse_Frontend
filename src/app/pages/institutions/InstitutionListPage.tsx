import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { AlertCircle, Building2, Check, ClipboardCheck, Plus, Search, X } from "lucide-react";
import { InstitutionCard } from "./components/InstitutionCard";
import { EmptyState } from "../../components/common/EmptyState";
import { Skeleton } from "../../components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { useInstitutionStore } from "../../features/institution/institution.store";
import { useAuthStore } from "../../features/auth/auth.store";
import { cn } from "../../lib/utils";
import { toast } from "sonner";

const glass = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "0 4px 24px rgba(108,127,255,0.08), 0 1px 3px rgba(108,127,255,0.04)",
};

export function InstitutionListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | "pending">("all");

  const {
    institutions, pendingInstitutions, isLoading, error,
    fetchInstitutions, fetchPendingInstitutions, approveInstitution, rejectInstitution,
  } = useInstitutionStore();

  const currentUser = useAuthStore((s) => s.user);
  const isPlatformOwner = currentUser?.institution?.type === "PLATFORM_OWNER";

  useEffect(() => {
    void fetchInstitutions();
    if (isPlatformOwner) void fetchPendingInstitutions();
  }, [fetchInstitutions, fetchPendingInstitutions, isPlatformOwner]);

  const visibleInstitutions = useMemo(() => {
    if (isPlatformOwner) return institutions;
    return institutions.filter((inst) => String(inst.id) === String(currentUser?.institution_id));
  }, [institutions, isPlatformOwner, currentUser?.institution_id]);

  const filtered = useMemo(
    () =>
      visibleInstitutions.filter((inst) => {
        const q = search.toLowerCase();
        const matchSearch = !q
          || (inst.name ?? "").toLowerCase().includes(q)
          || (inst.legal_name ?? "").toLowerCase().includes(q)
          || (inst.code ?? "").toLowerCase().includes(q)
          || (inst.city ?? "").toLowerCase().includes(q);
        const matchStatus = statusFilter === "all" || inst.status?.toLowerCase() === statusFilter;
        return matchSearch && matchStatus;
      }),
    [visibleInstitutions, search, statusFilter],
  );

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "pending", label: "Pending" },
    { value: "suspended", label: "Suspended" },
    { value: "draft", label: "Draft" },
  ];

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

  return (
    <div className="pt-4 pb-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Registry</p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Institutions</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">
            {visibleInstitutions.length} registered · {visibleInstitutions.filter((i) => i.status?.toLowerCase() === "active").length} active
          </p>
        </div>
        {isPlatformOwner && (
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/institutions/create")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-200/50"
            style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
          >
            <Plus size={14} />
            <span className="hidden sm:inline">New Institution</span>
            <span className="sm:hidden">New</span>
          </motion.button>
        )}
      </div>

      {/* Tabs */}
      {isPlatformOwner && (
        <div className="flex items-center gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.85)" }}>
          {(["all", "pending"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === tab
                  ? "text-white shadow-md"
                  : "text-slate-500 hover:text-indigo-600"
              )}
              style={activeTab === tab ? { background: "linear-gradient(135deg, #6C7FFF, #B39DFA)" } : {}}
            >
              {tab === "pending" && (
                <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black flex items-center justify-center">
                  {pendingInstitutions.length}
                </span>
              )}
              {tab === "all" ? "All Institutions" : "Pending Approvals"}
            </button>
          ))}
        </div>
      )}

      {activeTab === "all" ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Search institutions…" className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" style={{ background: "rgba(255,255,255,0.65)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.85)" }} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {filterOptions.map(({ value, label }) => (
                <button key={value} onClick={() => setStatusFilter(value)} className={cn("px-3 py-1.5 rounded-full text-xs font-bold transition-all border", statusFilter === value ? "text-white border-transparent shadow-md shadow-indigo-200/50" : "text-slate-500 hover:text-indigo-600 hover:border-indigo-200")} style={statusFilter === value ? { background: "linear-gradient(135deg, #6C7FFF, #B39DFA)", border: "none" } : { background: "rgba(255,255,255,0.65)", backdropFilter: "blur(12px)", borderColor: "rgba(255,255,255,0.85)" }}>{label}</button>
              ))}
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Failed to load institutions</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>{error}</span>
                <button className="text-sm font-medium underline" onClick={() => void fetchInstitutions()}>Retry</button>
              </AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.85)" }}>
                  <Skeleton className="h-11 w-11 rounded-xl mb-4" />
                  <Skeleton className="h-4 w-2/3 mb-2" />
                  <Skeleton className="h-3 w-1/2 mb-6" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <EmptyState title="No institutions found" description="Adjust your search or filter criteria" />
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((inst, index) => <InstitutionCard key={inst.id} inst={inst} index={index} />)}
            </div>
          )}
        </>
      ) : (
        <>
          {error && (
            <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
              <AlertCircle size={14} /> {error}
              <button onClick={() => void fetchPendingInstitutions()} className="ml-auto text-xs font-bold underline">Retry</button>
            </div>
          )}

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl overflow-hidden" style={glass}>
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
        </>
      )}
    </div>
  );
}
