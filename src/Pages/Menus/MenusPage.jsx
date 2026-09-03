import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, AlertCircle, Layers } from "lucide-react";
import { useAuth } from "../../Hooks/useAuth";
import { PendingTable } from "@/Components/MakerChecker/PendingTable";
import { MakerCheckerConfig } from "@/Components/MakerChecker/MakerCheckerConfig";
import { LifecycleMutationDialog } from "@/Components/MakerChecker/LifecycleMutationDialog";
import { AuditTimeline } from "@/Components/MakerChecker/AuditTimeline";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { Skeleton } from "../../Components/UI/skeleton";
import { notifications } from "../../Utils/Lib/notifications";
import { cn } from "../../Utils/Lib/utils";
import {
  useModulesQuery,
  useMenusQuery,
  useMenuActionsQuery,
  usePendingMenuQuery,
  useMenuAuditQuery,
  useMenuContinueRejectedMutation,
  useMenuCreateMutation,
  useMenuDecisionMutation,
  useMenuLifecycleMutation,
  useMenuUpdateMutation,
} from "@/Hooks/Menus/menuHooks";
import { useUsersQuery } from "@/Hooks/Users/userHooks";
const glass = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "0 4px 24px rgba(108,127,255,0.08), 0 1px 3px rgba(108,127,255,0.04)",
};
export function MenusPage() {
  const currentUser = useAuth((s) => s.user);
  const { data: users = [] } = useUsersQuery();
  const [subTab, setSubTab] = useState("modules");
  const [viewMode, setViewMode] = useState("list");
  const modulesQuery = useModulesQuery(subTab === "modules" && viewMode === "list");
  const menusQuery = useMenusQuery(subTab === "menus" && viewMode === "list");
  const menuActionsQuery = useMenuActionsQuery(subTab === "menu-actions" && viewMode === "list");
  const pendingQuery = usePendingMenuQuery(subTab, viewMode === "pending");
  const modules = modulesQuery.data ?? [];
  const menus = menusQuery.data ?? [];
  const menuActions = menuActionsQuery.data ?? [];
  const pending = pendingQuery.data ?? [];
  const activeQuery =
    viewMode === "pending"
      ? pendingQuery
      : subTab === "modules"
        ? modulesQuery
        : subTab === "menus"
          ? menusQuery
          : menuActionsQuery;
  const isLoading = activeQuery.isLoading;
  const error = activeQuery.error;
  const createMutation = useMenuCreateMutation();
  const updateMutation = useMenuUpdateMutation();
  const lifecycleMutation = useMenuLifecycleMutation();
  const decisionMutation = useMenuDecisionMutation();
  const continueMutation = useMenuContinueRejectedMutation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [checkerConfig, setCheckerConfig] = useState({
    checker_mode: "ANY",
    checker_assignments: [],
    required_checker_count: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [actionName, setActionName] = useState("");
  const [actionRemark, setActionRemark] = useState("");
  const [continueTarget, setContinueTarget] = useState(null);
  const [continueMode, setContinueMode] = useState("edit");
  const [continueJson, setContinueJson] = useState("");
  const auditQuery = useMenuAuditQuery(subTab, selectedItem?.id, selectedItem !== null);
  const auditEntries = auditQuery.data ?? [];
  const auditLoading = auditQuery.isLoading;
  useEffect(() => {
    setForm({});
    setShowForm(false);
  }, [subTab, viewMode]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code || !form.name) {
      notifications.error("Code and name are required");
      return;
    }
    setSubmitting(true);
    try {
      if (subTab === "modules") {
        if (!form.application_id) {
          notifications.error("Application ID is required");
          setSubmitting(false);
          return;
        }
        await createMutation.mutateAsync({
          entity: "modules",
          payload: {
            application_id: Number(form.application_id),
            code: form.code,
            name: form.name,
            remark: form.remark || null,
            ...checkerConfig,
          },
        });
      } else if (subTab === "menus") {
        if (!form.module_id) {
          notifications.error("Module ID is required");
          setSubmitting(false);
          return;
        }
        await createMutation.mutateAsync({
          entity: "menus",
          payload: {
            module_id: Number(form.module_id),
            code: form.code,
            name: form.name,
            remark: form.remark || null,
            ...checkerConfig,
          },
        });
      } else {
        if (!form.menu_id) {
          notifications.error("Menu ID is required");
          setSubmitting(false);
          return;
        }
        await createMutation.mutateAsync({
          entity: "menu-actions",
          payload: {
            menu_id: Number(form.menu_id),
            code: form.code,
            name: form.name,
            remark: form.remark || null,
            ...checkerConfig,
          },
        });
      }
      notifications.success("Request submitted for approval");
      setShowForm(false);
      setForm({});
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };
  const handleApprove = async (request_id) => {
    try {
      await decisionMutation.mutateAsync({ requestId: request_id, decision: "approve" });
      notifications.success("Request approved");
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to approve");
    }
  };
  const handleReject = async (request_id) => {
    try {
      await decisionMutation.mutateAsync({ requestId: request_id, decision: "reject" });
      notifications.success("Request rejected");
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to reject");
    }
  };
  const openAction = async (item, action) => {
    setSelectedItem(item);
    setSelectedAction(action);
    setActionName(item.name);
    setActionRemark("");
  };
  const submitAction = async () => {
    if (!selectedItem || !selectedAction) return;
    const payload = { remark: actionRemark || null };
    try {
      if (selectedAction === "edit") {
        await updateMutation.mutateAsync({
          entity: subTab,
          id: selectedItem.id,
          payload: { name: actionName || undefined, remark: actionRemark || null },
        });
      } else {
        await lifecycleMutation.mutateAsync({
          entity: subTab,
          id: selectedItem.id,
          action: selectedAction,
          payload,
        });
      }
      notifications.success("Request submitted for approval");
      setSelectedItem(null);
      setSelectedAction(null);
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to submit request");
    }
  };
  const submitContinue = async () => {
    if (!continueTarget) return;
    let after_data;
    if (continueMode === "edit") {
      try {
        after_data = continueJson ? JSON.parse(continueJson) : undefined;
      } catch {
        notifications.error("Rejected ADD continuation must be valid JSON");
        return;
      }
    }
    try {
      if (continueMode === "edit") {
        await continueMutation.mutateAsync({
          entity: subTab,
          requestId: String(continueTarget.request_id),
          payload: { after_data, remark: actionRemark || null },
          mode: continueMode,
        });
      } else {
        await continueMutation.mutateAsync({
          entity: subTab,
          requestId: String(continueTarget.request_id),
          payload: { remark: actionRemark || null },
          mode: continueMode,
        });
      }
      notifications.success("Rejected ADD continued");
      setContinueTarget(null);
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to continue rejected ADD");
    }
  };
  const items = subTab === "modules" ? modules : subTab === "menus" ? menus : menuActions;
  const subTabLabel = subTab === "modules" ? "Module" : subTab === "menus" ? "Menu" : "Menu Action";
  return (
    <div className="pt-4 pb-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between mb-6"
      >
        <div>
          <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">
            System
          </p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
            Menus & Modules
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">Manage application structure</p>
        </div>
        {viewMode === "list" && (
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-200/50"
            style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
          >
            <Plus size={14} /> New {subTabLabel}
          </motion.button>
        )}
      </motion.div>

      {/* Sub-tabs */}
      <div
        className="flex items-center gap-1 mb-4 p-1 rounded-xl w-fit"
        style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.85)" }}
      >
        {["modules", "menus", "menu-actions"].map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize",
              subTab === t ? "text-white shadow-md" : "text-slate-500 hover:text-indigo-600",
            )}
            style={subTab === t ? { background: "linear-gradient(135deg, #6C7FFF, #B39DFA)" } : {}}
          >
            {t.replace("-", " ")}
          </button>
        ))}
      </div>

      {/* View mode toggle */}
      <div
        className="flex items-center gap-1 mb-5 p-1 rounded-xl w-fit"
        style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.85)" }}
      >
        {["list", "pending"].map((m) => (
          <button
            key={m}
            onClick={() => setViewMode(m)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize",
              viewMode === m ? "text-white shadow-md" : "text-slate-500 hover:text-indigo-600",
            )}
            style={
              viewMode === m ? { background: "linear-gradient(135deg, #6C7FFF, #B39DFA)" } : {}
            }
          >
            {m === "list" ? "All" : "Pending Approvals"}
          </button>
        ))}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && viewMode === "list" && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl p-6 mb-6"
            style={glass}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800">New {subTabLabel}</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subTab === "modules" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Application ID
                  </label>
                  <input
                    value={form.application_id ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, application_id: e.target.value }))}
                    type="number"
                    placeholder="1"
                    className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    style={{
                      background: "rgba(255,255,255,0.80)",
                      border: "1px solid rgba(108,127,255,0.15)",
                    }}
                  />
                </div>
              )}
              {subTab === "menus" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Module ID
                  </label>
                  <input
                    value={form.module_id ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, module_id: e.target.value }))}
                    type="number"
                    placeholder="1"
                    className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    style={{
                      background: "rgba(255,255,255,0.80)",
                      border: "1px solid rgba(108,127,255,0.15)",
                    }}
                  />
                </div>
              )}
              {subTab === "menu-actions" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Menu ID
                  </label>
                  <input
                    value={form.menu_id ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, menu_id: e.target.value }))}
                    type="number"
                    placeholder="1"
                    className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    style={{
                      background: "rgba(255,255,255,0.80)",
                      border: "1px solid rgba(108,127,255,0.15)",
                    }}
                  />
                </div>
              )}
              {["code", "name", "remark"].map((key) => (
                <div key={key}>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    {key}
                  </label>
                  <input
                    value={form[key] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={key === "remark" ? "Optional" : key.toUpperCase()}
                    className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    style={{
                      background: "rgba(255,255,255,0.80)",
                      border: "1px solid rgba(108,127,255,0.15)",
                    }}
                  />
                </div>
              ))}
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-200/50 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
                >
                  {submitting ? "Submitting…" : "Submit for Approval"}
                </motion.button>
              </div>
              <div className="sm:col-span-2">
                <MakerCheckerConfig
                  value={checkerConfig}
                  onChange={setCheckerConfig}
                  candidates={users.map((u) => ({
                    id: u.id,
                    name: u.username,
                    institution_id: u.institution?.id,
                  }))}
                  makerInstitutionId={currentUser?.institution?.id}
                  currentMakerId={currentUser?.id}
                />
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
          <AlertCircle size={14} /> {error instanceof Error ? error.message : "Failed to load"}
          <button
            onClick={() => void activeQuery.refetch()}
            className="ml-auto text-xs font-bold underline"
          >
            Retry
          </button>
        </div>
      )}

      {viewMode === "pending" ? (
        <PendingTable
          requests={pending}
          isLoading={isLoading}
          currentUserId={currentUser?.id}
          onApprove={handleApprove}
          onReject={handleReject}
          entityLabel={subTabLabel.toLowerCase()}
        />
      ) : (
        <div className="rounded-2xl overflow-hidden" style={glass}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100/80">
                {["Code", "Name", "Status", "Actions"].map((h) => (
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
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <Skeleton className="h-4 w-24 mx-auto" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                        <Layers size={20} className="text-indigo-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-600">
                        No {subTabLabel.toLowerCase()}s found
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, i) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-slate-50 hover:bg-white/60 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-xs font-bold text-slate-700 font-mono text-center">
                      {item.code}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-slate-800 text-center">
                      {item.name}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={item.auth_status ?? item.status ?? ""} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => void openAction(item, "edit")}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200"
                      >
                        Manage
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedItem && selectedAction && (
        <LifecycleMutationDialog
          open
          title={`${subTabLabel} ${selectedAction}`}
          onClose={() => {
            setSelectedItem(null);
            setSelectedAction(null);
          }}
          onSubmit={() => void submitAction()}
          checkerConfig={{
            checker_mode: "ANY",
            checker_assignments: [],
            required_checker_count: 1,
          }}
          setCheckerConfig={() => {}}
          candidates={users.map((u) => ({
            id: u.id,
            name: u.username,
            institution_id: u.institution?.id,
          }))}
          makerInstitutionId={currentUser?.institution?.id}
          currentMakerId={currentUser?.id}
          showCheckerConfig={false}
        >
          <div className="space-y-3">
            {selectedAction === "edit" && (
              <input
                value={actionName}
                onChange={(e) => setActionName(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
            )}
            <textarea
              value={actionRemark}
              onChange={(e) => setActionRemark(e.target.value)}
              placeholder="Remark"
              className="w-full rounded-xl border px-3 py-2 text-sm min-h-24"
            />
            <div className="rounded-2xl border border-slate-100 p-4">
              <h3 className="text-xs font-bold mb-3">Lifecycle</h3>
              <AuditTimeline
                entries={auditEntries}
                isLoading={auditLoading}
                onContinueRejectedAdd={(entry) => {
                  setContinueTarget(entry);
                  setContinueMode("edit");
                  setContinueJson(JSON.stringify(entry.after_data ?? {}, null, 2));
                }}
              />
            </div>
          </div>
        </LifecycleMutationDialog>
      )}

      {continueTarget && (
        <LifecycleMutationDialog
          open
          title="Continue rejected ADD"
          onClose={() => setContinueTarget(null)}
          onSubmit={() => void submitContinue()}
          checkerConfig={{
            checker_mode: "ANY",
            checker_assignments: [],
            required_checker_count: 1,
          }}
          setCheckerConfig={() => {}}
          candidates={users.map((u) => ({
            id: u.id,
            name: u.username,
            institution_id: u.institution?.id,
          }))}
          makerInstitutionId={currentUser?.institution?.id}
          currentMakerId={currentUser?.id}
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setContinueMode("edit")}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border"
              >
                Edit continuation
              </button>
              <button
                type="button"
                onClick={() => setContinueMode("delete")}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border"
              >
                Delete continuation
              </button>
            </div>
            {continueMode === "edit" && (
              <textarea
                value={continueJson}
                onChange={(e) => setContinueJson(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm min-h-40 font-mono"
              />
            )}
            <textarea
              value={actionRemark}
              onChange={(e) => setActionRemark(e.target.value)}
              placeholder="Remark"
              className="w-full rounded-xl border px-3 py-2 text-sm min-h-24"
            />
          </div>
        </LifecycleMutationDialog>
      )}
    </div>
  );
}
