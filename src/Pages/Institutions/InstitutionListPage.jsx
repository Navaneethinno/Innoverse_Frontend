import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { AlertCircle, Eye, History, Plus, Search, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { Skeleton } from "@/Components/UI/skeleton";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { InstitutionAuditModal } from "@/Components/Institutions/InstitutionAuditModal";
import {
  useHasInstitutionAction,
  useInstitutionAuthMutation,
  useInstitutionDeauthMutation,
  useInstitutionDeleteAuthMutation,
  useInstitutionDeleteMutation,
  useInstitutionsQuery,
} from "@/Hooks/Institutions/institutionHooks";
import { cn } from "@/Utils/Lib/cn";
import { notifications } from "@/Utils/Lib/notifications";

const glass = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--glass-shadow)",
};

// Tab -> auth_status filter. There is no separate "pending add"/"pending
// edit" endpoint in the Postman collection — /institution/profile/list
// returns all records regardless of status, and the 5 tabs are all
// client-side filters over that single response.
//
// A real /institution/profile/audit response (confirmed live) showed
// auth_status: "EDIT_WAIT_AUTH" for a pending-edit record, and a real list
// row showed status "AUTHORIZED" for an approved one — NOT the "ACTIVE" /
// "EDIT_AUTH" values this page originally guessed (copied from a different
// part of this codebase's maker-checker convention without checking this
// endpoint specifically). Each tab now matches BOTH the originally-guessed
// value and the confirmed-live one, since "NEW_WAIT_AUTH"/"DEL_WAIT_AUTH"
// (the presumed siblings of the one confirmed value) remain unverified.
const TAB_STATUS_ALIASES = {
  ACTIVE: ["ACTIVE", "AUTHORIZED"],
  NEW_AUTH: ["NEW_AUTH", "NEW_WAIT_AUTH"],
  EDIT_AUTH: ["EDIT_AUTH", "EDIT_WAIT_AUTH"],
  INACTIVE: ["INACTIVE", "DEACTIVATED"],
};
const TABS = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "NEW_AUTH", label: "Pending Add" },
  { value: "EDIT_AUTH", label: "Pending Edit" },
  { value: "INACTIVE", label: "Inactive" },
];

function institutionId(inst) {
  return inst?.id ?? inst?.inst_id ?? inst?.institution_id;
}

