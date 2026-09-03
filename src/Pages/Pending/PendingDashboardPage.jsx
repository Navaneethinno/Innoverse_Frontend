import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { AlertCircle, Search } from "lucide-react";
import { useAuth } from "../../Hooks/useAuth";
import { PendingTable } from "@/Components/MakerChecker/PendingTable";
import { cn } from "../../Utils/Lib/utils";
import { notifications } from "@/Utils/Lib/notifications";
import {
  useApprovalMutation,
  usePendingRequestsQuery,
  useRejectionMutation,
} from "@/Hooks/MakerChecker/makerCheckerHooks";
const TABS = [
  { key: "all", label: "All" },
  { key: "institutions", label: "Institutions" },
  { key: "users", label: "Users" },
  { key: "profiles", label: "Profiles" },
  { key: "applications", label: "Applications" },
  { key: "institution-applications", label: "Institution Apps" },
  { key: "modules", label: "Modules" },
  { key: "menus", label: "Menus" },
  { key: "menu-actions", label: "Menu Actions" },
];
const ENTITY_DISPLAY = {
  INSTITUTION: "Institution",
  USER: "User",
  PROFILE: "Profile",
  APPLICATION: "Application",
  INSTITUTION_APPLICATION: "Institution Application",
  INSTITUTION_KYC: "Institution KYC",
  USER_KYC: "User KYC",
  MODULE: "Module",
  MENU: "Menu",
  MENU_ACTION: "Menu Action",
};
export function PendingDashboardPage() {
  const currentUser = useAuth((s) => s.user);
  const [activeTab, setActiveTab] = useState("all");
  const pendingQuery = usePendingRequestsQuery(activeTab === "all" ? undefined : activeTab);
  const requests = pendingQuery.data ?? [];
  const isLoading = pendingQuery.isLoading;
  const error = pendingQuery.error;
  const approvalMutation = useApprovalMutation();
  const rejectionMutation = useRejectionMutation();
  const [search, setSearch] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMaker, setFilterMaker] = useState("");
  const [filterCheckerMode, setFilterCheckerMode] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const entityOptions = useMemo(
    () =>
      Array.from(
        new Set(requests.map((r) => ENTITY_DISPLAY[r.entity_type] ?? r.entity_type)),
      ).sort(),
    [requests],
  );
  const actionOptions = useMemo(
    () => Array.from(new Set(requests.map((r) => r.action))).sort(),
    [requests],
  );
  const makerOptions = useMemo(
    () => Array.from(new Set(requests.map((r) => r.maker?.name).filter(Boolean))).sort(),
    [requests],
  );
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
        const after = r.after_data ?? {};
        const before = r.before_data ?? {};
        const name = String(
          after.name ??
            after.username ??
            after.code ??
            before.name ??
            before.username ??
            before.code ??
            r.entity_id,
        );
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
  }, [
    requests,
    search,
    filterEntity,
    filterAction,
    filterStatus,
    filterMaker,
    filterCheckerMode,
    quickFilter,
    currentUser,
  ]);
  const actionableCount = useMemo(
    () =>
      currentUser
        ? requests.filter((r) => String(r.maker?.id) !== String(currentUser.id)).length
        : 0,
    [requests, currentUser],
  );
  const handleDecision = async (request_id, decision, remark) => {
    const req = requests.find((r) => r.request_id === request_id);
    if (!req) return;
    if (String(req.maker?.id) === String(currentUser?.id)) {
      notifications.error("You cannot authorize your own request");
      return;
    }
    try {
      if (decision === "approve") {
        await approvalMutation.mutateAsync({
          requestId: request_id,
          payload: { remark: remark ?? null },
        });
      } else {
        await rejectionMutation.mutateAsync({
          requestId: request_id,
          payload: { remark: remark ?? null },
        });
      }
      notifications.success(decision === "approve" ? "Request approved" : "Request rejected");
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : `Failed to ${decision}`);
    }
  };
  const selectClass =
    "text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-300";
  return (
    <div className="pt-4 pb-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
        <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">
          Maker-Checker
        </p>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
          Pending Requests
        </h1>
        <p className="text-sm text-slate-400 mt-1.5 font-medium">
          {isLoading ? (
            "Loading…"
          ) : (
            <>
              {requests.length} request{requests.length !== 1 ? "s" : ""} awaiting authorization
              {actionableCount > 0 && (
                <span className="ml-2 text-indigo-500 font-semibold">
                  · {actionableCount} require your action
                </span>
              )}
            </>
          )}
        </p>
      </motion.div>

      {/* Entity tabs */}
      <div
        className="flex items-center gap-1 mb-3 p-1 rounded-xl w-fit flex-wrap"
        style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.85)" }}
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === key ? "text-white shadow-md" : "text-slate-500 hover:text-indigo-600",
            )}
            style={
              activeTab === key ? { background: "linear-gradient(135deg, #6C7FFF, #B39DFA)" } : {}
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Quick filters + search + dropdowns */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {["all", "mine", "actionable"].map((qf) => (
          <button
            key={qf}
            onClick={() => setQuickFilter(qf)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
              quickFilter === qf
                ? "text-white border-transparent shadow-md"
                : "text-slate-500 border-slate-200 bg-white hover:text-indigo-600",
            )}
            style={
              quickFilter === qf ? { background: "linear-gradient(135deg, #6C7FFF, #B39DFA)" } : {}
            }
          >
            {qf === "all" ? "All" : qf === "mine" ? "My Requests" : "Requires My Action"}
          </button>
        ))}

        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300 w-40"
          />
        </div>

        <select
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          className={selectClass}
        >
          <option value="">All entities</option>
          {entityOptions.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className={selectClass}
        >
          <option value="">All actions</option>
          {actionOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={selectClass}
        >
          <option value="">All statuses</option>
          <option value="NEW_AUTH">Pending · Add</option>
          <option value="EDIT_AUTH">Pending · Edit</option>
          <option value="DEL_AUTH">Pending · Delete</option>
          <option value="MOD_AUTH">Pending · Activate/Deactivate</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select
          value={filterMaker}
          onChange={(e) => setFilterMaker(e.target.value)}
          className={selectClass}
        >
          <option value="">All makers</option>
          {makerOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={filterCheckerMode}
          onChange={(e) => setFilterCheckerMode(e.target.value)}
          className={selectClass}
        >
          <option value="">All checker modes</option>
          <option value="ANY">Any checker</option>
          <option value="ASSIGNED_PARALLEL">Assigned Parallel</option>
          <option value="ASSIGNED_SEQUENTIAL">Assigned Sequential</option>
        </select>

        {(search ||
          filterEntity ||
          filterAction ||
          filterStatus ||
          filterMaker ||
          filterCheckerMode) && (
          <button
            onClick={() => {
              setSearch("");
              setFilterEntity("");
              setFilterAction("");
              setFilterStatus("");
              setFilterMaker("");
              setFilterCheckerMode("");
            }}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
          <AlertCircle size={14} />{" "}
          {error instanceof Error ? error.message : "Failed to load pending requests"}
          <button
            onClick={() => void pendingQuery.refetch()}
            className="ml-auto text-xs font-bold underline"
          >
            Retry
          </button>
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
