import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { AlertCircle, Building2, Plus, Search } from "lucide-react";
import { InstitutionCard } from "./components/InstitutionCard";
import { EmptyState } from "../../components/common/EmptyState";
import { Skeleton } from "../../components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { useInstitutionStore } from "../../features/institution/institution.store";
import { cn } from "../../lib/utils";

export function InstitutionListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { institutions, isLoading, error, fetchInstitutions } = useInstitutionStore();

  useEffect(() => {
    void fetchInstitutions();
  }, [fetchInstitutions]);

  const filtered = useMemo(
    () =>
      institutions.filter((inst) => {
        const q = search.toLowerCase();
        const matchSearch = !q
          || (inst.name ?? "").toLowerCase().includes(q)
          || (inst.legal_name ?? "").toLowerCase().includes(q)
          || (inst.code ?? "").toLowerCase().includes(q)
          || (inst.city ?? "").toLowerCase().includes(q);
        const matchStatus = statusFilter === "all" || inst.status?.toLowerCase() === statusFilter;
        return matchSearch && matchStatus;
      }),
    [institutions, search, statusFilter],
  );

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "pending", label: "Pending" },
    { value: "suspended", label: "Suspended" },
    { value: "draft", label: "Draft" },
  ];

  return (
    <div className="pt-4 pb-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Registry</p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Institutions</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">
            {institutions.length} registered · {institutions.filter((i) => i.status?.toLowerCase() === "active").length} active
          </p>
        </div>
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
      </div>

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
    </div>
  );
}
