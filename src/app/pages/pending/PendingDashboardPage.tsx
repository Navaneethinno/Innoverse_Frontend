import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { AlertCircle, Search } from "lucide-react";
import { useAuthStore } from "../../features/auth/auth.store";
import { apiService } from "../../features/api.service";
import { PendingTable } from "../../components/common/PendingTable";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import type { PendingRequestOut } from "../../features/maker-checker.types";

const TABS = [
  { key: "all",                      label: "All" },
  { key: "institutions",             label: "Institutions" },
  { key: "users",                    label: "Users" },
  { key: "profiles",                 label: "Profiles" },
  { key: "applications",             label: "Applications" },
  { key: "institution-applications", label: "Institution Apps" },
  { key: "institution-kyc",          label: "Institution KYC" },
  { key: "user-kyc",                 label: "User KYC" },
  { key: "modules",                  label: "Modules" },
  { key: "menus",                    label: "Menus" },
  { key: "menu-actions",             label: "Menu Actions" },
] as const;

type TabKey = typeof TABS[number]["key"];

const TAB_LOADERS: Record<TabKey, () => Promise<PendingRequestOut[]>> = {
  "all":                      () => apiService.getAllPending(),
  "institutions":             () => apiService.getPendingByInstitutions(),
  "users":                    () => apiService.getPendingByUsers(),
  "profiles":                 () => apiService.getPendingByProfiles(),
  "applications":             () => apiService.getPendingByApplications(),
  "institution-applications": () => apiService.getPendingByInstitutionApplications(),
  "institution-kyc":          () => apiService.getPendingByInstitutionKyc(),
  "user-kyc":                 () => apiService.getPendingByUserKyc(),
  "modules":                  () => apiService.getPendingByModules(),
  "menus":                    () => apiService.getPendingByMenus(),
  "menu-actions":             () => apiService.getPendingByMenuActions(),
};

function normalizeEntityType(entityType: string) {
  return entityType.toUpperCase().replace(/-/g, "_");
}

const APPROVE_MAP: Record<string, (id: string, remark?: string | null) => Promise<unknown>> = {
  INSTITUTION:             (id, r) => apiService.approveInstitution(id, { remark: r }),
  USER:                    (id, r) => apiService.approveUser(id, { remark: r }),
  PROFILE:                 (id, r) => apiService.approveProfile(id, { remark: r }),
  APPLICATION:             (id, r) => apiService.approveApplication(id, { remark: r }),
  INSTITUTION_APPLICATION: (id, r) => apiService.approveInstitutionApplication(id, { remark: r }),
  INSTITUTION_KYC:         (id, r) => apiService.approveInstitutionKyc(id, { remark: r }),
  USER_KYC:                (id, r) => apiService.approveUserKyc(id, { remark: r }),
  MODULE:                  (id, r) => apiService.approveModule(id, { remark: r }),
  MENU:                    (id, r) => apiService.approveMenu(id, { remark: r }),
  MENU_ACTION:             (id, r) => apiService.approveMenuAction(id, { remark: r }),
};

const REJECT_MAP: Record<string, (id: string, remark?: string | null) => Promise<unknown>> = {
  INSTITUTION:             (id, r) => apiService.rejectInstitution(id, { remark: r }),
  USER:                    (id, r) => apiService.rejectUser(id, { remark: r }),
  PROFILE:                 (id, r) => apiService.rejectProfile(id, { remark: r }),
  APPLICATION:             (id, r) => apiService.rejectApplication(id, { remark: r }),
  INSTITUTION_APPLICATION: (id, r) => apiService.rejectInstitutionApplication(id, { remark: r }),
  INSTITUTION_KYC:         (id, r) => apiService.rejectInstitutionKyc(id, { remark: r }),
  USER_KYC:                (id, r) => apiService.rejectUserKyc(id, { remark: r }),
  MODULE:                  (id, r) => apiService.rejectModule(id, { remark: r }),
  MENU:                    (id, r) => apiService.rejectMenu(id, { remark: r }),
  MENU_ACTION:             (id, r) => apiService.rejectMenuAction(id, { remark: r }),
};

const ENTITY_DISPLAY: Record<string, string> = {
  INSTITUTION: "Institution", Institution: "Institution",
  USER: "User", User: "User",
  PROFILE: "Profile", Profile: "Profile",
  APPLICATION: "Application", Application: "Application",
  INSTITUTION_APPLICATION: "Institution Application", Institution_Application: "Institution Application", InstitutionApplication: "Institution Application",
  INSTITUTION_KYC: "Institution KYC", Institution_KYC: "Institution KYC", InstitutionKYC: "Institution KYC",
  USER_KYC: "User KYC", User_KYC: "User KYC", UserKYC: "User KYC",
  MODULE: "Module", Module: "Module",
  MENU: "Menu", Menu: "Menu",
  MENU_ACTION: "Menu Action", Menu_Action: "Menu Action", MenuAction: "Menu Action",
};

type QuickFilter = "all" | "mine" | "actionable";

