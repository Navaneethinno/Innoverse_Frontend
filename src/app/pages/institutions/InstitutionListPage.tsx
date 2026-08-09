import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { AlertCircle, Building2, Plus, Search } from "lucide-react";
import { GradientMesh } from "../../legacy/legacy-components";
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
        const matchSearch = !q || inst.name.toLowerCase().includes(q) || inst.type.toLowerCase().includes(q) || inst.city.toLowerCase().includes(q);
        const matchStatus = statusFilter === "all" || inst.status === statusFilter;
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
    <div className="min-h-screen pt-20 pb-12 px-4 relative bg-[#F9FAFB]">
      <GradientMesh />
      <div className="relative max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-6 pt-2">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Institutions</h1>
            <p className="text-sm text-slate-500 mt-1">{institutions.length} registered · {institutions.filter((i) => i.status === "active").length} active</p>
          </div>
          <button onClick={() => navigate("/institutions/create")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md shadow-indigo-200/40 hover:shadow-lg hover:-translate-y-0.5 transition-all">
            <Plus size={15} />
            <span className="hidden sm:inline">New Institution</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Search institutions…" className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {filterOptions.map(({ value, label }) => (
              <button key={value} onClick={() => setStatusFilter(value)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all border", statusFilter === value ? "bg-indigo-500 text-white border-indigo-500 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600")}>{label}</button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <Skeleton className="h-10 w-10 rounded-xl mb-4" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((inst, index) => <InstitutionCard key={inst.id} inst={inst} index={index} />)}
          </div>
        )}
      </div>
    </div>
  );
}
