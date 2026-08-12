import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { AlertCircle, ClipboardList } from "lucide-react";
import { useAuthStore } from "../../features/auth/auth.store";
import { apiService } from "../../features/api.service";
import { PendingTable } from "../../components/common/PendingTable";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import type { PendingRequestOut } from "../../features/maker-checker.types";

const TABS = [
  { key: "all", label: "All" },
  { key: "institutions", label: "Institutions" },
  { key: "users", label: "Users" },
  { key: "profiles", label: "Profiles" },
  { key: "applications", label: "Applications" },
] as const;

type TabKey = typeof TABS[number]["key"];

const glass = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "0 4px 24px rgba(108,127,255,0.08), 0 1px 3px rgba(108,127,255,0.04)",
};

const APPROVE_MAP: Record<string, (id: string) => Promise<unknown>> = {
  INSTITUTION: (id) => apiService.approveInstitution(id),
  USER: (id) => apiService.approveUser(id),
  PROFILE: (id) => apiService.approveProfile(id),
  APPLICATION: (id) => apiService.approveApplication(id),
};

const REJECT_MAP: Record<string, (id: string) => Promise<unknown>> = {
  INSTITUTION: (id) => apiService.rejectInstitution(id),
  USER: (id) => apiService.rejectUser(id),
  PROFILE: (id) => apiService.rejectProfile(id),
  APPLICATION: (id) => apiService.rejectApplication(id),
};

export function PendingDashboardPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [requests, setRequests] = useState<PendingRequestOut[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (tab: TabKey) => {
    setIsLoading(true);
    setError(null);
    try {
      let data: PendingRequestOut[];
      if (tab === "all") data = await apiService.getAllPending();
      else if (tab === "institutions") data = await apiService.getPendingByInstitutions();
      else if (tab === "users") data = await apiService.getPendingByUsers();
      else if (tab === "profiles") data = await apiService.getPendingByProfiles();
      else data = await apiService.getPendingByApplications();
      setRequests(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pending requests");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(activeTab); }, [activeTab]);

  const handleApprove = async (request_id: string) => {
    const req = requests.find((r) => r.request_id === request_id);
    if (!req) return;
    const fn = APPROVE_MAP[req.entity_type];
    if (!fn) { toast.error("Unsupported entity type"); return; }
    try {
      await fn(request_id);
      toast.success("Request approved");
      setRequests((prev) => prev.filter((r) => r.request_id !== request_id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve");
    }
  };

  const handleReject = async (request_id: string) => {
    const req = requests.find((r) => r.request_id === request_id);
    if (!req) return;
    const fn = REJECT_MAP[req.entity_type];
    if (!fn) { toast.error("Unsupported entity type"); return; }
    try {
      await fn(request_id);
      toast.success("Request rejected");
      setRequests((prev) => prev.filter((r) => r.request_id !== request_id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reject");
    }
  };

  return (
    <div className="pt-4 pb-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Maker-Checker</p>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Pending Approvals</h1>
        <p className="text-sm text-slate-400 mt-1.5 font-medium">
          {isLoading ? "Loading…" : `${requests.length} request${requests.length !== 1 ? "s" : ""} awaiting action`}
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 p-1 rounded-xl w-fit flex-wrap" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.85)" }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === key ? "text-white shadow-md" : "text-slate-500 hover:text-indigo-600"
            )}
            style={activeTab === key ? { background: "linear-gradient(135deg, #6C7FFF, #B39DFA)" } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
          <AlertCircle size={14} /> {error}
          <button onClick={() => void load(activeTab)} className="ml-auto text-xs font-bold underline">Retry</button>
        </div>
      )}

      <PendingTable
        requests={requests}
        isLoading={isLoading}
        currentUserId={currentUser?.id}
        onApprove={handleApprove}
        onReject={handleReject}
        entityLabel="pending"
      />
    </div>
  );
}
