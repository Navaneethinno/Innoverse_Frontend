import { useEffect, useMemo, useState } from "react";
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
  { key: "institution-applications", label: "Inst Apps" },
  { key: "institution-kyc", label: "Inst KYC" },
  { key: "user-kyc", label: "User KYC" },
  { key: "modules", label: "Modules" },
  { key: "menus", label: "Menus" },
  { key: "menu-actions", label: "Menu Actions" },
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
  INSTITUTION_APPLICATION: (id) => apiService.approveInstitutionApplication(id),
  INSTITUTION_KYC: (id) => apiService.approveInstitutionKyc(id),
  USER_KYC: (id) => apiService.approveUserKyc(id),
  MODULE: (id) => apiService.approveModule(id),
  MENU: (id) => apiService.approveMenu(id),
  MENU_ACTION: (id) => apiService.approveMenuAction(id),
};

const REJECT_MAP: Record<string, (id: string) => Promise<unknown>> = {
  INSTITUTION: (id) => apiService.rejectInstitution(id),
  USER: (id) => apiService.rejectUser(id),
  PROFILE: (id) => apiService.rejectProfile(id),
  APPLICATION: (id) => apiService.rejectApplication(id),
  INSTITUTION_APPLICATION: (id) => apiService.rejectInstitutionApplication(id),
  INSTITUTION_KYC: (id) => apiService.rejectInstitutionKyc(id),
  USER_KYC: (id) => apiService.rejectUserKyc(id),
  MODULE: (id) => apiService.rejectModule(id),
  MENU: (id) => apiService.rejectMenu(id),
  MENU_ACTION: (id) => apiService.rejectMenuAction(id),
};

const TAB_LOADERS: Record<TabKey, () => Promise<PendingRequestOut[]>> = {
  all: () => apiService.getAllPending(),
  institutions: () => apiService.getPendingByInstitutions(),
  users: () => apiService.getPendingByUsers(),
  profiles: () => apiService.getPendingByProfiles(),
  applications: () => apiService.getPendingByApplications(),
  "institution-applications": () => apiService.getPendingInstitutionApplications(
    useAuthStore.getState().user?.institution?.id ?? ""
  ),
  "institution-kyc": () => apiService.getPendingInstitutionKyc(),
  "user-kyc": () => apiService.getPendingUserKyc(),
  modules: () => apiService.getPendingModules(),
  menus: () => apiService.getPendingMenus(),
  "menu-actions": () => apiService.getPendingMenuActions(),
};

function normalizeEntityType(entityType: string) {
  return entityType.toUpperCase().replace(/-/g, "_");
}

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
      if (tab === "institution-applications" && !currentUser?.institution?.id) {
        setRequests([]);
        return;
      }
      const data = await TAB_LOADERS[tab]();
      setRequests(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pending requests");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load(activeTab);
  }, [activeTab]);

  const title = useMemo(() => {
    const item = TABS.find((tab) => tab.key === activeTab);
    return item?.label ?? "Pending";
  }, [activeTab]);

  const handleDecision = async (request_id: string, decision: "approve" | "reject") => {
    const req = requests.find((r) => r.request_id === request_id);
    if (!req) return;
    if (String(req.maker?.id) === String(currentUser?.id)) {
      toast.error("You cannot authorize your own request");
      return;
    }

    const entityType = normalizeEntityType(req.entity_type);
    const fn = decision === "approve" ? APPROVE_MAP[entityType] : REJECT_MAP[entityType];
    if (!fn) {
      toast.error(`Unsupported entity type: ${req.entity_type}`);
      return;
    }

    try {
      await fn(request_id);
      toast.success(decision === "approve" ? "Request approved" : "Request rejected");
      setRequests((prev) => prev.filter((r) => r.request_id !== request_id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Failed to ${decision}`);
    }
  };

  return (
    <div className="pt-4 pb-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Maker-Checker</p>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{title}</h1>
        <p className="text-sm text-slate-400 mt-1.5 font-medium">
          {isLoading ? "Loading…" : `${requests.length} request${requests.length !== 1 ? "s" : ""} awaiting action`}
        </p>
      </motion.div>

      <div className="flex items-center gap-1 mb-5 p-1 rounded-xl w-fit flex-wrap" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.85)" }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === key ? "text-white shadow-md" : "text-slate-500 hover:text-indigo-600",
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
        onApprove={(request_id) => handleDecision(request_id, "approve")}
        onReject={(request_id) => handleDecision(request_id, "reject")}
        entityLabel={activeTab}
      />
    </div>
  );
}