export function PendingDashboardPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [requests, setRequests] = useState<PendingRequestOut[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMaker, setFilterMaker] = useState("");
  const [filterCheckerMode, setFilterCheckerMode] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  const load = async (tab: TabKey) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await TAB_LOADERS[tab]();
      setRequests(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pending requests");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(activeTab); }, [activeTab]);

  // Derived filter options from loaded data
  const entityOptions = useMemo(() =>
    Array.from(new Set(requests.map((r) => ENTITY_DISPLAY[r.entity_type] ?? r.entity_type))).sort(),
  [requests]);
  const actionOptions = useMemo(() =>
    Array.from(new Set(requests.map((r) => r.action))).sort(),
  [requests]);
  const makerOptions = useMemo(() =>
    Array.from(new Set(requests.map((r) => r.maker?.name).filter(Boolean) as string[])).sort(),
  [requests]);

  const filtered = useMemo(() => {
    let list = requests;

    if (quickFilter === "mine" && currentUser) {
      list = list.filter((r) => String(r.maker?.id) === String(currentUser.id));
    } else if (quickFilter === "actionable" && currentUser) {
      list = list.filter((r) => String(r.maker?.id) !== String(currentUser.id));
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) => {
        const after = (r.after_data ?? {}) as Record<string, unknown>;
        const before = (r.before_data ?? {}) as Record<string, unknown>;
        const name = String(after.name ?? after.username ?? after.code ?? before.name ?? before.username ?? before.code ?? r.entity_id);
        return (
          name.toLowerCase().includes(q) ||
          (r.maker?.name ?? "").toLowerCase().includes(q) ||
          r.entity_type.toLowerCase().includes(q)
        );
      });
    }
    if (filterEntity) {
      list = list.filter((r) => (ENTITY_DISPLAY[r.entity_type] ?? r.entity_type) === filterEntity);
    }
    if (filterAction) {
      list = list.filter((r) => r.action === filterAction);
    }
    if (filterStatus) {
      list = list.filter((r) => r.auth_status === filterStatus);
    }
    if (filterMaker) {
      list = list.filter((r) => r.maker?.name === filterMaker);
    }
    if (filterCheckerMode) {
      list = list.filter((r) => (r.checker_mode ?? "ANY") === filterCheckerMode);
    }
    return list;
  }, [requests, search, filterEntity, filterAction, filterStatus, filterMaker, filterCheckerMode, quickFilter, currentUser]);

  const actionableCount = useMemo(() =>
    currentUser ? requests.filter((r) => String(r.maker?.id) !== String(currentUser.id)).length : 0,
  [requests, currentUser]);

  const handleDecision = async (request_id: string, decision: "approve" | "reject", remark?: string | null) => {
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
      await fn(request_id, remark ?? null);
      toast.success(decision === "approve" ? "Request approved" : "Request rejected");
      setRequests((prev) => prev.filter((r) => r.request_id !== request_id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Failed to ${decision}`);
    }
  };

  const selectClass = "text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-300";

  return (
    <div className="pt-4 pb-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
        <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Maker-Checker</p>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Pending Requests</h1>
        <p className="text-sm text-slate-400 mt-1.5 font-medium">
          {isLoading ? "Loading…" : (
            <>
              {requests.length} request{requests.length !== 1 ? "s" : ""} awaiting authorization
              {actionableCount > 0 && (
                <span className="ml-2 text-indigo-500 font-semibold">· {actionableCount} require your action</span>
              )}
            </>
          )}
        </p>
      </motion.div>

      {/* Entity tabs */}
      <div className="flex items-center gap-1 mb-3 p-1 rounded-xl w-fit flex-wrap" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.85)" }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === key ? "text-white shadow-md" : "text-slate-500 hover:text-indigo-600",
            )}
            style={activeTab === key ? { background: "linear-gradient(135deg, #6C7FFF, #B39DFA)" } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Quick filters + search + dropdowns */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Quick filter pills */}
        {(["all", "mine", "actionable"] as QuickFilter[]).map((qf) => (
          <button
            key={qf}
            onClick={() => setQuickFilter(qf)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
              quickFilter === qf
                ? "text-white border-transparent shadow-md"
                : "text-slate-500 border-slate-200 bg-white hover:text-indigo-600",
            )}
            style={quickFilter === qf ? { background: "linear-gradient(135deg, #6C7FFF, #B39DFA)" } : {}}
          >
            {qf === "all" ? "All" : qf === "mine" ? "My Requests" : "Requires My Action"}
          </button>
        ))}

        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300 w-40"
          />
        </div>

        {/* Dropdown filters */}
        <select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)} className={selectClass}>
          <option value="">All entities</option>
          {entityOptions.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className={selectClass}>
          <option value="">All actions</option>
          {actionOptions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectClass}>
          <option value="">All statuses</option>
          <option value="ADD_AUTH">Awaiting authorization · Add</option>
          <option value="EDIT_AUTH">Awaiting authorization · Edit</option>
          <option value="DEL_AUTH">Awaiting authorization · Delete</option>
          <option value="DEAUTH">Rejected · Deauthorization</option>
          <option value="EDIT_DEAUTH">Rejected · Edit</option>
          <option value="PENDING">Pending</option>
          <option value="REJECTED">Rejected</option>
          <option value="VERIFIED">Authorized</option>
        </select>
        <select value={filterMaker} onChange={(e) => setFilterMaker(e.target.value)} className={selectClass}>
          <option value="">All makers</option>
          {makerOptions.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filterCheckerMode} onChange={(e) => setFilterCheckerMode(e.target.value)} className={selectClass}>
          <option value="">All checker modes</option>
          <option value="ANY">Any checker</option>
          <option value="ASSIGNED_PARALLEL">Assigned Parallel</option>
          <option value="ASSIGNED_SEQUENTIAL">Assigned Sequential</option>
        </select>

        {(search || filterEntity || filterAction || filterStatus || filterMaker || filterCheckerMode) && (
          <button
            onClick={() => { setSearch(""); setFilterEntity(""); setFilterAction(""); setFilterStatus(""); setFilterMaker(""); setFilterCheckerMode(""); }}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
          <AlertCircle size={14} /> {error}
          <button onClick={() => void load(activeTab)} className="ml-auto text-xs font-bold underline">Retry</button>
        </div>
      )}

      <PendingTable
        requests={filtered}
        isLoading={isLoading}
        currentUserId={currentUser?.id}
        onDecision={handleDecision}
      />
    </div>
  );
}
