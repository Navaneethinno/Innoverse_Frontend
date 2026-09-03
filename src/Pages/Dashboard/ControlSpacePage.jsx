import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, CheckCircle, Clock, FileText, Shield, Zap } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../Utils/Lib/utils";
import { useAuth } from "../../Hooks/useAuth";
import { LoadingState } from "../../Components/Common/LoadingState";
import { ErrorState } from "../../Components/Common/ErrorState";
import { usePendingRequestsQuery } from "@/Hooks/MakerChecker/makerCheckerHooks";
import { useInstitutionsQuery } from "@/Hooks/Institutions/institutionHooks";
const tile = "rounded-2xl p-5 border overflow-hidden relative";
const glass = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--glass-shadow)",
};
// Maps raw backend entity_type values to human-readable display names.
// institution-kyc and user-kyc are internal-only adapter keys — they are
// merged into their parent logical entities (Institution / User).
const ENTITY_LABEL = {
  INSTITUTION: "Institution",
  Institution: "Institution",
  // KYC internal adapters → shown as parent logical entity
  INSTITUTION_KYC: "Institution",
  Institution_KYC: "Institution",
  InstitutionKYC: "Institution",
  USER: "User",
  User: "User",
  // KYC internal adapters → shown as parent logical entity
  USER_KYC: "User",
  User_KYC: "User",
  UserKYC: "User",
  PROFILE: "Profile",
  Profile: "Profile",
  APPLICATION: "Application",
  Application: "Application",
  INSTITUTION_APPLICATION: "Institution Application",
  INSTITUTION_APPLICATION_MAP: "Institution Application",
  Institution_Application: "Institution Application",
  InstitutionApplication: "Institution Application",
  MODULE: "Module",
  Module: "Module",
  MENU: "Menu",
  Menu: "Menu",
  MENU_ACTION: "Menu Action",
  Menu_Action: "Menu Action",
  MenuAction: "Menu Action",
};
function entityLabel(raw) {
  return ENTITY_LABEL[raw] ?? raw;
}
// auth_status values: finalized (NEW_AUTH/EDIT_AUTH/DEL_AUTH/MOD_AUTH/APPROVED/REJECTED)
// plus ADD_AUTH which the backend still returns for some entity types (e.g. INSTITUTION_APPLICATION_MAP)
const LIFECYCLE_CONFIG = {
  NEW_AUTH: {
    label: "Pending · Add",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
  },
  ADD_AUTH: {
    label: "Pending · Add",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
  },
  EDIT_AUTH: {
    label: "Pending · Edit",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
  },
  DEL_AUTH: {
    label: "Pending · Delete",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
  },
  MOD_AUTH: {
    label: "Pending · Activate/Deactivate",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
  },
  APPROVED: {
    label: "Approved",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  REJECTED: { label: "Rejected", dot: "bg-red-500", pill: "bg-red-50 text-red-700 border-red-200" },
};
function LifecycleBadge({ authStatus }) {
  const cfg = LIFECYCLE_CONFIG[authStatus] ?? {
    label: authStatus,
    dot: "bg-slate-400",
    pill: "bg-slate-50 text-slate-500 border-slate-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shrink-0",
        cfg.pill,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
// Returns the best navigation target for a pending request.
// KYC internal adapter rows (INSTITUTION_KYC / USER_KYC) route to the
// parent institution detail page — they are part of the logical entity.
function resolveRoute(req) {
  const t = req.entity_type;
  const label = ENTITY_LABEL[t];
  if (label === "Institution") {
    // Both INSTITUTION and INSTITUTION_KYC rows navigate to the institution detail
    return req.entity_id != null ? `/institutions/${req.entity_id}` : null;
  }
  if (label === "Institution Application") {
    // entity_id is null for new ADD requests; fall back to institution_id in after_data
    const instId = req.entity_id ?? req.after_data?.institution_id;
    return instId != null ? `/institutions/${instId}` : null;
  }
  if (label === "Module" || label === "Menu" || label === "Menu Action") {
    return "/menus";
  }
  // Users, Profiles, Applications — list pages only
  return null;
}
// Request Breakdown groups — institution-kyc and user-kyc are internal-only
// and must NOT appear as separate frontend categories.
const BREAKDOWN_GROUPS = [
  {
    label: "Institutions",
    keys: ["INSTITUTION", "Institution", "INSTITUTION_KYC", "Institution_KYC", "InstitutionKYC"],
  },
  { label: "Users", keys: ["USER", "User", "USER_KYC", "User_KYC", "UserKYC"] },
  { label: "Profiles", keys: ["PROFILE", "Profile"] },
  { label: "Applications", keys: ["APPLICATION", "Application"] },
  {
    label: "Institution Applications",
    keys: [
      "INSTITUTION_APPLICATION",
      "INSTITUTION_APPLICATION_MAP",
      "Institution_Application",
      "InstitutionApplication",
    ],
  },
  { label: "Modules", keys: ["MODULE", "Module"] },
  { label: "Menus", keys: ["MENU", "Menu"] },
  { label: "Menu Actions", keys: ["MENU_ACTION", "Menu_Action", "MenuAction"] },
];
function StatCard({ label, value, sub, gradient, icon: Icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(tile, "flex flex-col gap-4")}
      style={glass}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <div
          className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md shrink-0",
            gradient,
          )}
        >
          <Icon size={15} strokeWidth={2} />
        </div>
      </div>
      <div>
        <p className="text-4xl font-black text-slate-800 tracking-tight leading-none">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-1.5 font-medium">{sub}</p>}
      </div>
    </motion.div>
  );
}
const ACTION_COLORS = {
  ADD: { bg: "bg-emerald-50", text: "text-emerald-700" },
  EDIT: { bg: "bg-blue-50", text: "text-blue-700" },
  DELETE: { bg: "bg-red-50", text: "text-red-700" },
  ACTIVATE: { bg: "bg-teal-50", text: "text-teal-700" },
  DEACTIVATE: { bg: "bg-orange-50", text: "text-orange-700" },
};
function approvalLabel(req) {
  if (req.checker_mode === "ASSIGNED_SEQUENTIAL" && req.sequence_no != null) {
    return `Step ${req.sequence_no} · ${req.approval_count}/${req.required_checker_count} approvals`;
  }
  return `${req.approval_count}/${req.required_checker_count} approvals`;
}
export function ControlSpacePage() {
  const navigate = useNavigate();
  const currentUser = useAuth((s) => s.user);
  const institutionsQuery = useInstitutionsQuery();
  const institutions = institutionsQuery.data ?? [];
  const iL = institutionsQuery.isLoading;
  const iE = institutionsQuery.error;
  const pendingQuery = usePendingRequestsQuery();
  const allPending = pendingQuery.data ?? [];
  const pendingLoading = pendingQuery.isLoading;
  const stats = useMemo(() => {
    // InstitutionOut has both `status` and `status_id`.
    // An institution is active when status === "ACTIVE" (case-insensitive).
    const active = institutions.filter((i) => (i.status ?? "").toUpperCase() === "ACTIVE").length;
    const myRequests = currentUser
      ? allPending.filter((r) => String(r.maker?.id) === String(currentUser.id)).length
      : 0;
    return {
      total: institutions.length,
      active,
      pendingRequests: allPending.length,
      myRequests,
    };
  }, [institutions, allPending, currentUser]);
  // Merge KYC internal adapter counts into their parent entity groups
  const breakdown = useMemo(
    () =>
      BREAKDOWN_GROUPS.map(({ label, keys }) => ({
        label,
        count: allPending.filter((r) => keys.includes(r.entity_type)).length,
      })),
    [allPending],
  );
  const recentPending = allPending.slice(0, 5);
  if (iL)
    return (
      <div className="pt-6">
        <LoadingState lines={4} />
      </div>
    );
  if (iE)
    return (
      <div className="pt-6">
        <ErrorState
          title="Dashboard unavailable"
          description={iE instanceof Error ? iE.message : "Failed to load institutions"}
          onRetry={() => void institutionsQuery.refetch()}
        />
      </div>
    );
  return (
    <div className="pt-4 pb-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-end justify-between mb-6"
      >
        <div>
          <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-1">
            Control Space
          </p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
            Good morning, {currentUser?.username ?? "Admin"}
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">
            Here's what's happening across your workspace.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/pending")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-200/50"
          style={{ background: "linear-gradient(135deg, #2266EE 0%, #26FFFF 100%)" }}
        >
          <Zap size={14} />
          Pending Approvals
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6 sm:col-span-3">
          <StatCard
            label="Total Institutions"
            value={stats.total}
            sub="Registered on platform"
            gradient="bg-gradient-to-br from-[#2266EE] to-[#26FFFF]"
            icon={Building2}
            delay={0.05}
          />
        </div>
        <div className="col-span-6 sm:col-span-3">
          <StatCard
            label="Active Institutions"
            value={stats.active}
            sub="Fully operational"
            gradient="bg-gradient-to-br from-[#6EDFC4] to-[#3BBFA0]"
            icon={CheckCircle}
            delay={0.1}
          />
        </div>
        <div className="col-span-6 sm:col-span-3">
          <StatCard
            label="Pending Requests"
            value={stats.pendingRequests}
            sub="Awaiting authorization"
            gradient="bg-gradient-to-br from-[#FFB3A0] to-[#FF8C6B]"
            icon={Clock}
            delay={0.15}
          />
        </div>
        <div className="col-span-6 sm:col-span-3">
          <StatCard
            label="My Requests"
            value={stats.myRequests}
            sub="Requests you submitted"
            gradient="bg-gradient-to-br from-[#FFCB6B] to-[#F59E0B]"
            icon={FileText}
            delay={0.2}
          />
        </div>

        {/* Recent pending requests */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={cn(tile, "col-span-12 lg:col-span-8")}
          style={glass}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">
              Recent Pending Requests
            </h2>
            <button
              onClick={() => navigate("/pending")}
              className="flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-700 transition-colors"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          {pendingLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl animate-pulse bg-slate-100" />
              ))}
            </div>
          ) : recentPending.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <CheckCircle size={24} className="text-emerald-400" />
              <p className="text-sm font-bold text-slate-500">All caught up</p>
              <p className="text-xs text-slate-400">No pending requests</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPending.map((req, i) => {
                const after = req.after_data ?? {};
                const before = req.before_data ?? {};
                // KYC internal adapter rows are displayed as their parent logical entity.
                // Name resolution: prefer after_data/before_data fields, fall back to entity_id.
                const label = entityLabel(req.entity_type);
                const name = String(
                  after.name ??
                    after.username ??
                    after.code ??
                    before.name ??
                    before.username ??
                    before.code ??
                    req.entity_id ??
                    "—",
                );
                const colors = ACTION_COLORS[req.action] ?? {
                  bg: "bg-slate-50",
                  text: "text-slate-600",
                };
                const route = resolveRoute(req);
                return (
                  <motion.div
                    key={req.request_id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-colors",
                      route ? "cursor-pointer hover:bg-white/60" : "cursor-default",
                    )}
                    onClick={() => {
                      if (route) navigate(route);
                    }}
                  >
                    <span
                      className={cn(
                        "text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0",
                        colors.bg,
                        colors.text,
                      )}
                    >
                      {req.action}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">
                        {name}
                        <span className="font-normal text-slate-400 ml-1">· {label}</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        By {req.maker?.name ?? "—"} · {approvalLabel(req)}
                      </p>
                    </div>
                    <LifecycleBadge authStatus={req.auth_status} />
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Request Breakdown — institution-kyc/user-kyc counts merged into Institution/User */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={cn(tile, "col-span-12 lg:col-span-4 flex flex-col justify-between")}
          style={glass}
        >
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2266EE] to-[#26FFFF] flex items-center justify-center shadow-md shadow-blue-200/50">
                <Shield size={14} className="text-white" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Request Breakdown</h2>
            </div>
            <div className="space-y-2">
              {breakdown.map(({ label, count }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">{label}</span>
                  <span
                    className={cn(
                      "text-xs font-bold",
                      count > 0 ? "text-slate-700" : "text-slate-300",
                    )}
                  >
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => navigate("/institutions/create")}
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-blue-600 border border-blue-200/60 hover:bg-white/60 transition-colors"
          >
            + New Institution
          </button>
        </motion.div>
      </div>
    </div>
  );
}