export function InstitutionListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [action, setAction] = useState(null);
  const [description, setDescription] = useState("");
  const [auditInstitution, setAuditInstitution] = useState(null);
  const canCreateInstitution = useHasInstitutionAction("Add");

  const institutionsQuery = useInstitutionsQuery({ page: 1, limit: 100 });
  const authMutation = useInstitutionAuthMutation();
  const deauthMutation = useInstitutionDeauthMutation();
  const deleteMutation = useInstitutionDeleteMutation();
  const deleteAuthMutation = useInstitutionDeleteAuthMutation();

  const institutions = useMemo(() => institutionsQuery.data ?? [], [institutionsQuery.data]);

  const filtered = useMemo(
    () =>
      institutions.filter((inst) => {
        const q = search.trim().toLowerCase();
        const matchSearch =
          !q ||
          String(inst.name ?? "").toLowerCase().includes(q) ||
          String(inst.code ?? "").toLowerCase().includes(q);
        const status = String(inst.auth_status ?? inst.status ?? "").toUpperCase();
        const matchTab =
          activeTab === "all" || (TAB_STATUS_ALIASES[activeTab] ?? [activeTab]).includes(status);
        return matchSearch && matchTab;
      }),
    [institutions, search, activeTab],
  );

  const activeCount = institutions.filter((i) =>
    TAB_STATUS_ALIASES.ACTIVE.includes(String(i.auth_status ?? i.status ?? "").toUpperCase()),
  ).length;

  const runAction = async () => {
    if (!action) return;
    try {
      const id = institutionId(action.inst);
      if (action.type === "auth") await authMutation.mutateAsync({ id });
      if (action.type === "deauth") await deauthMutation.mutateAsync({ id, description });
      if (action.type === "delete") await deleteMutation.mutateAsync({ id });
      if (action.type === "deleteAuth") await deleteAuthMutation.mutateAsync({ id });
      notifications.success("Institution action completed");
      setAction(null);
      setDescription("");
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "Action failed");
    }
  };
  const openAudit = (inst) => setAuditInstitution(inst);
  const actionPending =
    authMutation.isPending ||
    deauthMutation.isPending ||
    deleteMutation.isPending ||
    deleteAuthMutation.isPending;

  return (
    <div className="pt-4 pb-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-1">
            Registry
          </p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
            Institutions
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">
            {institutions.length} registered · {activeCount} active
          </p>
        </div>
        {canCreateInstitution && (
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/institutions/create")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-200/50"
            style={{ background: "#2266EE" }}
          >
            <Plus size={14} />
            <span className="hidden sm:inline">New Institution</span>
            <span className="sm:hidden">New</span>
          </motion.button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={13}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
            placeholder="Search institutions…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            style={{
              background: "var(--glass-bg)",
              backdropFilter: "blur(12px)",
              border: "1px solid var(--glass-border)",
            }}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                activeTab === value
                  ? "text-white border-transparent shadow-md shadow-blue-200/50"
                  : "text-slate-500 hover:text-blue-600 hover:border-blue-200",
              )}
              style={
                activeTab === value
                  ? { background: "#2266EE", border: "none" }
                  : {
                      background: "var(--glass-bg)",
                      backdropFilter: "blur(12px)",
                      borderColor: "var(--glass-border)",
                    }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {institutionsQuery.error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
          <AlertCircle size={14} /> {institutionsQuery.error.message}
          <button
            onClick={() => void institutionsQuery.refetch()}
            className="ml-auto text-xs font-bold underline"
          >
            Retry
          </button>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden"
        style={glass}
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100/80">
              {["Code", "Name", "Type", "Status", "Actions"].map((h) => (
                <th
                  key={h}
                  className="text-center px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {institutionsQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-5 py-3.5">
                      <Skeleton className="h-4 w-20 mx-auto" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <p className="text-sm font-bold text-slate-600">No institutions found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Adjust your search or filter criteria
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((inst, i) => {
                const id = institutionId(inst);
                const status = String(inst.auth_status ?? inst.status ?? "").toUpperCase();
                return (
                  <motion.tr
                    key={id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-slate-50 hover:bg-white/60 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-xs font-mono font-bold text-slate-700 text-center">
                      {inst.code ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-slate-800 text-center">
                      {inst.name ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 text-center">
                      {inst.type ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          title="View"
                          onClick={() => navigate(`/institutions/${id}`)}
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          title="Audit"
                          onClick={() => void openAudit(inst)}
                          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                        >
                          <History size={15} />
                        </button>
                        <button
                          title="Authorize"
                          onClick={() => setAction({ type: "auth", inst })}
                          className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
                        >
                          <ShieldCheck size={15} />
                        </button>
                        <button
                          title="Deauthorize"
                          onClick={() => setAction({ type: "deauth", inst })}
                          className="rounded-lg p-2 text-amber-600 hover:bg-amber-50"
                        >
                          <ShieldOff size={15} />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => setAction({ type: "delete", inst })}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </motion.div>

      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-slate-800 mb-3">Confirm institution action</h2>
            <p className="text-sm text-slate-600">
              {action.type} institution <strong>{action.inst?.name ?? action.inst?.code}</strong>?
            </p>
            {action.type === "deauth" && (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Reason (required)"
                className="mt-4 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm"
              />
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setAction(null);
                  setDescription("");
                }}
                className="rounded-xl px-4 py-2 text-sm text-slate-600"
              >
                Cancel
              </button>
              <button
                disabled={actionPending || (action.type === "deauth" && !description.trim())}
                onClick={() => void runAction()}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {actionPending ? "Working..." : "Confirm"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {auditInstitution && (
        <InstitutionAuditModal
          institution={auditInstitution}
          institutionId={institutionId(auditInstitution)}
          onClose={() => setAuditInstitution(null)}
        />
      )}
    </div>
  );
}
